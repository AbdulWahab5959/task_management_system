<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\WebhookEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\StripeObject;
use Stripe\Webhook;
use Throwable;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
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

                if ($webhookEvent?->processed_at) {
                    return 'duplicate';
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

                return 'processed';
            });
        } catch (Throwable $exception) {
            Log::error('Stripe webhook processing failed.', [
                'event_id' => $event->id,
                'event_type' => $event->type,
                'exception' => $exception,
            ]);

            return response()->json(['message' => 'Webhook processing failed.'], 500);
        }

        return response()->json(['status' => $status]);
    }

    private function handleStripeEvent(string $eventType, StripeObject $object): void
    {
        match ($eventType) {
            'checkout.session.completed' => $this->handleCheckoutSessionCompleted($object),
            'checkout.session.expired' => $this->handleCheckoutSessionExpired($object),
            'payment_intent.payment_failed' => $this->handlePaymentIntentFailed($object),
            default => null,
        };
    }

    private function handleCheckoutSessionCompleted(StripeObject $session): void
    {
        $payment = $this->paymentFromCheckoutSession($session);

        if ($payment->status === Payment::STATUS_PAID) {
            return;
        }

        $providerPaymentId = $this->stringValue($session, 'payment_intent')
            ?? $this->stringValue($session, 'subscription');

        $payment->update([
            'status' => Payment::STATUS_PAID,
            'provider_session_id' => $this->stringValue($session, 'id') ?? $payment->provider_session_id,
            'provider_payment_id' => $providerPaymentId,
            'raw_provider_status' => $this->rawProviderStatus($session, 'checkout.session.completed'),
            'failure_reason' => null,
            'paid_at' => now(),
        ]);

        $this->activateSubscriptionForPayment($payment, $session);
    }

    private function handleCheckoutSessionExpired(StripeObject $session): void
    {
        $payment = $this->paymentFromCheckoutSession($session);

        if ($payment->status !== Payment::STATUS_PENDING) {
            return;
        }

        $payment->update([
            'status' => Payment::STATUS_EXPIRED,
            'provider_session_id' => $this->stringValue($session, 'id') ?? $payment->provider_session_id,
            'raw_provider_status' => $this->rawProviderStatus($session, 'checkout.session.expired'),
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

        $payment->update([
            'status' => Payment::STATUS_FAILED,
            'provider_payment_id' => $this->stringValue($paymentIntent, 'id'),
            'failure_reason' => $this->paymentIntentFailureMessage($paymentIntent),
            'raw_provider_status' => $this->rawProviderStatus($paymentIntent, 'payment_intent.payment_failed'),
        ]);
    }

    private function paymentFromCheckoutSession(StripeObject $session): Payment
    {
        $reference = $this->stringValue($session, 'client_reference_id')
            ?? $this->metadataValue($session, 'reference');

        if (! $reference) {
            throw new \RuntimeException('Stripe checkout session is missing the internal payment reference.');
        }

        return Payment::query()
            ->where('reference', $reference)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function activateSubscriptionForPayment(Payment $payment, StripeObject $session): void
    {
        $subscriptionId = $this->stringValue($session, 'subscription');
        $customerId = $this->stringValue($session, 'customer');

        if (! $subscriptionId || ! $customerId) {
            return;
        }

        $user = $payment->user;
        $tenant = $user?->ownedTenants()->orderBy('id')->first()
            ?? $user?->tenants()->orderBy('tenants.id')->first();

        if (! $tenant) {
            Log::info('Stripe payment was paid but no tenant exists for subscription activation.', [
                'payment_id' => $payment->id,
                'user_id' => $payment->user_id,
            ]);

            return;
        }

        Subscription::updateOrCreate(
            ['stripe_subscription_id' => $subscriptionId],
            [
                'tenant_id' => $tenant->id,
                'plan_id' => $payment->plan_id,
                'stripe_customer_id' => $customerId,
                'status' => 'active',
                'trial_ends_at' => null,
                'cancelled_at' => null,
            ],
        );

        $tenant->update([
            'plan_id' => $payment->plan_id,
            'status' => 'active',
            'trial_ends_at' => null,
        ]);
    }

    private function stringValue(StripeObject $object, string $key): ?string
    {
        $value = $object->{$key} ?? null;

        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
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
            'payment_status' => $this->stringValue($object, 'payment_status'),
        ], JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private function safeFailureReason(Throwable $exception): string
    {
        return mb_substr($exception->getMessage(), 0, 1000);
    }
}
