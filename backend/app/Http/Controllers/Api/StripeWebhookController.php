<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\WebhookEvent;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Stripe;
use Stripe\StripeObject;
use Stripe\Subscription as StripeSubscriptionResource;
use Stripe\Webhook;
use App\Services\StripeBackfillService;
use Throwable;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
    private ?array $paymentColumns = null;

    private const REPROCESSABLE_EVENT_TYPES = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.paid',
        'invoice_payment.paid',
        'invoice.payment_failed',
        'charge.refunded',
        'refund.created',
        'refund.updated',
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature', '');
        $webhookSecret = config('services.stripe.webhook_secret');

        if (! is_string($webhookSecret) || trim($webhookSecret) === '') {
            Log::critical('Stripe webhook secret is not configured.');

            return response()->json(['message' => 'Webhook secret is not configured.'], 500);
        }

        try {
            $event = Webhook::constructEvent($payload, $signature, $webhookSecret);
        } catch (UnexpectedValueException|SignatureVerificationException $exception) {
            Log::warning('Invalid Stripe webhook payload or signature.', [
                'exception' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'Invalid Stripe webhook signature.'], 400);
        }

        $payloadArray = json_decode($payload, true) ?: null;

        try {
            $status = DB::transaction(function () use ($event, $payloadArray): string {
                $webhookEvent = WebhookEvent::query()
                    ->where('gateway', 'stripe')
                    ->where('provider_event_id', $event->id)
                    ->lockForUpdate()
                    ->first();

                $alreadyProcessed = (bool) $webhookEvent?->processed_at;

                if ($alreadyProcessed && ! in_array($event->type, self::REPROCESSABLE_EVENT_TYPES, true)) {
                    return 'duplicate';
                }

                if ($alreadyProcessed) {
                    Log::info('Reprocessing duplicate Stripe webhook idempotently.', [
                        'event_id' => $event->id,
                        'event_type' => $event->type,
                    ]);
                }

                if (! $webhookEvent) {
                    $webhookEvent = WebhookEvent::create([
                        'gateway' => 'stripe',
                        'provider_event_id' => $event->id,
                        'event_type' => $event->type,
                        'payload' => $payloadArray,
                    ]);

                    $webhookEvent = WebhookEvent::query()
                        ->whereKey($webhookEvent->id)
                        ->lockForUpdate()
                        ->firstOrFail();
                }

                try {
                    $this->handleStripeEvent($event->type, $event->data->object);

                    $webhookEvent->update([
                        'processed_at' => now(),
                        'failed_at' => null,
                        'failure_reason' => null,
                    ]);
                } catch (Throwable $exception) {
                    $webhookEvent->update([
                        'failed_at' => now(),
                        'failure_reason' => $this->safeFailureReason($exception),
                    ]);

                    throw $exception;
                }

                return $alreadyProcessed ? 'reprocessed' : 'processed';
            });
        } catch (Throwable $exception) {
            Log::error('Stripe webhook processing failed.', array_merge([
                'event_id' => $event->id,
                'event_type' => $event->type,
                'exception_message' => $exception->getMessage(),
                'exception' => $exception,
            ], $this->webhookFailureContext($event->data->object ?? null)));

            return response()->json(['message' => 'Webhook processing failed.'], 500);
        }

        return response()->json(['status' => $status]);
    }

    private function handleStripeEvent(string $eventType, StripeObject $object): void
    {
        match ($eventType) {
            'checkout.session.completed' => $this->handleCheckoutSessionCompleted($object),
            'checkout.session.expired' => $this->handleCheckoutSessionExpired($object),
            'invoice.payment_succeeded' => $this->handleInvoicePaymentSucceeded($object),
            'invoice.paid' => $this->handleInvoicePaid($object),
            'invoice_payment.paid' => $this->handleInvoicePaymentPaid($object),
            'invoice.payment_failed' => $this->handleInvoicePaymentFailed($object),
            'customer.subscription.created' => $this->handleCustomerSubscriptionCreated($object),
            'customer.subscription.updated' => $this->handleCustomerSubscriptionUpdated($object),
            'customer.subscription.deleted' => $this->handleCustomerSubscriptionDeleted($object),
            'payment_intent.payment_failed' => $this->handlePaymentIntentFailed($object),
            'charge.refunded' => $this->handleChargeRefunded($object),
            'refund.created' => $this->handleRefundCreated($object),
            'refund.updated' => $this->handleRefundUpdated($object),
            default => null,
        };
    }

    private function handleCheckoutSessionCompleted(StripeObject $session): void
    {
        $sessionId = $this->stringValue($session, 'id');
        $sessionStatus = $this->stringValue($session, 'status');
        $paymentStatus = $this->stringValue($session, 'payment_status');
        $metadataPaymentId = $this->metadataValue($session, 'payment_id');
        $clientReference = $this->stringValue($session, 'client_reference_id');
        $metadataReference = $this->metadataValue($session, 'reference');
        $stripeSubscriptionId = $this->stringValue($session, 'subscription');
        $paymentIntentId = $this->stringValue($session, 'payment_intent');
        $invoiceId = $this->stringValue($session, 'invoice');

        Log::info('Stripe checkout.session.completed received.', [
            'session_id' => $sessionId,
            'payment_id' => $metadataPaymentId,
            'client_reference_id' => $clientReference,
            'metadata_reference' => $metadataReference,
            'session_status' => $sessionStatus,
            'payment_status' => $paymentStatus,
            'subscription' => $stripeSubscriptionId,
            'invoice_id' => $invoiceId,
            'payment_intent_id' => $paymentIntentId,
        ]);

        if ($sessionStatus !== 'complete' || $paymentStatus !== 'paid') {
            Log::info('Stripe checkout.session.completed ignored because the session is not complete and paid.', [
                'session_id' => $sessionId,
                'session_status' => $sessionStatus,
                'payment_status' => $paymentStatus,
            ]);

            return;
        }

        [$payment, $matchedBy] = $this->findPaymentForCheckoutSession(
            $metadataPaymentId,
            $clientReference,
            $metadataReference,
            $sessionId,
        );

        if (! $payment) {
            Log::warning('Payment not found for Stripe checkout.session.completed.', [
                'session_id' => $sessionId,
                'payment_id' => $metadataPaymentId,
                'client_reference_id' => $clientReference,
                'metadata_reference' => $metadataReference,
            ]);

            return;
        }

        Log::info('Payment matched for Stripe checkout.session.completed.', [
            'payment_id' => $payment->id,
            'payment_reference' => $payment->reference,
            'matched_by' => $matchedBy,
            'session_id' => $sessionId,
        ]);

        if ($payment->status === Payment::STATUS_PAID) {
            Log::info('Payment is already paid for Stripe checkout.session.completed.', [
                'payment_id' => $payment->id,
                'payment_reference' => $payment->reference,
                'session_id' => $sessionId,
            ]);

            $this->updatePaymentStripeIdentifiers($payment, [
                'provider_session_id' => $sessionId,
                'gateway_subscription_id' => $stripeSubscriptionId,
                'provider_payment_intent_id' => $paymentIntentId,
                'provider_invoice_id' => $invoiceId,
            ]);

            $this->activateSubscriptionForPayment($payment, $session);

            // Attempt to backfill missing Stripe payment references (pi_/ch_) if possible
            try {
                $backfillService = app(StripeBackfillService::class);
                $result = $backfillService->backfillStripePaymentReferences($payment->fresh());

                Log::info('Stripe backfill attempted after checkout.session.completed (already paid).', [
                    'payment_id' => $payment->id,
                    'invoice_id' => $payment->provider_invoice_id,
                    'result' => $result,
                ]);
            } catch (Throwable $e) {
                Log::warning('Stripe backfill failed after checkout.session.completed (already paid).', [
                    'payment_id' => $payment->id,
                    'exception' => $e->getMessage(),
                ]);
            }

            return;
        }

        $updateData = [
            'status' => Payment::STATUS_PAID,
            'provider_session_id' => $sessionId ?? $payment->provider_session_id,
            'raw_provider_status' => $this->rawProviderStatus($session, 'checkout.session.completed'),
            'failure_reason' => null,
            'paid_at' => now(),
        ];

        if ($stripeSubscriptionId && str_starts_with($stripeSubscriptionId, 'sub_')) {
            $updateData['gateway_subscription_id'] = $stripeSubscriptionId;
        }

        $amountTotal = $this->floatValue($session, 'amount_total');
        if ($amountTotal !== null && $amountTotal > 0) {
            $updateData['amount'] = $amountTotal / 100;
        }

        $sessionCurrency = $this->stringValue($session, 'currency');
        if ($sessionCurrency) {
            $updateData['currency'] = strtoupper($sessionCurrency);
        }

        // For subscription mode, payment_intent is NULL on the session.
        // Fetch it from the subscription's latest invoice.
        if (! $paymentIntentId && $stripeSubscriptionId && str_starts_with($stripeSubscriptionId, 'sub_')) {
            try {
                $fetchedInvoice = $this->fetchLatestInvoiceForSubscription($stripeSubscriptionId);
                if ($fetchedInvoice) {
                    $fetchedPi = $this->stringValue($fetchedInvoice, 'payment_intent');
                    if ($fetchedPi && str_starts_with($fetchedPi, 'pi_')) {
                        $paymentIntentId = $fetchedPi;
                        $updateData['provider_payment_intent_id'] = $fetchedPi;
                        $updateData['provider_payment_id'] = $fetchedPi;
                        Log::info('Backfilled payment_intent from subscription invoice in checkout.session.completed.', [
                            'payment_id' => $payment->id,
                            'payment_intent' => $fetchedPi,
                            'subscription_id' => $stripeSubscriptionId,
                            'invoice_id' => $this->stringValue($fetchedInvoice, 'id'),
                        ]);
                    }
                    $fetchedCharge = $this->stringValue($fetchedInvoice, 'charge');
                    if ($fetchedCharge && str_starts_with($fetchedCharge, 'ch_')) {
                        $updateData['provider_charge_id'] = $fetchedCharge;
                    }
                    $fetchedInvoiceId = $this->stringValue($fetchedInvoice, 'id');
                    if ($fetchedInvoiceId && str_starts_with($fetchedInvoiceId, 'in_') && ! $invoiceId) {
                        $invoiceId = $fetchedInvoiceId;
                        $updateData['provider_invoice_id'] = $fetchedInvoiceId;
                    }
                }
            } catch (Throwable $e) {
                Log::warning('Failed to fetch invoice for subscription payment_intent backfill.', [
                    'payment_id' => $payment->id,
                    'subscription_id' => $stripeSubscriptionId,
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        // Store PaymentIntent ID (pi_...) as the refundable payment ID
        if ($paymentIntentId && str_starts_with($paymentIntentId, 'pi_')) {
            $updateData['provider_payment_intent_id'] = $paymentIntentId;
            $updateData['provider_payment_id'] = $paymentIntentId;
        }

        if ($invoiceId && str_starts_with($invoiceId, 'in_')) {
            $updateData['provider_invoice_id'] = $invoiceId;
        }

        if (! isset($updateData['provider_payment_id']) && str_starts_with((string) $payment->provider_payment_id, 'sub_')) {
            $updateData['provider_payment_id'] = null;
        }

        $this->updatePaymentSafely($payment, $updateData, 'checkout.session.completed');

        Log::info('Payment marked paid from Stripe checkout.session.completed.', [
            'payment_id' => $payment->id,
            'payment_reference' => $payment->reference,
            'provider_payment_intent_id' => $paymentIntentId,
            'provider_invoice_id' => $invoiceId,
            'provider_payment_id' => $payment->fresh()->provider_payment_id,
            'session_id' => $sessionId,
        ]);

        $this->activateSubscriptionForPayment($payment, $session);

        // Attempt to backfill missing Stripe payment references (pi_/ch_) now that invoice id may be saved
        try {
            $backfillService = app(StripeBackfillService::class);
            $result = $backfillService->backfillStripePaymentReferences($payment->fresh());

            Log::info('Stripe backfill attempted after checkout.session.completed.', [
                'payment_id' => $payment->id,
                'invoice_id' => $payment->provider_invoice_id,
                'result' => $result,
            ]);
        } catch (Throwable $e) {
            Log::warning('Stripe backfill failed after checkout.session.completed.', [
                'payment_id' => $payment->id,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    private function handleCheckoutSessionExpired(StripeObject $session): void
    {
        $payment = Payment::query()
            ->where('provider_session_id', $this->stringValue($session, 'id'))
            ->lockForUpdate()
            ->first();

        if (! $payment || $payment->status !== Payment::STATUS_PENDING) {
            return;
        }

        $payment->update([
            'status' => Payment::STATUS_EXPIRED,
            'provider_session_id' => $this->stringValue($session, 'id') ?? $payment->provider_session_id,
            'raw_provider_status' => $this->rawProviderStatus($session, 'checkout.session.expired'),
        ]);
    }

    private function handleInvoicePaymentSucceeded(StripeObject $invoice): void
    {
        $this->handlePaidInvoiceObject($invoice, 'invoice.payment_succeeded');
    }

    private function handleInvoicePaid(StripeObject $invoice): void
    {
        $this->handlePaidInvoiceObject($invoice, 'invoice.paid');
    }

    private function handleInvoicePaymentPaid(StripeObject $invoicePayment): void
    {
        $this->handlePaidInvoiceObject($invoicePayment, 'invoice_payment.paid');
    }

    private function handlePaidInvoiceObject(StripeObject $invoiceObject, string $eventType): void
    {
        $subscriptionId = $this->subscriptionIdFromPaidInvoiceObject($invoiceObject);
        $matchedPayment = $this->findPaymentForPaidInvoiceObject($invoiceObject, null);
        $subscription = $subscriptionId
            ? $this->findLocalSubscriptionByStripeSubscriptionId($subscriptionId)
            : null;

        if ($subscriptionId) {
            $stripeSubscription = $this->retrieveStripeSubscription($subscriptionId);

            if ($stripeSubscription) {
                $this->syncSubscriptionFromStripeObject($stripeSubscription, $subscription);
                $subscription = $this->findLocalSubscriptionByStripeSubscriptionId($subscriptionId) ?? $subscription;
            } elseif ($subscription) {
                $subscription->update(['status' => 'active']);
            }
        }

        if (! $subscription && $matchedPayment?->subscription_id) {
            $subscription = Subscription::query()
                ->whereKey($matchedPayment->subscription_id)
                ->lockForUpdate()
                ->first();
        }

        if ($subscription && ! $matchedPayment) {
            $matchedPayment = $this->findPaymentForPaidInvoiceObject($invoiceObject, $subscription);
        }

        if ($subscription || $matchedPayment) {
            $this->upsertInvoicePayment($invoiceObject, $subscription, $eventType, $matchedPayment);

            return;
        }

        Log::warning("Stripe {$eventType} could not find a local subscription or payment.", [
            'stripe_subscription_id' => $subscriptionId,
            'invoice_id' => $this->invoiceIdFromPaidInvoiceObject($invoiceObject),
            'payment_intent_id' => $this->paymentIntentIdFromPaidInvoiceObject($invoiceObject),
        ]);
    }

    private function handleInvoicePaymentFailed(StripeObject $invoice): void
    {
        $subscriptionId = $this->stringValue($invoice, 'subscription');
        if (! $subscriptionId) {
            return;
        }

        $subscription = $this->findLocalSubscriptionByStripeSubscriptionId($subscriptionId);
        $stripeSubscription = $this->retrieveStripeSubscription($subscriptionId);

        if ($stripeSubscription) {
            $this->syncSubscriptionFromStripeObject($stripeSubscription, $subscription);
            $subscription = $this->findLocalSubscriptionByStripeSubscriptionId($subscriptionId) ?? $subscription;
        }

        if ($subscription) {
            $subscription->update([
                'status' => 'past_due',
            ]);
        } else {
            Log::warning('Stripe invoice.payment_failed could not find a local subscription.', [
                'stripe_subscription_id' => $subscriptionId,
                'invoice_id' => $this->stringValue($invoice, 'id'),
            ]);
        }
    }

    private function handleCustomerSubscriptionCreated(StripeObject $stripeSubscription): void
    {
        $this->syncSubscriptionFromStripeObject($stripeSubscription);
    }

    private function handleCustomerSubscriptionUpdated(StripeObject $stripeSubscription): void
    {
        $this->syncSubscriptionFromStripeObject($stripeSubscription);
    }

    private function handleCustomerSubscriptionDeleted(StripeObject $stripeSubscription): void
    {
        $stripeSubscriptionId = $this->stringValue($stripeSubscription, 'id');
        if (! $stripeSubscriptionId) {
            return;
        }

        $subscription = $this->findLocalSubscriptionByStripeSubscriptionId($stripeSubscriptionId);

        if (! $subscription) {
            Log::warning('Stripe customer.subscription.deleted could not find a local subscription.', [
                'stripe_subscription_id' => $stripeSubscriptionId,
            ]);

            return;
        }

        $this->syncSubscriptionFromStripeObject($stripeSubscription, $subscription);

        [, $deletedPeriodEnd] = $this->getStripeSubscriptionPeriod($stripeSubscription);

        $subscription->refresh()->update([
            'status' => 'cancelled',
            'cancelled_at' => $this->stripeTimestampToDateTime($stripeSubscription->canceled_at ?? null) ?? now(),
            'ends_at' => $this->stripeTimestampToDateTime($stripeSubscription->ended_at ?? null)
                ?? $this->stripeTimestampToDateTime($deletedPeriodEnd)
                ?? now(),
        ]);

        Log::info('Stripe subscription deletion synced.', [
            'stripe_subscription_id' => $stripeSubscriptionId,
            'local_subscription_id' => $subscription->id,
        ]);
    }

    private function handlePaymentIntentFailed(StripeObject $paymentIntent): void
    {
        $reference = $this->metadataValue($paymentIntent, 'reference');

        if (! $reference) {
            return;
        }

        $payment = Payment::query()
            ->where('reference', $reference)
            ->lockForUpdate()
            ->first();

        if (! $payment || $payment->status !== Payment::STATUS_PENDING) {
            return;
        }

        $this->updatePaymentSafely($payment, [
            'status' => Payment::STATUS_FAILED,
            'provider_payment_id' => $this->stringValue($paymentIntent, 'id'),
            'provider_payment_intent_id' => $this->stringValue($paymentIntent, 'id'),
            'failure_reason' => $this->paymentIntentFailureMessage($paymentIntent),
            'raw_provider_status' => $this->rawProviderStatus($paymentIntent, 'payment_intent.payment_failed'),
        ], 'payment_intent.payment_failed');
    }

    private function handleChargeRefunded(StripeObject $refund): void
    {
        $refundId = $this->stringValue($refund, 'id');
        $paymentIntentId = $this->stringValue($refund, 'payment_intent');
        $chargeId = $this->stringValue($refund, 'charge');
        $amountRefunded = ($this->floatValue($refund, 'amount_refunded') ?? 0.0) / 100;
        $status = $this->stringValue($refund, 'status');

        Log::info('Stripe charge.refunded received.', [
            'refund_id' => $refundId,
            'payment_intent' => $paymentIntentId,
            'charge_id' => $chargeId,
            'amount_refunded' => $amountRefunded,
            'status' => $status,
        ]);

        // Find payment by payment intent or charge ID
        $payment = null;
        if ($paymentIntentId) {
            $payment = Payment::query()
                ->where('provider_payment_id', $paymentIntentId)
                ->orWhere('provider_payment_intent_id', $paymentIntentId)
                ->lockForUpdate()
                ->first();
        }

        if (! $payment && $chargeId) {
            $payment = Payment::query()
                ->where('provider_charge_id', $chargeId)
                ->lockForUpdate()
                ->first();
        }

        if (! $payment) {
            Log::warning('Stripe charge.refunded could not find a local payment.', [
                'refund_id' => $refundId,
                'payment_intent' => $paymentIntentId,
                'charge_id' => $chargeId,
            ]);

            return;
        }

        // Update payment refund status based on amount
        $totalRefunded = (float) $payment->refunded_amount + $amountRefunded;
        $isFullRefund = $totalRefunded >= (float) $payment->amount;

        $this->updatePaymentSafely($payment, [
            'refunded_amount' => $totalRefunded,
            'refund_status' => $isFullRefund ? 'refunded' : 'partially_refunded',
            'status' => $isFullRefund ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED,
        ], 'charge.refunded');

        // Track if this is a new refund or status change for notification
        $isNewRefund = false;
        $previousStatus = null;

        // Update or create refund record
        if ($refundId) {
            $existingRefund = \App\Models\Refund::query()
                ->where('provider_refund_id', $refundId)
                ->lockForUpdate()
                ->first();

            if ($existingRefund) {
                $previousStatus = $existingRefund->status;
                $existingRefund->update([
                    'status' => $status === 'succeeded' ? 'succeeded' : $status,
                    'raw_response' => json_decode(json_encode($refund), true),
                    'refunded_at' => $status === 'succeeded' ? now() : $existingRefund->refunded_at,
                ]);
            } else {
                $isNewRefund = true;
                \App\Models\Refund::create([
                    'payment_id' => $payment->id,
                    'user_id' => $payment->user_id,
                    'gateway' => 'stripe',
                    'provider_refund_id' => $refundId,
                    'provider_payment_id' => $paymentIntentId,
                    'amount' => $amountRefunded,
                    'currency' => $payment->currency,
                    'status' => $status === 'succeeded' ? 'succeeded' : ($status ?? 'pending'),
                    'raw_response' => json_decode(json_encode($refund), true),
                    'refunded_at' => $status === 'succeeded' ? now() : null,
                ]);
            }
        }

        Log::info('Payment refund status updated from charge.refunded webhook.', [
            'payment_id' => $payment->id,
            'refunded_amount' => $payment->fresh()->refunded_amount,
            'refund_status' => $payment->fresh()->refund_status,
        ]);

        // Send notification for completed refunds
        if ($status === 'succeeded' && $payment->user_id) {
            try {
                $notificationService = app(NotificationService::class);
                $notificationService->refundCompleted(
                    $payment->user_id,
                    $amountRefunded,
                    $payment->currency,
                    $payment->id,
                    $refundId ? 0 : 0, // We don't have local refund ID here
                );
            } catch (Throwable $e) {
                Log::warning('Failed to send refund completed notification from webhook.', [
                    'payment_id' => $payment->id,
                    'exception' => $e->getMessage(),
                ]);
            }
        }
    }

    private function handleRefundCreated(StripeObject $refund): void
    {
        $refundId = $this->stringValue($refund, 'id');
        $paymentIntentId = $this->stringValue($refund, 'payment_intent');
        $amount = ($this->floatValue($refund, 'amount') ?? 0.0) / 100;
        $status = $this->stringValue($refund, 'status');

        Log::info('Stripe refund.created received.', [
            'refund_id' => $refundId,
            'payment_intent' => $paymentIntentId,
            'amount' => $amount,
            'status' => $status,
        ]);

        if (! $paymentIntentId) {
            return;
        }

        $payment = Payment::query()
            ->where('provider_payment_id', $paymentIntentId)
            ->orWhere('provider_payment_intent_id', $paymentIntentId)
            ->lockForUpdate()
            ->first();

        if (! $payment) {
            Log::warning('Stripe refund.created could not find a local payment.', [
                'refund_id' => $refundId,
                'payment_intent' => $paymentIntentId,
            ]);

            return;
        }

        // Check if refund record already exists
        $existingRefund = \App\Models\Refund::query()
            ->where('provider_refund_id', $refundId)
            ->lockForUpdate()
            ->first();

        if (! $existingRefund) {
            \App\Models\Refund::create([
                'payment_id' => $payment->id,
                'user_id' => $payment->user_id,
                'gateway' => 'stripe',
                'provider_refund_id' => $refundId,
                'provider_payment_id' => $paymentIntentId,
                'amount' => $amount,
                'currency' => $payment->currency,
                'status' => $status === 'succeeded' ? 'succeeded' : ($status ?? 'pending'),
                'raw_response' => json_decode(json_encode($refund), true),
                'refunded_at' => $status === 'succeeded' ? now() : null,
            ]);
        }
    }

    private function handleRefundUpdated(StripeObject $refund): void
    {
        $refundId = $this->stringValue($refund, 'id');
        $status = $this->stringValue($refund, 'status');

        if (! $refundId) {
            return;
        }

        $existingRefund = \App\Models\Refund::query()
            ->where('provider_refund_id', $refundId)
            ->lockForUpdate()
            ->first();

        if (! $existingRefund) {
            Log::warning('Stripe refund.updated could not find a local refund record.', [
                'refund_id' => $refundId,
            ]);

            return;
        }

        $existingRefund->update([
            'status' => $status === 'succeeded' ? 'succeeded' : ($status ?? $existingRefund->status),
            'raw_response' => json_decode(json_encode($refund), true),
            'refunded_at' => $status === 'succeeded' ? now() : $existingRefund->refunded_at,
        ]);

        // Also update the payment status
        $payment = $existingRefund->payment;
        if ($payment) {
            $totalRefunded = (float) $payment->refunded_amount;
            $isFullRefund = $totalRefunded >= (float) $payment->amount;

            $this->updatePaymentSafely($payment, [
                'refund_status' => $isFullRefund ? 'refunded' : 'partially_refunded',
                'status' => $isFullRefund ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED,
            ], 'refund.updated');
        }
    }

    private function activateSubscriptionForPayment(Payment $payment, StripeObject $session): void
    {
        $stripeSubscriptionId = $this->stringValue($session, 'subscription');
        $customerId = $this->stringValue($session, 'customer');
        $metadata = $session->metadata ?? null;

        if (! $stripeSubscriptionId) {
            Log::warning('Cannot activate subscription: Stripe checkout session has no subscription id.', [
                'payment_id' => $payment->id,
                'payment_reference' => $payment->reference,
                'session_id' => $this->stringValue($session, 'id'),
            ]);

            return;
        }

        // Get user_id from metadata
        $userId = null;
        if ($metadata instanceof StripeObject) {
            $userId = $this->stringValue($metadata, 'user_id');
        } elseif (is_array($metadata)) {
            $userId = $metadata['user_id'] ?? null;
        }

        if (! $userId) {
            $userId = $payment->user_id;
        }

        if (! $userId) {
            Log::warning('Cannot activate subscription: no user_id found', [
                'payment_id' => $payment->id,
            ]);

            return;
        }

        $subscription = null;

        if ($payment->subscription_id) {
            $subscription = Subscription::query()
                ->whereKey($payment->subscription_id)
                ->lockForUpdate()
                ->first();
        }

        if (! $subscription) {
            $subscription = Subscription::query()
                ->where(function ($query) use ($stripeSubscriptionId): void {
                    $query->where('stripe_subscription_id', $stripeSubscriptionId)
                        ->orWhere('gateway_subscription_id', $stripeSubscriptionId);
                })
                ->lockForUpdate()
                ->first();
        }

        if (! $subscription) {
            $subscription = Subscription::firstOrNew(
                ['stripe_subscription_id' => $stripeSubscriptionId],
                ['user_id' => $userId, 'plan_id' => $payment->plan_id]
            );
        }

        $stripeSubscription = $this->retrieveStripeSubscription($stripeSubscriptionId);

        $subscription->fill([
            'user_id' => $userId,
            'plan_id' => $payment->plan_id ?: $subscription->plan_id,
        ]);

        if ($stripeSubscription) {
            $this->syncSubscriptionFromStripeObject($stripeSubscription, $subscription);
        } else {
            $subscription->fill([
                'stripe_customer_id' => $customerId,
                'gateway_subscription_id' => $stripeSubscriptionId,
                'stripe_subscription_id' => $stripeSubscriptionId,
                'gateway' => 'stripe',
                'status' => 'active',
                'starts_at' => $subscription->starts_at ?: now(),
            ])->save();

            Log::info('Subscription marked active from Stripe checkout.session.completed without period sync.', [
                'subscription_id' => $subscription->id,
                'payment_id' => $payment->id,
                'stripe_subscription_id' => $stripeSubscriptionId,
                'stripe_customer_id' => $customerId,
            ]);
        }

        if (! $payment->subscription_id) {
            $payment->update(['subscription_id' => $subscription->id]);
        }
    }

    /**
     * @return array{0: ?Payment, 1: ?string}
     */
    private function findPaymentForCheckoutSession(
        ?string $metadataPaymentId,
        ?string $clientReference,
        ?string $metadataReference,
        ?string $sessionId,
    ): array {
        if ($metadataReference) {
            $payment = Payment::query()
                ->where('reference', $metadataReference)
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return [$payment, 'metadata.reference'];
            }
        }

        if ($clientReference) {
            $payment = Payment::query()
                ->where('reference', $clientReference)
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return [$payment, 'client_reference_id'];
            }
        }

        if ($sessionId) {
            $payment = Payment::query()
                ->where('provider_session_id', $sessionId)
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return [$payment, 'provider_session_id'];
            }
        }

        if ($metadataPaymentId && ctype_digit($metadataPaymentId)) {
            $payment = Payment::query()
                ->whereKey($metadataPaymentId)
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return [$payment, 'metadata.payment_id'];
            }
        }

        return [null, null];
    }

    private function updatePaymentStripeIdentifiers(Payment $payment, array $identifiers): void
    {
        $updates = [];

        $sessionId = $identifiers['provider_session_id'] ?? null;
        if ($sessionId && ! $payment->provider_session_id) {
            $updates['provider_session_id'] = $sessionId;
        }

        $stripeSubscriptionId = $identifiers['gateway_subscription_id'] ?? null;
        if ($stripeSubscriptionId && str_starts_with($stripeSubscriptionId, 'sub_') && ! $payment->gateway_subscription_id) {
            $updates['gateway_subscription_id'] = $stripeSubscriptionId;
        }

        $paymentIntentId = $identifiers['provider_payment_intent_id'] ?? null;
        if ($paymentIntentId && str_starts_with($paymentIntentId, 'pi_')) {
            $updates['provider_payment_intent_id'] = $paymentIntentId;
            $updates['provider_payment_id'] = $paymentIntentId;
        }

        $invoiceId = $identifiers['provider_invoice_id'] ?? null;
        if ($invoiceId && str_starts_with($invoiceId, 'in_') && ! $payment->provider_invoice_id) {
            $updates['provider_invoice_id'] = $invoiceId;
        }

        if (! isset($updates['provider_payment_id']) && str_starts_with((string) $payment->provider_payment_id, 'sub_')) {
            $updates['provider_payment_id'] = null;
        }

        if ($updates !== []) {
            $this->updatePaymentSafely($payment, $updates, 'stripe.identifier.sync');
        }
    }

    private function updatePaymentSafely(Payment $payment, array $updates, string $context): void
    {
        $filteredUpdates = $this->filterPaymentColumns($updates, $context);

        if ($filteredUpdates === []) {
            return;
        }

        $payment->update($filteredUpdates);
    }

    private function filterPaymentColumns(array $updates, string $context): array
    {
        $columns = $this->paymentColumns();
        $allowed = array_fill_keys($columns, true);
        $missing = array_values(array_diff(array_keys($updates), $columns));

        if ($missing !== []) {
            Log::warning('Skipping payment update columns that are missing from the database schema.', [
                'context' => $context,
                'missing_columns' => $missing,
            ]);
        }

        return array_intersect_key($updates, $allowed);
    }

    private function paymentColumns(): array
    {
        if ($this->paymentColumns === null) {
            $this->paymentColumns = Schema::getColumnListing('payments');
        }

        return $this->paymentColumns;
    }

    private function paymentHasColumn(string $column): bool
    {
        return in_array($column, $this->paymentColumns(), true);
    }

    private function findPaymentForPaidInvoiceObject(StripeObject $invoiceObject, ?Subscription $subscription): ?Payment
    {
        $metadataPaymentId = $this->metadataValue($invoiceObject, 'payment_id')
            ?? $this->nestedStringValue($invoiceObject, ['invoice', 'metadata', 'payment_id']);

        if ($metadataPaymentId && ctype_digit($metadataPaymentId)) {
            $payment = Payment::query()
                ->whereKey($metadataPaymentId)
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        $reference = $this->metadataValue($invoiceObject, 'reference')
            ?? $this->nestedStringValue($invoiceObject, ['invoice', 'metadata', 'reference'])
            ?? $this->stringValue($invoiceObject, 'client_reference_id');

        if ($reference) {
            $payment = Payment::query()
                ->where('reference', $reference)
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        $checkoutSessionId = $this->stringValue($invoiceObject, 'checkout_session')
            ?? $this->nestedStringValue($invoiceObject, ['checkout_session', 'id']);

        if ($checkoutSessionId) {
            $payment = Payment::query()
                ->where('provider_session_id', $checkoutSessionId)
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        $invoiceId = $this->invoiceIdFromPaidInvoiceObject($invoiceObject);
        if ($invoiceId) {
            $payment = Payment::query()
                ->where(function ($query) use ($invoiceId): void {
                    $query->where('reference', $invoiceId);

                    if ($this->paymentHasColumn('provider_invoice_id')) {
                        $query->orWhere('provider_invoice_id', $invoiceId);
                    }
                })
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        $paymentIntentId = $this->paymentIntentIdFromPaidInvoiceObject($invoiceObject);
        if ($paymentIntentId) {
            $payment = Payment::query()
                ->where(function ($query) use ($paymentIntentId): void {
                    $query->where('provider_payment_id', $paymentIntentId);

                    if ($this->paymentHasColumn('provider_payment_intent_id')) {
                        $query->orWhere('provider_payment_intent_id', $paymentIntentId);
                    }
                })
                ->lockForUpdate()
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        if ($subscription?->id && $subscription->user_id && $subscription->plan_id) {
            return Payment::query()
                ->where('subscription_id', $subscription->id)
                ->where('user_id', $subscription->user_id)
                ->where('plan_id', $subscription->plan_id)
                ->where('gateway', 'stripe')
                ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_PAID])
                ->when($this->paymentHasColumn('provider_invoice_id'), fn ($query) => $query->whereNull('provider_invoice_id'))
                ->latest()
                ->lockForUpdate()
                ->first();
        }

        return null;
    }

    private function invoiceIdFromPaidInvoiceObject(StripeObject $invoiceObject): ?string
    {
        if ($this->stringValue($invoiceObject, 'object') === 'invoice') {
            return $this->stringValue($invoiceObject, 'id');
        }

        return $this->stringValue($invoiceObject, 'invoice')
            ?? $this->nestedStringValue($invoiceObject, ['invoice', 'id']);
    }

    private function paymentIntentIdFromPaidInvoiceObject(StripeObject $invoiceObject): ?string
    {
        return $this->nestedStringValue($invoiceObject, ['payment', 'payment_intent'])
            ?? $this->stringValue($invoiceObject, 'payment_intent')
            ?? $this->nestedStringValue($invoiceObject, ['payment_intent', 'id']);
    }

    private function chargeIdFromPaidInvoiceObject(StripeObject $invoiceObject): ?string
    {
        return $this->nestedStringValue($invoiceObject, ['payment', 'charge'])
            ?? $this->stringValue($invoiceObject, 'charge')
            ?? $this->nestedStringValue($invoiceObject, ['payment_intent', 'latest_charge']);
    }

    private function subscriptionIdFromPaidInvoiceObject(StripeObject $invoiceObject): ?string
    {
        return $this->stringValue($invoiceObject, 'subscription')
            ?? $this->nestedStringValue($invoiceObject, ['invoice', 'subscription']);
    }

    private function syncSubscriptionFromStripeObject($stripeSubscription, ?Subscription $localSubscription = null): void
    {
        if (! $stripeSubscription instanceof StripeObject) {
            Log::warning('Stripe subscription sync skipped because payload is not a Stripe object.');

            return;
        }

        $stripeSubscriptionId = $this->stringValue($stripeSubscription, 'id');

        if (! $stripeSubscriptionId) {
            Log::warning('Stripe subscription sync skipped because subscription id is missing.');

            return;
        }

        $localSubscription ??= $this->findLocalSubscriptionForStripeObject($stripeSubscription);

        if (! $localSubscription) {
            Log::warning('Stripe subscription cannot be synced because no local subscription was found.', [
                'stripe_subscription_id' => $stripeSubscriptionId,
                'metadata_user_id' => $this->metadataValue($stripeSubscription, 'user_id'),
                'metadata_plan_id' => $this->metadataValue($stripeSubscription, 'plan_id'),
            ]);

            return;
        }

        [$currentPeriodStartTimestamp, $currentPeriodEndTimestamp] = $this->getStripeSubscriptionPeriod($stripeSubscription);
        $currentPeriodStart = $this->stripeTimestampToDateTime($currentPeriodStartTimestamp);
        $currentPeriodEnd = $this->stripeTimestampToDateTime($currentPeriodEndTimestamp);
        $trialEndsAt = $this->stripeTimestampToDateTime($stripeSubscription->trial_end ?? null);
        $cancelledAt = $this->stripeTimestampToDateTime($stripeSubscription->canceled_at ?? null);
        $endsAt = $this->subscriptionEndsAt($stripeSubscription, $currentPeriodEnd);
        $metadataUserId = $this->metadataValue($stripeSubscription, 'user_id');
        $metadataPlanId = $this->metadataValue($stripeSubscription, 'plan_id');

        $cancelAtPeriodEnd = $stripeSubscription->cancel_at_period_end ?? null;
        if ($cancelAtPeriodEnd !== null) {
            $cancelAtPeriodEnd = (bool) $cancelAtPeriodEnd;
        } else {
            $cancelAtPeriodEnd = (bool) ($localSubscription->cancel_at_period_end ?? false);
        }

        $updateData = [
            'gateway' => 'stripe',
            'gateway_subscription_id' => $stripeSubscriptionId,
            'stripe_subscription_id' => $stripeSubscriptionId,
            'stripe_customer_id' => $this->stringValue($stripeSubscription, 'customer') ?? $localSubscription->stripe_customer_id,
            'status' => $this->localSubscriptionStatus($this->stringValue($stripeSubscription, 'status'), $localSubscription),
            'starts_at' => $currentPeriodStart
                ?? $this->stripeTimestampToDateTime($stripeSubscription->start_date ?? null)
                ?? $localSubscription->starts_at
                ?? now(),
            'current_period_start' => $currentPeriodStart,
            'current_period_end' => $currentPeriodEnd,
            'trial_ends_at' => $trialEndsAt,
            'cancelled_at' => $cancelledAt,
            'ends_at' => $endsAt,
            'cancel_at_period_end' => $cancelAtPeriodEnd,
        ];

        if (! $localSubscription->user_id && $metadataUserId && ctype_digit($metadataUserId)) {
            $updateData['user_id'] = (int) $metadataUserId;
        }

        if (! $localSubscription->plan_id && $metadataPlanId && ctype_digit($metadataPlanId)) {
            $updateData['plan_id'] = (int) $metadataPlanId;
        }

        $localSubscription->fill($updateData)->save();

        Log::info('Stripe subscription period sync', [
            'stripe_subscription_id' => $stripeSubscriptionId,
            'local_subscription_id' => $localSubscription->id,
            'current_period_start_timestamp' => $currentPeriodStartTimestamp,
            'current_period_end_timestamp' => $currentPeriodEndTimestamp,
            'current_period_start_date' => $this->stripeTimestampToDateTime($currentPeriodStartTimestamp)?->toDateTimeString(),
            'current_period_end_date' => $this->stripeTimestampToDateTime($currentPeriodEndTimestamp)?->toDateTimeString(),
        ]);

        Log::info('Stripe subscription synced.', [
            'stripe_subscription_id' => $stripeSubscriptionId,
            'local_subscription_id' => $localSubscription->id,
            'status' => $localSubscription->status,
            'current_period_start' => $localSubscription->current_period_start?->toISOString(),
            'current_period_end' => $localSubscription->current_period_end?->toISOString(),
        ]);
    }

    private function findLocalSubscriptionForStripeObject(StripeObject $stripeSubscription): ?Subscription
    {
        $stripeSubscriptionId = $this->stringValue($stripeSubscription, 'id');
        $subscription = $this->findLocalSubscriptionByStripeSubscriptionId($stripeSubscriptionId);

        if ($subscription) {
            return $subscription;
        }

        $metadataUserId = $this->metadataValue($stripeSubscription, 'user_id');
        $metadataPlanId = $this->metadataValue($stripeSubscription, 'plan_id');

        if ($metadataUserId && $metadataPlanId && ctype_digit($metadataUserId) && ctype_digit($metadataPlanId)) {
            $subscription = Subscription::query()
                ->where('user_id', (int) $metadataUserId)
                ->where('plan_id', (int) $metadataPlanId)
                ->where('gateway', 'stripe')
                ->where('status', 'pending')
                ->whereNull('stripe_subscription_id')
                ->whereNull('gateway_subscription_id')
                ->latest()
                ->lockForUpdate()
                ->first();

            if ($subscription) {
                return $subscription;
            }

            if ($stripeSubscriptionId) {
                return Subscription::firstOrNew(
                    ['stripe_subscription_id' => $stripeSubscriptionId],
                    [
                        'user_id' => (int) $metadataUserId,
                        'plan_id' => (int) $metadataPlanId,
                        'gateway' => 'stripe',
                    ],
                );
            }
        }

        return null;
    }

    private function findLocalSubscriptionByStripeSubscriptionId(?string $stripeSubscriptionId): ?Subscription
    {
        if (! $stripeSubscriptionId) {
            return null;
        }

        return Subscription::query()
            ->where(function ($query) use ($stripeSubscriptionId): void {
                $query->where('stripe_subscription_id', $stripeSubscriptionId)
                    ->orWhere('gateway_subscription_id', $stripeSubscriptionId);
            })
            ->lockForUpdate()
            ->first();
    }

    private function fetchLatestInvoiceForSubscription(string $subscriptionId): ?StripeObject
    {
        try {
            Stripe::setApiKey(config('services.stripe.secret'));

            $invoices = \Stripe\Invoice::all([
                'subscription' => $subscriptionId,
                'limit' => 1,
                'status' => 'paid',
            ]);

            return $invoices->data[0] ?? null;
        } catch (Throwable $e) {
            Log::warning('Failed to fetch latest invoice for subscription.', [
                'subscription_id' => $subscriptionId,
                'exception' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function retrieveStripeSubscription(?string $stripeSubscriptionId): ?StripeObject
    {
        if (! $stripeSubscriptionId) {
            return null;
        }

        $stripeSecret = config('services.stripe.secret');

        if (! is_string($stripeSecret) || trim($stripeSecret) === '') {
            return null;
        }

        try {
            Stripe::setApiKey($stripeSecret);

            return StripeSubscriptionResource::retrieve($stripeSubscriptionId);
        } catch (Throwable $exception) {
            Log::warning('Unable to retrieve Stripe subscription.', [
                'stripe_subscription_id' => $stripeSubscriptionId,
                'exception' => $exception->getMessage(),
            ]);

            return null;
        }
    }

    private function upsertInvoicePayment(
        StripeObject $invoice,
        ?Subscription $subscription,
        string $eventType,
        ?Payment $matchedPayment = null,
    ): void
    {
        $amount = (($this->floatValue($invoice, 'amount_paid') ?? 0.0) / 100);

        if ($amount <= 0) {
            return;
        }

        $invoiceId = $this->invoiceIdFromPaidInvoiceObject($invoice);
        $paymentIntent = $this->paymentIntentIdFromPaidInvoiceObject($invoice);
        $chargeId = $this->chargeIdFromPaidInvoiceObject($invoice);
        $stripeSubscriptionId = $this->subscriptionIdFromPaidInvoiceObject($invoice)
            ?? $subscription?->gateway_subscription_id
            ?? $subscription?->stripe_subscription_id;
        $reference = $invoiceId ?: ($paymentIntent ? 'in_'.$paymentIntent : null);

        if (! $reference) {
            return;
        }

        $paidAt = $this->stripeTimestampToDateTime($this->nestedValue($invoice, ['status_transitions', 'paid_at']))
            ?? now();

        $updateData = [
            'user_id' => $subscription?->user_id ?? $matchedPayment?->user_id,
            'subscription_id' => $subscription?->id ?? $matchedPayment?->subscription_id,
            'plan_id' => $subscription?->plan_id ?? $matchedPayment?->plan_id,
            'gateway' => 'stripe',
            'amount' => $amount,
            'currency' => strtoupper($this->stringValue($invoice, 'currency') ?? 'usd'),
            'status' => Payment::STATUS_PAID,
            'raw_provider_status' => $this->rawProviderStatus($invoice, $eventType),
            'paid_at' => $paidAt,
        ];

        if ($stripeSubscriptionId && str_starts_with($stripeSubscriptionId, 'sub_')) {
            $updateData['gateway_subscription_id'] = $stripeSubscriptionId;
        }

        // Store PaymentIntent ID (pi_...) as the refundable payment ID
        if ($paymentIntent && str_starts_with($paymentIntent, 'pi_')) {
            $updateData['provider_payment_intent_id'] = $paymentIntent;
            $updateData['provider_payment_id'] = $paymentIntent;
        } elseif ($matchedPayment && str_starts_with((string) $matchedPayment->provider_payment_id, 'sub_')) {
            $updateData['provider_payment_id'] = null;
        }

        // Store charge ID if available
        if ($chargeId && str_starts_with($chargeId, 'ch_')) {
            $updateData['provider_charge_id'] = $chargeId;
        }

        // Store invoice ID
        if ($invoiceId) {
            $updateData['provider_invoice_id'] = $invoiceId;
        }

        $updateData = $this->filterPaymentColumns($updateData, $eventType);

        if ($matchedPayment) {
            $matchedPayment->update($updateData);

            return;
        }

        if (! $updateData['user_id']) {
            Log::warning("Stripe {$eventType} could not create a payment because user_id is missing.", [
                'invoice_id' => $invoiceId,
                'payment_intent_id' => $paymentIntent,
            ]);

            return;
        }

        Payment::updateOrCreate(['reference' => $reference], $updateData);
    }

    private function localSubscriptionStatus(?string $stripeStatus, Subscription $localSubscription): string
    {
        return match ($stripeStatus) {
            'active' => 'active',
            'past_due' => 'past_due',
            'canceled' => 'cancelled',
            'incomplete' => 'pending',
            'incomplete_expired' => 'expired',
            'trialing' => 'trialing',
            'paused' => 'paused',
            'unpaid' => 'unpaid',
            default => $localSubscription->status ?: 'active',
        };
    }

    private function subscriptionEndsAt(StripeObject $stripeSubscription, ?Carbon $currentPeriodEnd): ?Carbon
    {
        $cancelAt = $this->stripeTimestampToDateTime($stripeSubscription->cancel_at ?? null);
        if ($cancelAt) {
            return $cancelAt;
        }

        $cancelledAt = $this->stripeTimestampToDateTime($stripeSubscription->canceled_at ?? null);
        if ($cancelledAt) {
            return $cancelledAt;
        }

        $endedAt = $this->stripeTimestampToDateTime($stripeSubscription->ended_at ?? null);
        if ($endedAt) {
            return $endedAt;
        }

        if (in_array($this->stringValue($stripeSubscription, 'status'), ['canceled', 'incomplete_expired', 'unpaid'], true)) {
            return $currentPeriodEnd;
        }

        return null;
    }

    private function getStripeSubscriptionPeriod($stripeSubscription): array
    {
        $currentPeriodStart = $stripeSubscription->current_period_start ?? null;
        $currentPeriodEnd = $stripeSubscription->current_period_end ?? null;

        if ((! $currentPeriodStart || ! $currentPeriodEnd) && isset($stripeSubscription->items->data[0])) {
            $item = $stripeSubscription->items->data[0];

            $currentPeriodStart = $currentPeriodStart ?: ($item->current_period_start ?? null);
            $currentPeriodEnd = $currentPeriodEnd ?: ($item->current_period_end ?? null);
        }

        return [$currentPeriodStart, $currentPeriodEnd];
    }

    private function stringValue(StripeObject $object, string $key): ?string
    {
        $value = $object->{$key} ?? null;

        return $this->stringFromStripeValue($value);
    }

    private function nestedStringValue(StripeObject|array|null $object, array $path): ?string
    {
        return $this->stringFromStripeValue($this->nestedValue($object, $path));
    }

    private function nestedValue(StripeObject|array|null $object, array $path)
    {
        $value = $object;

        foreach ($path as $key) {
            if ($value instanceof StripeObject) {
                $value = $value->{$key} ?? null;
            } elseif (is_array($value)) {
                $value = $value[$key] ?? null;
            } else {
                return null;
            }
        }

        return $value;
    }

    private function stringFromStripeValue($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof StripeObject) {
            return $this->stringFromStripeValue($value->id ?? null);
        }

        if (is_array($value) && array_key_exists('id', $value)) {
            return $this->stringFromStripeValue($value['id']);
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return null;
    }

    private function floatValue(StripeObject $object, string $key): ?float
    {
        $value = $object->{$key} ?? null;

        if ($value === null) {
            return null;
        }

        return (float) $value;
    }

    private function stripeTimestampToDateTime($timestamp): ?Carbon
    {
        if (empty($timestamp)) {
            return null;
        }

        if ($timestamp instanceof Carbon) {
            return $timestamp;
        }

        try {
            return Carbon::createFromTimestamp((int) $timestamp);
        } catch (Throwable) {
            return null;
        }
    }

    private function metadataValue(StripeObject $object, string $key): ?string
    {
        $metadata = $object->metadata ?? null;

        if ($metadata instanceof StripeObject) {
            $value = $metadata->{$key} ?? null;

            return $value === null || $value === '' ? null : (string) $value;
        }

        if (is_array($metadata) && array_key_exists($key, $metadata)) {
            return $metadata[$key] === null || $metadata[$key] === ''
                ? null
                : (string) $metadata[$key];
        }

        return null;
    }

    private function webhookFailureContext($object): array
    {
        if (! $object instanceof StripeObject && ! is_array($object)) {
            return [];
        }

        return [
            'reference' => $object instanceof StripeObject
                ? $this->metadataValue($object, 'reference')
                : $this->arrayMetadataValue($object, 'reference'),
            'session_id' => $this->stringFromStripeValue($object instanceof StripeObject ? ($object->id ?? null) : ($object['id'] ?? null)),
            'checkout_session_id' => $this->stringFromStripeValue($object instanceof StripeObject ? ($object->checkout_session ?? null) : ($object['checkout_session'] ?? null)),
            'subscription_id' => $this->stringFromStripeValue($object instanceof StripeObject ? ($object->subscription ?? null) : ($object['subscription'] ?? null)),
            'invoice_id' => $this->stringFromStripeValue($object instanceof StripeObject ? ($object->invoice ?? null) : ($object['invoice'] ?? null)),
            'payment_intent_id' => $object instanceof StripeObject
                ? ($this->paymentIntentIdFromPaidInvoiceObject($object) ?? $this->stringValue($object, 'payment_intent'))
                : ($this->stringFromStripeValue(data_get($object, 'payment.payment_intent')) ?? $this->stringFromStripeValue(data_get($object, 'payment_intent'))),
        ];
    }

    private function arrayMetadataValue(array $object, string $key): ?string
    {
        $value = data_get($object, "metadata.{$key}");

        return $value === null || $value === '' ? null : (string) $value;
    }

    private function paymentIntentFailureMessage(StripeObject $paymentIntent): string
    {
        $lastPaymentError = $paymentIntent->last_payment_error ?? null;

        if ($lastPaymentError instanceof StripeObject) {
            return (string) ($lastPaymentError->message ?? 'Stripe payment failed.');
        }

        return 'Stripe payment failed.';
    }

    private function rawProviderStatus(StripeObject $object, string $eventType): string
    {
        return json_encode([
            'event_type' => $eventType,
            'id' => $this->stringValue($object, 'id'),
            'status' => $this->stringValue($object, 'status'),
            'session_status' => $this->stringValue($object, 'status'),
            'payment_status' => $this->stringValue($object, 'payment_status'),
            'subscription' => $this->stringValue($object, 'subscription'),
            'invoice' => $this->invoiceIdFromPaidInvoiceObject($object)
                ?? $this->stringValue($object, 'invoice'),
            'payment_intent' => $this->paymentIntentIdFromPaidInvoiceObject($object)
                ?? $this->stringValue($object, 'payment_intent'),
            'charge' => $this->chargeIdFromPaidInvoiceObject($object)
                ?? $this->stringValue($object, 'charge'),
            'customer' => $this->stringValue($object, 'customer'),
            'mode' => $this->stringValue($object, 'mode'),
        ], JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private function safeFailureReason(Throwable $exception): string
    {
        return mb_substr($exception->getMessage(), 0, 1000);
    }
}
