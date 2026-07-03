<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Log;
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

            // Get payment intent from invoice
            $paymentIntent = $invoice->payment_intent ?? null;
            // If invoice doesn't expose payment_intent (newer Stripe API), try invoice_payments endpoint
            if (empty($paymentIntent) && $this->stripe) {
                try {
                    $resp = $this->stripe->request('get', "/v1/invoices/{$payment->provider_invoice_id}/invoice_payments", ['limit' => 3]);
                    $paymentsList = $resp->data ?? ($resp['data'] ?? null);
                    if (! empty($paymentsList) && isset($paymentsList[0]->payment)) {
                        $first = $paymentsList[0];
                        $paymentNested = $first->payment ?? ($first['payment'] ?? null);
                        $paymentIntent = $paymentNested->payment_intent ?? ($paymentNested['payment_intent'] ?? null);
                        // charge may also be nested
                        $charge = $paymentNested->charge ?? ($paymentNested['charge'] ?? null);
                    }
                } catch (Throwable $e) {
                    // ignore and continue with whatever invoice provided
                }
            }
            if ($paymentIntent && str_starts_with($paymentIntent, 'pi_')) {
                $updates['provider_payment_intent_id'] = $paymentIntent;
                $updates['provider_payment_id'] = $paymentIntent;
            }

            // Get charge from invoice
            $charge = $invoice->charge ?? ($charge ?? null);
            if ($charge && str_starts_with($charge, 'ch_')) {
                $updates['provider_charge_id'] = $charge;
            } elseif ($paymentIntent && str_starts_with($paymentIntent, 'pi_')) {
                // Try to get charge from payment intent
                try {
                    $pi = \Stripe\PaymentIntent::retrieve($paymentIntent);
                    if ($pi->latest_charge ?? null) {
                        $latestCharge = $pi->latest_charge;
                        if (is_string($latestCharge) && str_starts_with($latestCharge, 'ch_')) {
                            $updates['provider_charge_id'] = $latestCharge;
                        }
                    }
                } catch (Throwable $e) {
                    Log::warning('Could not retrieve PaymentIntent for charge backfill.', [
                        'payment_id' => $payment->id,
                        'payment_intent' => $paymentIntent,
                        'exception' => $e->getMessage(),
                    ]);
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

            $latestCharge = $pi->latest_charge ?? null;
            if ($latestCharge && is_string($latestCharge) && str_starts_with($latestCharge, 'ch_')) {
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
                $paymentIntent = $invoice->payment_intent ?? null;
                $charge = $invoice->charge ?? null;

                if ($paymentIntent && str_starts_with($paymentIntent, 'pi_') && $invoiceId) {
                    $updates = [];
                    $updates['provider_invoice_id'] = $invoiceId;
                    $updates['provider_payment_intent_id'] = $paymentIntent;
                    $updates['provider_payment_id'] = $paymentIntent;

                    if ($charge && str_starts_with($charge, 'ch_')) {
                        $updates['provider_charge_id'] = $charge;
                    } else {
                        // Try to get charge from payment intent
                        try {
                            $pi = \Stripe\PaymentIntent::retrieve($paymentIntent);
                            if ($pi->latest_charge ?? null) {
                                $latestCharge = $pi->latest_charge;
                                if (is_string($latestCharge) && str_starts_with($latestCharge, 'ch_')) {
                                    $updates['provider_charge_id'] = $latestCharge;
                                }
                            }
                        } catch (Throwable) {
                            // Ignore
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
}