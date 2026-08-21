<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckSubscription;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantEntitlementService;
use App\Services\TenantSubscriptionResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class TenantSubscriptionFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_and_trialing_tenant_subscriptions_pass_the_middleware(): void
    {
        foreach (['active', 'trialing'] as $status) {
            $tenant = $this->createTenant();
            $this->createSubscription($tenant, $status);
            app()->instance('currentTenant', $tenant);

            $response = app(CheckSubscription::class)->handle(
                Request::create('/testing/paid-feature', 'GET'),
                fn () => response()->json(['ok' => true]),
            );

            $this->assertSame(200, $response->getStatusCode());
        }
    }

    public function test_missing_canceled_and_past_due_tenants_are_blocked(): void
    {
        foreach ([null, 'cancelled', 'past_due'] as $status) {
            $tenant = $this->createTenant();
            if ($status) {
                $this->createSubscription($tenant, $status);
            }
            app()->instance('currentTenant', $tenant);

            $response = app(CheckSubscription::class)->handle(
                Request::create('/testing/paid-feature', 'GET'),
                fn () => response()->json(['ok' => true]),
            );

            $this->assertSame(402, $response->getStatusCode());
            $payload = json_decode($response->getContent(), true);
            $this->assertSame(
                $status === 'past_due' ? 'tenant_subscription_past_due' : 'tenant_subscription_required',
                $payload['code'],
            );
        }
    }

    public function test_resolver_uses_the_owner_user_subscription_for_a_tenant(): void
    {
        $user = User::factory()->create();
        $tenant = $this->createTenant($user);
        $userPlan = $this->createPlan(['name' => 'User Plan']);
        Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $userPlan->id,
            'status' => 'active',
        ]);

        $resolver = app(TenantSubscriptionResolver::class);

        $this->assertSame($userPlan->id, $resolver->forTenant($tenant)?->plan_id);
        $this->assertSame('active', $resolver->status($tenant));
    }

    public function test_entitlements_resolve_plan_features_and_limits(): void
    {
        $tenant = $this->createTenant();
        $plan = $this->createPlan([
            'features' => ['priority_support'],
            'metadata' => ['entitlements' => ['chatbot.basic']],
            'limits' => [
                'projects' => 3,
                'custom_branding' => true,
                'api_access' => false,
                'knowledge_sources' => 'unlimited',
            ],
        ]);
        $this->createSubscription($tenant, 'active', $plan);

        $entitlements = app(TenantEntitlementService::class);

        $this->assertTrue($entitlements->hasFeature($tenant, 'priority_support'));
        $this->assertTrue($entitlements->hasEntitlement($tenant, 'chatbot.basic'));
        $this->assertFalse($entitlements->hasEntitlement($tenant, 'chatbot.unknown'));
        $this->assertTrue($entitlements->hasFeature($tenant, 'custom_branding'));
        $this->assertFalse($entitlements->hasFeature($tenant, 'api_access'));
        $this->assertFalse($entitlements->hasFeature($tenant, 'unknown_feature'));
        $this->assertSame(3, $entitlements->limit($tenant, 'projects'));
        $this->assertSame('unlimited', $entitlements->limit($tenant, 'knowledge_sources'));
        $this->assertNull($entitlements->limit($tenant, 'missing_limit'));
        $this->assertTrue($entitlements->allows($tenant, 'projects'));
        $this->assertTrue($entitlements->allows($tenant, 'knowledge_sources'));
        $this->assertFalse($entitlements->allows($tenant, 'api_access'));
    }

    private function createTenant(?User $owner = null): Tenant
    {
        $owner ??= User::factory()->create();
        $tenant = Tenant::create([
            'name' => 'Entitlement Tenant '.uniqid(),
            'slug' => 'entitlement-'.uniqid(),
            'database_name' => 'tenant_'.uniqid(),
            'owner_id' => $owner->id,
            'status' => 'active',
        ]);
        $tenant->users()->attach($owner->id, ['role' => 'owner']);

        return $tenant;
    }

    private function createPlan(array $overrides = []): Plan
    {
        return Plan::create(array_merge([
            'name' => 'Foundation Plan',
            'slug' => 'foundation-'.uniqid(),
            'amount' => 10,
            'price' => 10,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'interval' => 'month',
            'features' => [],
            'limits' => [],
            'is_active' => true,
            'sort_order' => 1,
        ], $overrides));
    }

    private function createSubscription(Tenant $tenant, string $status, ?Plan $plan = null): Subscription
    {
        $plan ??= $this->createPlan();

        return Subscription::create([
            'tenant_id' => null,
            'user_id' => $tenant->owner_id,
            'plan_id' => $plan->id,
            'status' => $status,
        ]);
    }
}
