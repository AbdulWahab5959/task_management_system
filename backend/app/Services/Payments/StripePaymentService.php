<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Stripe\StripeClient;
use Throwable;

class StripePaymentService
{
    public function createCheckout(User $user, array $data): array
    {
        if (($data['gateway'] ?? null) !== 'stripe') {
            throw ValidationException::withMessages([
                'gateway' => 'The selected payment gateway is not supported.',
            ]);
        }

        $plan = Plan::query()
            ->whereKey($data['plan_id'])
            ->where('is_active', true)
            ->first();

        if (! $plan) {
            throw ValidationException::withMessages([
                'plan_id' => 'Please choose a valid active plan.',
            ]);
        }

        $amount = (float) $plan->amount;

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'plan_id' => 'This plan does not require checkout.',
            ]);
        }

        $currency = strtoupper((string) ($plan->currency ?: 'USD'));
        $reference = 'pay_'.Str::uuid()->toString();

        $payment = Payment::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'reference' => $reference,
            'amount' => $plan->amount,
            'currency' => $currency,
            'status' => Payment::STATUS_PENDING,
        ]);

        try {
            $session = $this->stripe()->checkout->sessions->create(
                $this->buildCheckoutSessionPayload($user, $plan, $payment, $currency),
                ['idempotency_key' => $payment->reference],
            );

            $payment->update([
                'provider_session_id' => $session->id,
                'checkout_url' => $session->url,
                'raw_provider_status' => $this->encodeProviderStatus([
                    'session_status' => $session->status ?? null,
                    'payment_status' => $session->payment_status ?? null,
                ]),
            ]);

            return [
                'payment_reference' => $payment->reference,
                'checkout_url' => $session->url,
            ];
        } catch (Throwable $exception) {
            $payment->update([
                'status' => Payment::STATUS_FAILED,
                'failure_reason' => 'Stripe checkout session creation failed.',
            ]);

            throw $exception;
        }
    }

    private function stripe(): StripeClient
    {
        $secret = config('services.stripe.secret');

        if (! is_string($secret) || trim($secret) === '') {
            throw new RuntimeException('Stripe secret key is not configured.');
        }

        return new StripeClient($secret);
    }

    private function buildCheckoutSessionPayload(
        User $user,
        Plan $plan,
        Payment $payment,
        string $currency,
    ): array {
        $billingInterval = $this->billingInterval($plan);
        $mode = $billingInterval ? 'subscription' : 'payment';
        $metadata = [
            'payment_id' => (string) $payment->id,
            'user_id' => (string) $user->id,
            'plan_id' => (string) $plan->id,
            'reference' => $payment->reference,
        ];

        $lineItem = $this->lineItem($plan, $currency, $billingInterval);

        $payload = [
            'mode' => $mode,
            'client_reference_id' => $payment->reference,
            'customer_email' => $user->email,
            'line_items' => [$lineItem],
            'success_url' => $this->frontendUrl('/checkout/success', $payment->reference),
            'cancel_url' => $this->frontendUrl('/checkout/cancel', $payment->reference),
            'metadata' => $metadata,
        ];

        if ($mode === 'subscription') {
            $payload['subscription_data'] = [
                'metadata' => $metadata,
            ];
        } else {
            $payload['payment_intent_data'] = [
                'metadata' => $metadata,
            ];
        }

        return $payload;
    }

    private function billingInterval(Plan $plan): ?string
    {
        $interval = $plan->getAttribute('billing_interval');

        return in_array($interval, ['month', 'year'], true) ? $interval : null;
    }

    private function lineItem(Plan $plan, string $currency, ?string $billingInterval): array
    {
        if ($plan->stripe_price_id) {
            return [
                'price' => $plan->stripe_price_id,
                'quantity' => 1,
            ];
        }

        $lineItem = [
            'price_data' => [
                'currency' => strtolower($currency),
                'product_data' => [
                    'name' => $plan->name,
                    'description' => $plan->description,
                    'metadata' => [
                        'plan_id' => (string) $plan->id,
                        'plan_slug' => (string) $plan->slug,
                    ],
                ],
                'unit_amount' => $this->unitAmount($plan),
            ],
            'quantity' => 1,
        ];

        if ($billingInterval) {
            $lineItem['price_data']['recurring'] = [
                'interval' => $billingInterval,
            ];
        }

        return $lineItem;
    }

    private function unitAmount(Plan $plan): int
    {
        if ((int) $plan->amount_minor > 0) {
            return (int) $plan->amount_minor;
        }

        return (int) round(((float) $plan->amount) * 100);
    }

    private function frontendUrl(string $path, string $reference): string
    {
        $frontendUrl = rtrim((string) config('services.frontend.url', 'http://localhost:5173'), '/');

        return $frontendUrl.$path.'?'.http_build_query(['reference' => $reference]);
    }

    private function encodeProviderStatus(array $status): string
    {
        return json_encode($status, JSON_UNESCAPED_SLASHES) ?: '{}';
    }
}
