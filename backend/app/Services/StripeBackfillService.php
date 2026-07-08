<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use Stripe\StripeObject;
use Stripe\Stripe;
use Stripe\StripeClient;
use Throwable;

class StripeBackfillService
{
    private ?StripeClient $stripe = null;

    public function __construct()
    {
        $secret = config('services.stripe.secret');
        if (is_string($secret) && trim($secret) !== '') {
            $this->stripe = new StripeClient($secret);
        }
    }

    /**
     * Backfill Stripe payment references (pi_, ch_) for a payment that has provider_invoice_id
     * but is missing provider_payment_intent_id or provider_charge_id.
     *
     * @return array{success: bool, reason?: string}
     */
    public function backfillStripePaymentReferences(Payment $payment): array
    {
        if ($payment->gateway !== 'stripe') {
            return ['success' => false, 'reason' => 'Payment is not a Stripe payment.'];
        }

        if ($payment->status !== 'paid' && $payment->status !== 'partially_refunded' && $payment->status !== 'refunded') {
            return ['success' => false, 'reason' => 'Payment is not in a paid/refunded status.'];
        }

        // Already has both pi_ and ch_
        if ($payment->provider_payment_intent_id && str_starts_with($payment->provider_payment_intent_id, 'pi_') && $payment->provider_charge_id && str_starts_with($payment->provider_charge_id, 'ch_')) {
            return ['success' => true, 'reason' => 'Payment already has complete Stripe references.'];
        }

        if ($this->stripe === null) {
            return ['success' => false, 'reason' => 'Stripe secret key is not configured.'];
        }

        // Strategy 1: Backfill from invoice ID
        if ($payment->provider_invoice_id && str_starts_with($payment->provider_invoice_id, 'in_')) {
            return $this->backfillFromInvoice($payment);
        }

        // Strategy 2: Backfill from payment intent ID if available but no charge ID
        if ($payment->provider_payment_intent_id && str_starts_with($payment->provider_payment_intent_id, 'pi_')) {
            return $this->backfillChargeFromPaymentIntent($payment);
        }

        // Strategy 3: Backfill from subscription/checkout session
        if ($payment->gateway_subscription_id && str_starts_with($payment->gateway_subscription_id, 'sub_')) {
            return $this->backfillFromSubscription($payment);
        }

        return ['success' => false, 'reason' => 'No invoice ID, payment intent, or subscription ID available to backfill from.'];
    }

    private function backfillFromInvoice(Payment $payment): array
    {
        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            // Try to retrieve the invoice
            $invoice = \Stripe\Invoice::retrieve($payment->provider_invoice_id);

            if (! $invoice) {
                return ['success' => false, 'reason' => 'Invoice not found in Stripe.'];
            }

            $updates = [];

            // Get PaymentIntent from the invoice first, then from invoice_payments.
            $paymentIntent = $this->stripeId($invoice->payment_intent ?? null, 'pi_');
            $charge = $this->stripeId($invoice->charge ?? null, 'ch_');

            if (! $paymentIntent && $this->stripe) {
                [$paymentIntent, $charge] = $this->referencesFromInvoicePayments($payment->provider_invoice_id);
            }

            if ($paymentIntent) {
                $updates['provider_payment_intent_id'] = $paymentIntent;
                $updates['provider_payment_id'] = $paymentIntent;
            }

            if ($charge) {
                $updates['provider_charge_id'] = $charge;
            } elseif ($paymentIntent) {
                $latestCharge = $this->latestChargeFromPaymentIntent($paymentIntent, $payment->id);
                if ($latestCharge) {
                    $updates['provider_charge_id'] = $latestCharge;
                }
            }

            if (empty($updates)) {
                return ['success' => false, 'reason' => 'Could not extract payment_intent or charge from invoice.'];
            }

            $payment->update($updates);

            Log::info('Backfilled Stripe references from invoice.', [
                'payment_id' => $payment->id,
                'updates' => $updates,
            ]);

            return ['success' => true];
        } catch (Throwable $e) {
            Log::error('Failed to backfill from invoice.', [
                'payment_id' => $payment->id,
                'invoice_id' => $payment->provider_invoice_id,
                'exception' => $e->getMessage(),
            ]);

            return ['success' => false, 'reason' => 'Stripe API error: ' . $e->getMessage()];
        }
    }

    private function backfillChargeFromPaymentIntent(Payment $payment): array
    {
        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            $pi = \Stripe\PaymentIntent::retrieve($payment->provider_payment_intent_id);

            if (! $pi) {
                return ['success' => false, 'reason' => 'PaymentIntent not found in Stripe.'];
            }

            $latestCharge = $this->stripeId($pi->latest_charge ?? null, 'ch_');
            if ($latestCharge) {
                $payment->update(['provider_charge_id' => $latestCharge]);

                Log::info('Backfilled charge ID from PaymentIntent.', [
                    'payment_id' => $payment->id,
                    'payment_intent' => $payment->provider_payment_intent_id,
                    'charge_id' => $latestCharge,
                ]);

                return ['success' => true];
            }

            return ['success' => false, 'reason' => 'PaymentIntent has no latest_charge.'];
        } catch (Throwable $e) {
            Log::error('Failed to backfill charge from PaymentIntent.', [
                'payment_id' => $payment->id,
                'payment_intent' => $payment->provider_payment_intent_id,
                'exception' => $e->getMessage(),
            ]);

            return ['success' => false, 'reason' => 'Stripe API error: ' . $e->getMessage()];
        }
    }

    private function backfillFromSubscription(Payment $payment): array
    {
        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            // Retrieve the latest invoice for the subscription
            $invoices = \Stripe\Invoice::all([
                'subscription' => $payment->gateway_subscription_id,
                'limit' => 3,
                'status' => 'paid',
            ]);

            foreach ($invoices->data as $invoice) {
                $invoiceId = $invoice->id ?? null;
                $paymentIntent = $this->stripeId($invoice->payment_intent ?? null, 'pi_');
                $charge = $this->stripeId($invoice->charge ?? null, 'ch_');

                if ($paymentIntent && $invoiceId) {
                    $updates = [];
                    $updates['provider_invoice_id'] = $invoiceId;
                    $updates['provider_payment_intent_id'] = $paymentIntent;
                    $updates['provider_payment_id'] = $paymentIntent;

                    if ($charge) {
                        $updates['provider_charge_id'] = $charge;
                    } else {
                        $latestCharge = $this->latestChargeFromPaymentIntent($paymentIntent, $payment->id);
                        if ($latestCharge) {
                            $updates['provider_charge_id'] = $latestCharge;
                        }
                    }

                    $payment->update($updates);

                    Log::info('Backfilled Stripe references from subscription invoices.', [
                        'payment_id' => $payment->id,
                        'subscription_id' => $payment->gateway_subscription_id,
                        'updates' => $updates,
                    ]);

                    return ['success' => true];
                }
            }

            return ['success' => false, 'reason' => 'No paid invoices found for this subscription.'];
        } catch (Throwable $e) {
            Log::error('Failed to backfill from subscription.', [
                'payment_id' => $payment->id,
                'subscription_id' => $payment->gateway_subscription_id,
                'exception' => $e->getMessage(),
            ]);

            return ['success' => false, 'reason' => 'Stripe API error: ' . $e->getMessage()];
        }
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    private function referencesFromInvoicePayments(string $invoiceId): array
    {
        try {
            $invoicePayments = $this->stripe?->invoicePayments->all([
                'invoice' => $invoiceId,
                'limit' => 10,
            ]);

            foreach (($invoicePayments->data ?? []) as $invoicePayment) {
                $paymentIntent = $this->stripeId($this->nestedValue($invoicePayment, ['payment', 'payment_intent']), 'pi_');
                $charge = $this->stripeId($this->nestedValue($invoicePayment, ['payment', 'charge']), 'ch_');

                if ($paymentIntent) {
                    return [$paymentIntent, $charge];
                }
            }
        } catch (Throwable $e) {
            Log::warning('Could not list Stripe invoice payments for backfill.', [
                'invoice_id' => $invoiceId,
                'exception' => $e->getMessage(),
            ]);
        }

        return [null, null];
    }

    private function latestChargeFromPaymentIntent(string $paymentIntentId, ?int $paymentId = null): ?string
    {
        try {
            $pi = \Stripe\PaymentIntent::retrieve($paymentIntentId);

            return $this->stripeId($pi->latest_charge ?? null, 'ch_');
        } catch (Throwable $e) {
            Log::warning('Could not retrieve PaymentIntent for charge backfill.', [
                'payment_id' => $paymentId,
                'payment_intent' => $paymentIntentId,
                'exception' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function stripeId(mixed $value, string $prefix): ?string
    {
        if ($value instanceof StripeObject) {
            $value = $value->id ?? null;
        } elseif (is_array($value)) {
            $value = $value['id'] ?? null;
        }

        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return str_starts_with($value, $prefix) ? $value : null;
    }

    private function nestedValue(StripeObject|array|null $object, array $path): mixed
    {
        $value = $object;

        foreach ($path as $segment) {
            if ($value instanceof StripeObject) {
                $value = $value->{$segment} ?? null;
            } elseif (is_array($value)) {
                $value = $value[$segment] ?? null;
            } else {
                return null;
            }
        }

        return $value;
    }
}
