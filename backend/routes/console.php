<?php

use App\Models\Payment;
use App\Models\Subscription;
use App\Models\WebhookEvent;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('payments:backfill-stripe-intents {--apply : Persist updates. Without this flag the command only reports changes.} {--payment-id= : Backfill one known payment id.} {--payment-intent= : Stripe PaymentIntent id for manual backfill.} {--invoice= : Stripe invoice id for manual backfill.}', function () {
    $apply = (bool) $this->option('apply');
    $manualPaymentId = $this->option('payment-id');
    $manualPaymentIntentId = $this->option('payment-intent');
    $manualInvoiceId = $this->option('invoice');

    $idOf = function ($value) use (&$idOf): ?string {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_array($value) && array_key_exists('id', $value)) {
            return $idOf($value['id']);
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return null;
    };

    $updatePayment = function (Payment $payment, ?string $paymentIntentId, ?string $invoiceId) use ($apply): bool {
        $updates = [];

        if ($paymentIntentId) {
            if (! str_starts_with($paymentIntentId, 'pi_')) {
                $this->warn("Skipping payment {$payment->id}: {$paymentIntentId} is not a PaymentIntent id.");

                return false;
            }

            if ($payment->provider_payment_intent_id !== $paymentIntentId) {
                $updates['provider_payment_intent_id'] = $paymentIntentId;
            }

            if ($payment->provider_payment_id !== $paymentIntentId) {
                $updates['provider_payment_id'] = $paymentIntentId;
            }
        }

        if ($invoiceId) {
            if (! str_starts_with($invoiceId, 'in_')) {
                $this->warn("Skipping invoice update for payment {$payment->id}: {$invoiceId} is not an invoice id.");
            } elseif ($payment->provider_invoice_id !== $invoiceId) {
                $updates['provider_invoice_id'] = $invoiceId;
            }
        }

        if ($updates === []) {
            return false;
        }

        $prefix = $apply ? 'Updating' : 'Would update';
        $this->line($prefix.' payment '.$payment->id.' with '.json_encode($updates, JSON_UNESCAPED_SLASHES));

        if ($apply) {
            $payment->update($updates);
        }

        return true;
    };

    if ($manualPaymentId) {
        if (! ctype_digit((string) $manualPaymentId)) {
            $this->error('--payment-id must be numeric.');

            return 1;
        }

        $payment = Payment::query()->find((int) $manualPaymentId);

        if (! $payment) {
            $this->error("Payment {$manualPaymentId} was not found.");

            return 1;
        }

        $changed = $updatePayment($payment, $manualPaymentIntentId, $manualInvoiceId);
        $this->info($changed ? ($apply ? 'Manual backfill applied.' : 'Manual backfill dry-run complete.') : 'No changes needed.');

        return 0;
    }

    $checkoutContextsByInvoice = [];

    WebhookEvent::query()
        ->where('gateway', 'stripe')
        ->where('event_type', 'checkout.session.completed')
        ->orderBy('id')
        ->each(function (WebhookEvent $event) use (&$checkoutContextsByInvoice, $idOf): void {
            $object = data_get($event->payload, 'data.object', []);
            $invoiceId = $idOf(data_get($object, 'invoice'));

            if (! $invoiceId) {
                return;
            }

            $checkoutContextsByInvoice[$invoiceId] = [
                'payment_id' => data_get($object, 'metadata.payment_id'),
                'reference' => data_get($object, 'metadata.reference') ?: data_get($object, 'client_reference_id'),
                'session_id' => data_get($object, 'id'),
                'subscription_id' => $idOf(data_get($object, 'subscription')),
                'user_id' => data_get($object, 'metadata.user_id'),
                'plan_id' => data_get($object, 'metadata.plan_id'),
            ];
        });

    $findPayment = function (array $object, ?string $invoiceId, ?string $paymentIntentId) use ($checkoutContextsByInvoice, $idOf): ?Payment {
        $context = $invoiceId && isset($checkoutContextsByInvoice[$invoiceId])
            ? $checkoutContextsByInvoice[$invoiceId]
            : [];

        $metadataPaymentId = data_get($object, 'metadata.payment_id')
            ?: data_get($object, 'invoice.metadata.payment_id')
            ?: ($context['payment_id'] ?? null);

        if ($metadataPaymentId && ctype_digit((string) $metadataPaymentId)) {
            $payment = Payment::query()->find((int) $metadataPaymentId);

            if ($payment) {
                return $payment;
            }
        }

        $reference = data_get($object, 'metadata.reference')
            ?: data_get($object, 'invoice.metadata.reference')
            ?: data_get($object, 'client_reference_id')
            ?: ($context['reference'] ?? null);

        if ($reference) {
            $payment = Payment::query()->where('reference', $reference)->first();

            if ($payment) {
                return $payment;
            }
        }

        $sessionId = $idOf(data_get($object, 'checkout_session')) ?: ($context['session_id'] ?? null);
        if ($sessionId) {
            $payment = Payment::query()->where('provider_session_id', $sessionId)->first();

            if ($payment) {
                return $payment;
            }
        }

        if ($invoiceId) {
            $payment = Payment::query()
                ->where(function ($query) use ($invoiceId): void {
                    $query->where('provider_invoice_id', $invoiceId)
                        ->orWhere('reference', $invoiceId);
                })
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        if ($paymentIntentId) {
            $payment = Payment::query()
                ->where(function ($query) use ($paymentIntentId): void {
                    $query->where('provider_payment_intent_id', $paymentIntentId)
                        ->orWhere('provider_payment_id', $paymentIntentId);
                })
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        $stripeSubscriptionId = $idOf(data_get($object, 'subscription'))
            ?: $idOf(data_get($object, 'invoice.subscription'))
            ?: ($context['subscription_id'] ?? null);

        if ($stripeSubscriptionId) {
            $subscription = Subscription::query()
                ->where(function ($query) use ($stripeSubscriptionId): void {
                    $query->where('stripe_subscription_id', $stripeSubscriptionId)
                        ->orWhere('gateway_subscription_id', $stripeSubscriptionId);
                })
                ->first();

            if ($subscription?->user_id && $subscription->plan_id) {
                return Payment::query()
                    ->where('subscription_id', $subscription->id)
                    ->where('user_id', $subscription->user_id)
                    ->where('plan_id', $subscription->plan_id)
                    ->where('gateway', 'stripe')
                    ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_PAID])
                    ->whereNull('provider_invoice_id')
                    ->latest()
                    ->first();
            }
        }

        return null;
    };

    $changed = 0;
    $scanned = 0;

    WebhookEvent::query()
        ->where('gateway', 'stripe')
        ->whereIn('event_type', [
            'checkout.session.completed',
            'invoice.payment_succeeded',
            'invoice.paid',
            'invoice_payment.paid',
        ])
        ->orderBy('id')
        ->each(function (WebhookEvent $event) use (&$changed, &$scanned, $idOf, $findPayment, $updatePayment): void {
            $scanned++;
            $object = data_get($event->payload, 'data.object', []);

            if (! is_array($object)) {
                return;
            }

            $objectType = data_get($object, 'object');
            $invoiceId = $objectType === 'invoice'
                ? $idOf(data_get($object, 'id'))
                : $idOf(data_get($object, 'invoice'));
            $paymentIntentId = $idOf(data_get($object, 'payment.payment_intent'))
                ?: $idOf(data_get($object, 'payment_intent'));

            if (! $invoiceId && ! $paymentIntentId) {
                return;
            }

            $payment = $findPayment($object, $invoiceId, $paymentIntentId);

            if (! $payment) {
                $this->warn("No payment matched webhook {$event->provider_event_id} ({$event->event_type}).");

                return;
            }

            if ($updatePayment($payment, $paymentIntentId, $invoiceId)) {
                $changed++;
            }
        });

    $mode = $apply ? 'applied' : 'dry-run';
    $this->info("Stripe PaymentIntent backfill {$mode}: scanned {$scanned} events; {$changed} payment rows matched changes.");

    if (! $apply) {
        $this->comment('Run again with --apply to persist these updates.');
    }

    return 0;
})->purpose('Backfill Stripe PaymentIntent and invoice ids on payments from saved webhook payloads');

Artisan::command('payments:backfill-stripe-checkout {--apply : Persist updates. Without this flag the command only reports changes.} {--payment-id= : Payment id to backfill.} {--reference= : Payment reference to backfill.} {--session= : Stripe Checkout Session id.} {--subscription= : Stripe subscription id.} {--invoice= : Stripe invoice id.} {--amount= : Payment amount in major currency units.} {--currency= : ISO currency code.}', function () {
    $apply = (bool) $this->option('apply');
    $paymentId = $this->option('payment-id');
    $reference = $this->option('reference');
    $sessionId = $this->option('session');
    $stripeSubscriptionId = $this->option('subscription');
    $invoiceId = $this->option('invoice');
    $amount = $this->option('amount');
    $currency = $this->option('currency');

    if (! $paymentId && ! $reference && ! $sessionId) {
        $this->error('Provide --payment-id, --reference, or --session.');

        return 1;
    }

    $payment = null;

    if ($paymentId) {
        if (! ctype_digit((string) $paymentId)) {
            $this->error('--payment-id must be numeric.');

            return 1;
        }

        $payment = Payment::query()->find((int) $paymentId);
    }

    if (! $payment && $reference) {
        $payment = Payment::query()->where('reference', $reference)->first();
    }

    if (! $payment && $sessionId) {
        $payment = Payment::query()->where('provider_session_id', $sessionId)->first();
    }

    if (! $payment) {
        $this->error('No matching payment was found.');

        return 1;
    }

    $updates = [
        'status' => Payment::STATUS_PAID,
        'paid_at' => now(),
        'failure_reason' => null,
        'raw_provider_status' => json_encode([
            'event_type' => 'manual.checkout.backfill',
            'id' => $sessionId,
            'status' => 'complete',
            'session_status' => 'complete',
            'payment_status' => 'paid',
            'subscription' => $stripeSubscriptionId,
            'invoice' => $invoiceId,
            'payment_intent' => null,
            'charge' => null,
            'mode' => 'subscription',
        ], JSON_UNESCAPED_SLASHES),
    ];

    if ($sessionId) {
        $updates['provider_session_id'] = $sessionId;
    }

    if ($stripeSubscriptionId) {
        if (! str_starts_with($stripeSubscriptionId, 'sub_')) {
            $this->error('--subscription must be a Stripe sub_ id.');

            return 1;
        }

        $updates['gateway_subscription_id'] = $stripeSubscriptionId;
    }

    if ($invoiceId) {
        if (! str_starts_with($invoiceId, 'in_')) {
            $this->error('--invoice must be a Stripe in_ id.');

            return 1;
        }

        $updates['provider_invoice_id'] = $invoiceId;
    }

    if ($amount !== null && $amount !== '') {
        if (! is_numeric($amount) || (float) $amount <= 0) {
            $this->error('--amount must be a positive number.');

            return 1;
        }

        $updates['amount'] = (float) $amount;
    }

    if ($currency) {
        $updates['currency'] = strtoupper((string) $currency);
    }

    if (str_starts_with((string) $payment->provider_payment_id, 'sub_')) {
        $updates['provider_payment_id'] = null;
    }

    $paymentColumns = Schema::getColumnListing('payments');
    $updates = array_intersect_key($updates, array_fill_keys($paymentColumns, true));

    $this->line(($apply ? 'Updating' : 'Would update').' payment '.$payment->id.' with '.json_encode($updates, JSON_UNESCAPED_SLASHES));

    if (! $apply) {
        $this->comment('Run again with --apply to persist these updates.');

        return 0;
    }

    $payment->update($updates);

    if ($stripeSubscriptionId) {
        $subscription = $payment->subscription
            ?? Subscription::query()
                ->where(function ($query) use ($stripeSubscriptionId): void {
                    $query->where('stripe_subscription_id', $stripeSubscriptionId)
                        ->orWhere('gateway_subscription_id', $stripeSubscriptionId);
                })
                ->first()
            ?? new Subscription();

        $subscription->fill([
            'user_id' => $payment->user_id,
            'plan_id' => $payment->plan_id,
            'gateway' => 'stripe',
            'gateway_subscription_id' => $stripeSubscriptionId,
            'stripe_subscription_id' => $stripeSubscriptionId,
            'status' => 'active',
            'starts_at' => $subscription->starts_at ?: now(),
        ])->save();

        if (! $payment->subscription_id) {
            $payment->update(['subscription_id' => $subscription->id]);
        }
    }

    $this->info('Checkout payment backfill applied.');

    return 0;
})->purpose('Backfill a paid Stripe Checkout subscription payment from a known session event');
