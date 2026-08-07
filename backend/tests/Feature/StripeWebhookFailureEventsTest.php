<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StripeWebhookFailureEventsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.stripe.secret' => null,
            'services.stripe.webhook_secret' => 'whsec_failure_events_test',
        ]);
    }

    public function test_webhook_rejects_an_invalid_signature(): void
    {
        $payload = json_encode([
            'id' => 'evt_invalid_signature',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_invalid_signature']],
        ], JSON_UNESCAPED_SLASHES);

        $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.time().',v1=invalid',
        ], $payload)
            ->assertBadRequest()
            ->assertJson(['message' => 'Invalid Stripe webhook signature.']);

        $this->assertDatabaseCount('webhook_events', 0);
    }

    public function test_expired_checkout_marks_only_the_matching_pending_payment_expired(): void
    {
        [$user, $plan] = $this->createUserAndPlan();
        $payment = $this->createPayment($user, $plan, [
            'provider_session_id' => 'cs_expired_test',
        ]);

        $payload = json_encode([
            'id' => 'evt_checkout_expired_test',
            'object' => 'event',
            'type' => 'checkout.session.expired',
            'data' => [
                'object' => [
                    'id' => 'cs_expired_test',
                    'object' => 'checkout.session',
                    'status' => 'expired',
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $this->postSignedWebhook($payload)->assertOk();

        $this->assertSame(Payment::STATUS_EXPIRED, $payment->fresh()->status);
    }

    public function test_payment_intent_failure_marks_the_matching_pending_payment_failed(): void
    {
        [$user, $plan] = $this->createUserAndPlan();
        $payment = $this->createPayment($user, $plan);

        $payload = json_encode([
            'id' => 'evt_payment_intent_failed_test',
            'object' => 'event',
            'type' => 'payment_intent.payment_failed',
            'data' => [
                'object' => [
                    'id' => 'pi_failed_test',
                    'object' => 'payment_intent',
                    'status' => 'requires_payment_method',
                    'metadata' => [
                        'reference' => $payment->reference,
                    ],
                    'last_payment_error' => [
                        'message' => 'Your card was declined.',
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $this->postSignedWebhook($payload)->assertOk();

        $payment->refresh();

        $this->assertSame(Payment::STATUS_FAILED, $payment->status);
        $this->assertSame('pi_failed_test', $payment->provider_payment_intent_id);
        $this->assertSame('Your card was declined.', $payment->failure_reason);
    }

    public function test_failed_invoice_marks_the_matching_subscription_past_due(): void
    {
        [$user, $plan] = $this->createUserAndPlan();
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'active',
            'gateway_subscription_id' => 'sub_failed_invoice_test',
            'stripe_subscription_id' => 'sub_failed_invoice_test',
        ]);

        $payload = json_encode([
            'id' => 'evt_invoice_failed_test',
            'object' => 'event',
            'type' => 'invoice.payment_failed',
            'data' => [
                'object' => [
                    'id' => 'in_failed_test',
                    'object' => 'invoice',
                    'subscription' => 'sub_failed_invoice_test',
                    'status' => 'open',
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $this->postSignedWebhook($payload)->assertOk();

        $this->assertSame('past_due', $subscription->fresh()->status);
    }

    public function test_deleted_subscription_is_cancelled_idempotently(): void
    {
        [$user, $plan] = $this->createUserAndPlan();
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'active',
            'gateway_subscription_id' => 'sub_deleted_test',
            'stripe_subscription_id' => 'sub_deleted_test',
        ]);

        $cancelledAt = now()->subMinute()->timestamp;
        $payload = json_encode([
            'id' => 'evt_subscription_deleted_test',
            'object' => 'event',
            'type' => 'customer.subscription.deleted',
            'data' => [
                'object' => [
                    'id' => 'sub_deleted_test',
                    'object' => 'subscription',
                    'customer' => 'cus_deleted_test',
                    'status' => 'canceled',
                    'canceled_at' => $cancelledAt,
                    'ended_at' => $cancelledAt,
                    'items' => ['object' => 'list', 'data' => []],
                    'metadata' => [],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $this->postSignedWebhook($payload)->assertOk();
        $this->postSignedWebhook($payload)->assertOk()->assertJson(['status' => 'reprocessed']);

        $subscription->refresh();

        $this->assertSame('cancelled', $subscription->status);
        $this->assertNotNull($subscription->cancelled_at);
        $this->assertSame(1, Subscription::where('stripe_subscription_id', 'sub_deleted_test')->count());
    }

    private function createUserAndPlan(): array
    {
        $user = User::factory()->create();
        $plan = Plan::create([
            'name' => 'Webhook Failure Test Plan',
            'slug' => 'webhook-failure-test-plan',
            'description' => 'Webhook failure event test plan.',
            'amount' => 29.99,
            'amount_minor' => 2999,
            'stripe_plan_id' => null,
            'price' => 29.99,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'stripe_price_id' => 'price_webhook_failure_test',
            'interval' => 'month',
            'features' => [],
            'metadata' => [],
            'limits' => [],
            'is_active' => true,
        ]);

        return [$user, $plan];
    }

    private function createPayment(User $user, Plan $plan, array $overrides = []): Payment
    {
        return Payment::create(array_merge([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'reference' => 'pay_webhook_failure_test',
            'amount' => 29.99,
            'currency' => 'USD',
            'status' => Payment::STATUS_PENDING,
        ], $overrides));
    }

    private function postSignedWebhook(string $payload)
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$payload, 'whsec_failure_events_test');

        return $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't='.$timestamp.',v1='.$signature,
        ], $payload);
    }
}
