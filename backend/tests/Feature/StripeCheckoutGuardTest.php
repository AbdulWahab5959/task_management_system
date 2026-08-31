<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Stripe\ApiRequestor;
use Stripe\HttpClient\ClientInterface;
use Stripe\HttpClient\CurlClient;
use Tests\TestCase;

class StripeCheckoutGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        ApiRequestor::setHttpClient(CurlClient::instance());

        parent::tearDown();
    }

    public function test_checkout_rejects_a_plan_without_a_valid_stripe_price(): void
    {
        $user = User::factory()->create();
        $plan = $this->createPlan(['stripe_price_id' => null]);
        Sanctum::actingAs($user);

        $this->postJson('/api/billing/stripe/checkout', ['plan_id' => $plan->id])
            ->assertUnprocessable()
            ->assertJson(['message' => 'This plan is not connected to Stripe yet.']);

        $this->assertDatabaseCount('subscriptions', 0);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_checkout_rejects_a_second_active_subscription(): void
    {
        $user = User::factory()->create();
        $plan = $this->createPlan();
        Sanctum::actingAs($user);

        Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'active',
            'stripe_subscription_id' => 'sub_existing_test',
            'gateway_subscription_id' => 'sub_existing_test',
        ]);

        $this->postJson('/api/billing/stripe/checkout', ['plan_id' => $plan->id])
            ->assertConflict()
            ->assertJsonPath('message', 'You already have an active subscription. Cancel it before starting another checkout.');

        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_checkout_reuses_a_recent_pending_stripe_session(): void
    {
        $user = User::factory()->create();
        $plan = $this->createPlan();
        Sanctum::actingAs($user);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'pending',
        ]);

        Payment::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'reference' => 'pay_existing_checkout',
            'provider_session_id' => 'cs_test_existing_checkout',
            'amount' => $plan->amount,
            'currency' => 'USD',
            'status' => Payment::STATUS_PENDING,
            'checkout_url' => 'https://checkout.stripe.test/existing',
        ]);

        $this->postJson('/api/billing/stripe/checkout', ['plan_id' => $plan->id])
            ->assertOk()
            ->assertJson([
                'checkout_url' => 'https://checkout.stripe.test/existing',
                'session_id' => 'cs_test_existing_checkout',
                'payment_reference' => 'pay_existing_checkout',
            ]);

        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_explicit_retry_creates_a_new_session_and_expires_the_old_payment(): void
    {
        config([
            'services.stripe.secret' => 'sk_test_checkout_guard',
            'services.frontend.url' => 'http://localhost:5173',
        ]);

        $stripeClient = new RecordingStripeClient;
        ApiRequestor::setHttpClient($stripeClient);

        $user = User::factory()->create();
        $plan = $this->createPlan();
        Sanctum::actingAs($user);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'pending',
        ]);

        $oldPayment = Payment::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'reference' => 'pay_expired_checkout',
            'provider_session_id' => 'cs_test_expired_checkout',
            'amount' => $plan->amount,
            'currency' => 'USD',
            'status' => Payment::STATUS_PENDING,
            'checkout_url' => 'https://checkout.stripe.test/expired',
        ]);

        $this->postJson('/api/billing/stripe/checkout', [
            'plan_id' => $plan->id,
            'retry_payment_reference' => $oldPayment->reference,
        ])
            ->assertOk()
            ->assertJsonPath('session_id', 'cs_test_recorded_1');

        $this->assertSame(Payment::STATUS_EXPIRED, $oldPayment->fresh()->status);
        $this->assertSame('failed', $subscription->fresh()->status);
        $this->assertSame(2, Payment::query()->count());
        $this->assertSame(2, Subscription::query()->count());
        $this->assertCount(1, $stripeClient->requests);
    }

    public function test_retry_cannot_use_another_users_payment_reference(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $plan = $this->createPlan();

        $subscription = Subscription::create([
            'user_id' => $owner->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'pending',
        ]);

        $payment = Payment::create([
            'user_id' => $owner->id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'reference' => 'pay_other_user_checkout',
            'provider_session_id' => 'cs_other_user_checkout',
            'amount' => $plan->amount,
            'currency' => 'USD',
            'status' => Payment::STATUS_PENDING,
            'checkout_url' => 'https://checkout.stripe.test/other-user',
        ]);

        Sanctum::actingAs($attacker);

        $this->postJson('/api/billing/stripe/checkout', [
            'plan_id' => $plan->id,
            'retry_payment_reference' => $payment->reference,
        ])
            ->assertNotFound()
            ->assertJson(['message' => 'This pending payment cannot be retried.']);

        $this->assertSame(Payment::STATUS_PENDING, $payment->fresh()->status);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_monthly_and_yearly_checkout_send_their_stored_stripe_price_ids(): void
    {
        config([
            'services.stripe.secret' => 'sk_test_checkout_guard',
            'services.frontend.url' => 'http://localhost:5173',
        ]);

        $stripeClient = new RecordingStripeClient;
        ApiRequestor::setHttpClient($stripeClient);

        $monthlyUser = User::factory()->create();
        $monthlyPlan = $this->createPlan([
            'stripe_price_id' => 'price_monthly_checkout_test',
        ]);

        Sanctum::actingAs($monthlyUser);

        $this->postJson('/api/billing/stripe/checkout', ['plan_id' => $monthlyPlan->id])
            ->assertOk()
            ->assertJsonPath('session_id', 'cs_test_recorded_1');

        $yearlyUser = User::factory()->create();
        $yearlyPlan = $this->createPlan([
            'name' => 'Yearly Checkout Test Plan',
            'slug' => 'yearly-checkout-test-plan',
            'amount' => 279.00,
            'amount_minor' => 27900,
            'price' => 279.00,
            'billing_interval' => 'year',
            'interval' => 'year',
            'stripe_price_id' => 'price_yearly_checkout_test',
        ]);

        Sanctum::actingAs($yearlyUser);

        $this->postJson('/api/billing/stripe/checkout', ['plan_id' => $yearlyPlan->id])
            ->assertOk()
            ->assertJsonPath('session_id', 'cs_test_recorded_2');

        $this->assertCount(2, $stripeClient->requests);
        $this->assertSame('subscription', $stripeClient->requests[0]['params']['mode']);
        $this->assertSame('price_monthly_checkout_test', $stripeClient->requests[0]['params']['line_items'][0]['price']);
        $this->assertSame('price_yearly_checkout_test', $stripeClient->requests[1]['params']['line_items'][0]['price']);
        $this->assertSame(2, Payment::query()->count());
        $this->assertSame(2, Subscription::query()->count());
    }

    private function createPlan(array $overrides = []): Plan
    {
        return Plan::create(array_merge([
            'name' => 'Checkout Test Plan',
            'slug' => 'checkout-test-plan',
            'description' => 'Checkout guard test plan.',
            'amount' => 29.99,
            'amount_minor' => 2999,
            'stripe_plan_id' => null,
            'price' => 29.99,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'stripe_price_id' => 'price_checkout_test',
            'interval' => 'month',
            'features' => [],
            'metadata' => [],
            'limits' => [],
            'is_active' => true,
            'is_popular' => false,
            'sort_order' => 1,
        ], $overrides));
    }
}

class RecordingStripeClient implements ClientInterface
{
    public array $requests = [];

    public function request(
        $method,
        $absUrl,
        $headers,
        $params,
        $hasFile,
        $apiMode = 'v1',
        $maxNetworkRetries = null,
    ): array {
        $this->requests[] = [
            'method' => $method,
            'url' => $absUrl,
            'headers' => $headers,
            'params' => $params,
        ];

        $sessionNumber = count($this->requests);

        return [
            json_encode([
                'id' => 'cs_test_recorded_'.$sessionNumber,
                'object' => 'checkout.session',
                'status' => 'open',
                'payment_status' => 'unpaid',
                'url' => 'https://checkout.stripe.test/session/'.$sessionNumber,
            ], JSON_UNESCAPED_SLASHES),
            200,
            [],
        ];
    }
}
