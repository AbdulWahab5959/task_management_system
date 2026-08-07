<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class PaymentService
{
    protected ?StripeClient $stripe = null;

    protected bool $mockMode = false;

    public function __construct()
    {
        $secret = config('services.stripe.secret');
        if (empty($secret) || $secret === 'mock_secret') {
            $this->mockMode = true;
            Log::warning('Stripe Secret Key is not set or set to mock. Running PaymentService in Mock Mode.');
        } else {
            try {
                $this->stripe = new StripeClient($secret);
            } catch (\Exception $e) {
                $this->mockMode = true;
                Log::error('Failed to initialize Stripe Client: '.$e->getMessage().'. Running in Mock Mode.');
            }
        }
    }

    public function createCustomer(Tenant $tenant): string
    {
        if ($this->mockMode) {
            return 'cus_mock_'.uniqid();
        }

        try {
            $customer = $this->stripe->customers->create([
                'email' => $tenant->owner->email,
                'name' => $tenant->name,
                'metadata' => [
                    'tenant_id' => $tenant->id,
                ],
            ]);

            return $customer->id;
        } catch (ApiErrorException $e) {
            Log::error('Failed to create Stripe customer: '.$e->getMessage());

            return 'cus_mock_'.uniqid();
        }
    }

    public function createSubscription(Tenant $tenant, Plan $plan, string $paymentMethodId): Subscription
    {
        $customerId = $tenant->subscription?->stripe_customer_id ?? $this->createCustomer($tenant);

        $stripeSubId = 'sub_mock_'.uniqid();
        $status = 'active';
        $trialEnd = null;
        $periodStart = now();
        $periodEnd = now()->addMonth();

        if (! $this->mockMode) {
            try {
                // Attach payment method
                $this->stripe->paymentMethods->attach($paymentMethodId, [
                    'customer' => $customerId,
                ]);

                // Set as default payment method
                $this->stripe->customers->update($customerId, [
                    'invoice_settings' => [
                        'default_payment_method' => $paymentMethodId,
                    ],
                ]);

                // Create subscription
                $stripeSubscription = $this->stripe->subscriptions->create([
                    'customer' => $customerId,
                    'items' => [
                        ['price' => $plan->stripe_price_id],
                    ],
                    'trial_period_days' => $tenant->isOnTrial() ? 14 : null,
                    'metadata' => [
                        'tenant_id' => $tenant->id,
                        'plan_id' => $plan->id,
                    ],
                ]);

                $stripeSubId = $stripeSubscription->id;
                $status = $stripeSubscription->status;
                $trialEnd = $stripeSubscription->trial_end ? now()->timestamp($stripeSubscription->trial_end) : null;
                $periodStart = now()->timestamp($stripeSubscription->current_period_start);
                $periodEnd = now()->timestamp($stripeSubscription->current_period_end);
            } catch (ApiErrorException $e) {
                Log::error('Failed to create Stripe subscription, falling back to mock: '.$e->getMessage());
            }
        }

        // Store subscription in database
        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'stripe_subscription_id' => $stripeSubId,
            'stripe_customer_id' => $customerId,
            'status' => $status,
            'trial_ends_at' => $trialEnd,
            'current_period_start' => $periodStart,
            'current_period_end' => $periodEnd,
        ]);

        // Update tenant plan
        $tenant->update(['plan_id' => $plan->id]);

        return $subscription;
    }

    public function updateSubscription(Subscription $subscription, Plan $newPlan): Subscription
    {
        $status = 'active';
        $periodStart = now();
        $periodEnd = now()->addMonth();

        if (! $this->mockMode && ! str_starts_with($subscription->stripe_subscription_id, 'sub_mock_')) {
            try {
                // Retrieve stripe subscription
                $stripeSub = $this->stripe->subscriptions->retrieve($subscription->stripe_subscription_id);
                $itemId = $stripeSub->items->data[0]->id;

                // Update
                $stripeSubscription = $this->stripe->subscriptions->update(
                    $subscription->stripe_subscription_id,
                    [
                        'items' => [
                            [
                                'id' => $itemId,
                                'price' => $newPlan->stripe_price_id,
                            ],
                        ],
                        'proration_behavior' => 'always_invoice',
                    ]
                );

                $status = $stripeSubscription->status;
                $periodStart = now()->timestamp($stripeSubscription->current_period_start);
                $periodEnd = now()->timestamp($stripeSubscription->current_period_end);
            } catch (ApiErrorException $e) {
                Log::error('Failed to update Stripe subscription: '.$e->getMessage());
            }
        }

        // Update local subscription
        $subscription->update([
            'plan_id' => $newPlan->id,
            'status' => $status,
            'current_period_start' => $periodStart,
            'current_period_end' => $periodEnd,
        ]);

        // Update tenant plan
        $subscription->tenant->update(['plan_id' => $newPlan->id]);

        return $subscription->fresh();
    }

    public function cancelSubscription(Subscription $subscription, bool $immediately = false): void
    {
        if (! $this->mockMode && ! str_starts_with($subscription->stripe_subscription_id, 'sub_mock_')) {
            try {
                if ($immediately) {
                    $this->stripe->subscriptions->cancel($subscription->stripe_subscription_id);
                    $subscription->update([
                        'status' => 'cancelled',
                        'cancelled_at' => now(),
                    ]);
                } else {
                    $this->stripe->subscriptions->update(
                        $subscription->stripe_subscription_id,
                        ['cancel_at_period_end' => true]
                    );
                    $subscription->update([
                        'cancelled_at' => now(),
                    ]);
                }
            } catch (ApiErrorException $e) {
                Log::error('Failed to cancel Stripe subscription: '.$e->getMessage());
                $subscription->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                ]);
            }
        } else {
            $subscription->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);
        }
    }

    public function resumeSubscription(Subscription $subscription): void
    {
        if (! $this->mockMode && ! str_starts_with($subscription->stripe_subscription_id, 'sub_mock_')) {
            try {
                $this->stripe->subscriptions->update(
                    $subscription->stripe_subscription_id,
                    ['cancel_at_period_end' => false]
                );
                $subscription->update([
                    'status' => 'active',
                    'cancelled_at' => null,
                ]);
            } catch (ApiErrorException $e) {
                Log::error('Failed to resume Stripe subscription: '.$e->getMessage());
                $subscription->update([
                    'status' => 'active',
                    'cancelled_at' => null,
                ]);
            }
        } else {
            $subscription->update([
                'status' => 'active',
                'cancelled_at' => null,
            ]);
        }
    }

    public function handleWebhook(array $payload): void
    {
        $type = $payload['type'] ?? '';
        $data = $payload['data']['object'] ?? null;

        if (! $data) {
            return;
        }

        switch ($type) {
            case 'invoice.payment_succeeded':
                $this->handleInvoicePaymentSucceeded($data);
                break;
            case 'invoice.payment_failed':
                $this->handleInvoicePaymentFailed($data);
                break;
            case 'customer.subscription.updated':
                $this->handleSubscriptionUpdated($data);
                break;
            case 'customer.subscription.deleted':
                $this->handleSubscriptionDeleted($data);
                break;
        }
    }

    protected function handleInvoicePaymentSucceeded(array $data): void
    {
        $subId = $data['subscription'] ?? '';
        $subscription = Subscription::where('stripe_subscription_id', $subId)->first();

        if ($subscription) {
            Invoice::create([
                'subscription_id' => $subscription->id,
                'stripe_invoice_id' => $data['id'] ?? 'inv_'.uniqid(),
                'amount' => ($data['amount_paid'] ?? 0) / 100,
                'currency' => strtoupper($data['currency'] ?? 'usd'),
                'status' => 'paid',
                'invoice_url' => $data['hosted_invoice_url'] ?? null,
                'invoice_pdf' => $data['invoice_pdf'] ?? null,
                'paid_at' => now(),
            ]);
        }
    }

    protected function handleInvoicePaymentFailed(array $data): void
    {
        $subId = $data['subscription'] ?? '';
        $subscription = Subscription::where('stripe_subscription_id', $subId)->first();

        if ($subscription) {
            $subscription->update(['status' => 'past_due']);

            Invoice::create([
                'subscription_id' => $subscription->id,
                'stripe_invoice_id' => $data['id'] ?? 'inv_'.uniqid(),
                'amount' => ($data['amount_due'] ?? 0) / 100,
                'currency' => strtoupper($data['currency'] ?? 'usd'),
                'status' => 'failed',
                'invoice_url' => $data['hosted_invoice_url'] ?? null,
            ]);
        }
    }

    protected function handleSubscriptionUpdated(array $data): void
    {
        $subId = $data['id'] ?? '';
        $subscription = Subscription::where('stripe_subscription_id', $subId)->first();

        if ($subscription) {
            $subscription->update([
                'status' => $data['status'] ?? 'active',
                'current_period_start' => isset($data['current_period_start']) ? now()->timestamp($data['current_period_start']) : now(),
                'current_period_end' => isset($data['current_period_end']) ? now()->timestamp($data['current_period_end']) : now()->addMonth(),
            ]);
        }
    }

    protected function handleSubscriptionDeleted(array $data): void
    {
        $subId = $data['id'] ?? '';
        $subscription = Subscription::where('stripe_subscription_id', $subId)->first();

        if ($subscription) {
            $subscription->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);
        }
    }
}
