<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class StripeWebhookControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_checkout_completed_marks_payment_paid_and_subscription_active(): void
    {
        config([
            'services.stripe.secret' => null,
            'services.stripe.webhook_secret' => 'whsec_test_secret',
        ]);

        $user = User::factory()->create();
        $plan = Plan::create([
            'name' => 'Pro',
            'slug' => 'pro',
            'description' => 'Pro plan',
            'stripe_plan_id' => 'price_legacy_test',
            'price' => 29.00,
            'interval' => 'month',
            'amount' => 29.00,
            'amount_minor' => 2900,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'stripe_price_id' => 'price_test_123',
            'features' => [],
            'limits' => [],
            'is_active' => true,
        ]);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'pending',
        ]);

        $payment = Payment::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'reference' => 'pay_test_reference',
            'provider_session_id' => 'cs_test_123',
            'amount' => 29.00,
            'currency' => 'USD',
            'status' => Payment::STATUS_PENDING,
        ]);

        $payload = json_encode([
            'id' => 'evt_checkout_completed_test',
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_123',
                    'object' => 'checkout.session',
                    'status' => 'complete',
                    'payment_status' => 'paid',
                    'mode' => 'subscription',
                    'payment_intent' => null,
                    'subscription' => 'sub_test_123',
                    'customer' => 'cus_test_123',
                    'invoice' => 'in_test_123',
                    'client_reference_id' => 'pay_test_reference',
                    'metadata' => [
                        'payment_id' => (string) $payment->id,
                        'plan_id' => (string) $plan->id,
                        'user_id' => (string) $user->id,
                        'reference' => 'pay_test_reference',
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $response = $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $this->stripeSignature($payload, 'whsec_test_secret'),
        ], $payload);

        $response->assertOk()->assertJson(['status' => 'processed']);

        $payment->refresh();
        $subscription->refresh();

        $this->assertSame(Payment::STATUS_PAID, $payment->status);
        $this->assertSame('cs_test_123', $payment->provider_session_id);
        $this->assertSame('sub_test_123', $payment->gateway_subscription_id);
        $this->assertNull($payment->provider_payment_id);
        $this->assertNull($payment->provider_payment_intent_id);
        $this->assertSame('in_test_123', $payment->provider_invoice_id);
        $this->assertNotNull($payment->paid_at);

        $rawProviderStatus = json_decode($payment->raw_provider_status, true);
        $this->assertSame('complete', $rawProviderStatus['session_status']);
        $this->assertSame('paid', $rawProviderStatus['payment_status']);
        $this->assertSame('sub_test_123', $rawProviderStatus['subscription']);
        $this->assertSame('in_test_123', $rawProviderStatus['invoice']);
        $this->assertSame('cus_test_123', $rawProviderStatus['customer']);
        $this->assertSame('subscription', $rawProviderStatus['mode']);

        $this->assertSame('active', $subscription->status);
        $this->assertSame('stripe', $subscription->gateway);
        $this->assertSame('sub_test_123', $subscription->gateway_subscription_id);
        $this->assertSame('sub_test_123', $subscription->stripe_subscription_id);
        $this->assertSame('cus_test_123', $subscription->stripe_customer_id);
        $this->assertNotNull($subscription->starts_at);

        $this->assertDatabaseHas('webhook_events', [
            'gateway' => 'stripe',
            'provider_event_id' => 'evt_checkout_completed_test',
            'event_type' => 'checkout.session.completed',
            'failed_at' => null,
            'failure_reason' => null,
        ]);
    }

    public function test_invoice_payment_paid_backfills_payment_intent_and_invoice_on_existing_payment(): void
    {
        config([
            'services.stripe.secret' => null,
            'services.stripe.webhook_secret' => 'whsec_test_secret',
        ]);

        $user = User::factory()->create();
        $plan = Plan::create([
            'name' => 'Pro',
            'slug' => 'pro-invoice-payment',
            'description' => 'Pro plan',
            'stripe_plan_id' => 'price_legacy_invoice_payment',
            'price' => 29.99,
            'interval' => 'month',
            'amount' => 29.99,
            'amount_minor' => 2999,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'stripe_price_id' => 'price_invoice_payment_123',
            'features' => [],
            'limits' => [],
            'is_active' => true,
        ]);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'active',
            'gateway_subscription_id' => 'sub_invoice_payment_test',
            'stripe_subscription_id' => 'sub_invoice_payment_test',
        ]);

        $payment = Payment::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'reference' => 'pay_invoice_payment_reference',
            'provider_session_id' => 'cs_invoice_payment_test',
            'provider_invoice_id' => 'in_1TosFK1Oz8XVPHYW2v5wgx7N',
            'amount' => 29.99,
            'currency' => 'USD',
            'status' => Payment::STATUS_PAID,
            'paid_at' => now(),
        ]);

        $paidAt = Carbon::parse('2026-07-02 12:00:00 UTC')->timestamp;
        $payload = json_encode([
            'id' => 'evt_invoice_payment_paid_test',
            'object' => 'event',
            'type' => 'invoice_payment.paid',
            'data' => [
                'object' => [
                    'id' => 'ipmt_invoice_payment_test',
                    'object' => 'invoice_payment',
                    'invoice' => 'in_1TosFK1Oz8XVPHYW2v5wgx7N',
                    'status' => 'paid',
                    'amount_paid' => 2999,
                    'currency' => 'usd',
                    'payment' => [
                        'payment_intent' => 'pi_3TosFK1Oz8XVPHYW0HgnRZb0',
                    ],
                    'status_transitions' => [
                        'paid_at' => $paidAt,
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $this->postSignedStripeWebhook($payload)
            ->assertOk()
            ->assertJson(['status' => 'processed']);

        $payment->refresh();

        $this->assertSame(Payment::STATUS_PAID, $payment->status);
        $this->assertSame('pi_3TosFK1Oz8XVPHYW0HgnRZb0', $payment->provider_payment_intent_id);
        $this->assertSame('pi_3TosFK1Oz8XVPHYW0HgnRZb0', $payment->provider_payment_id);
        $this->assertSame('sub_invoice_payment_test', $payment->gateway_subscription_id);
        $this->assertSame('in_1TosFK1Oz8XVPHYW2v5wgx7N', $payment->provider_invoice_id);
        $this->assertSame('29.99', (string) $payment->amount);
        $this->assertSame('USD', $payment->currency);
        $this->assertSame($paidAt, $payment->paid_at->timestamp);

        $rawProviderStatus = json_decode($payment->raw_provider_status, true);
        $this->assertSame('invoice_payment.paid', $rawProviderStatus['event_type']);
        $this->assertSame('pi_3TosFK1Oz8XVPHYW0HgnRZb0', $rawProviderStatus['payment_intent']);
        $this->assertSame('in_1TosFK1Oz8XVPHYW2v5wgx7N', $rawProviderStatus['invoice']);
    }

    public function test_customer_subscription_updated_syncs_period_dates_idempotently(): void
    {
        config([
            'services.stripe.secret' => null,
            'services.stripe.webhook_secret' => 'whsec_test_secret',
        ]);

        $user = User::factory()->create();
        $plan = Plan::create([
            'name' => 'Team',
            'slug' => 'team',
            'description' => 'Team plan',
            'stripe_plan_id' => 'price_legacy_team',
            'price' => 49.00,
            'interval' => 'month',
            'amount' => 49.00,
            'amount_minor' => 4900,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'stripe_price_id' => 'price_team_123',
            'features' => [],
            'limits' => [],
            'is_active' => true,
        ]);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => 'stripe',
            'status' => 'pending',
        ]);

        $periodStart = Carbon::parse('2026-06-01 00:00:00 UTC')->timestamp;
        $periodEnd = Carbon::parse('2026-07-01 00:00:00 UTC')->timestamp;
        $payload = json_encode([
            'id' => 'evt_subscription_updated_test',
            'object' => 'event',
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_period_test',
                    'object' => 'subscription',
                    'customer' => 'cus_period_test',
                    'status' => 'active',
                    'trial_end' => null,
                    'cancel_at' => null,
                    'canceled_at' => null,
                    'ended_at' => null,
                    'items' => [
                        'object' => 'list',
                        'data' => [[
                            'id' => 'si_period_test',
                            'object' => 'subscription_item',
                            'current_period_start' => $periodStart,
                            'current_period_end' => $periodEnd,
                        ]],
                    ],
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'plan_id' => (string) $plan->id,
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        $this->postSignedStripeWebhook($payload)
            ->assertOk()
            ->assertJson(['status' => 'processed']);

        $subscription->refresh();

        $this->assertSame('active', $subscription->status);
        $this->assertSame('stripe', $subscription->gateway);
        $this->assertSame('sub_period_test', $subscription->gateway_subscription_id);
        $this->assertSame('sub_period_test', $subscription->stripe_subscription_id);
        $this->assertSame('cus_period_test', $subscription->stripe_customer_id);
        $this->assertSame($periodStart, $subscription->starts_at->timestamp);
        $this->assertSame($periodStart, $subscription->current_period_start->timestamp);
        $this->assertSame($periodEnd, $subscription->current_period_end->timestamp);
        $this->assertNull($subscription->trial_ends_at);
        $this->assertNull($subscription->cancelled_at);
        $this->assertNull($subscription->ends_at);

        $this->postSignedStripeWebhook($payload)
            ->assertOk()
            ->assertJson(['status' => 'reprocessed']);

        $this->assertSame(1, Subscription::where('stripe_subscription_id', 'sub_period_test')->count());
    }

    private function postSignedStripeWebhook(string $payload)
    {
        return $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => $this->stripeSignature($payload, 'whsec_test_secret'),
        ], $payload);
    }

    private function stripeSignature(string $payload, string $secret): string
    {
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$payload, $secret);

        return 't='.$timestamp.',v1='.$signature;
    }
}
