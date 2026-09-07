<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UsageRecord;
use App\Services\PlanEntitlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanEntitlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_organization_plan_exposes_premium_entitlements_and_usage_limits(): void
    {
        $user = User::factory()->create();
        $plan = Plan::create([
            'name' => 'Entitlement Test Plan',
            'slug' => 'entitlement-test-plan',
            'amount' => 29,
            'price' => 29,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'interval' => 'month',
            'features' => [],
            'is_active' => true,
            'sort_order' => 1,
            'limits' => [
                'organizations' => 1,
                'storage_bytes' => 1000,
                'chatbot_messages_monthly' => 2,
                'team_members' => 5,
                'api_requests_monthly' => 10,
            ],
            'metadata' => ['entitlements' => ['chatbot.basic', 'chatbot.advanced', 'support.priority']],
        ]);
        Subscription::create(['user_id' => $user->id, 'plan_id' => $plan->id, 'status' => 'active']);

        $service = app(PlanEntitlementService::class);

        $this->assertSame(['chatbot.basic', 'chatbot.advanced', 'support.priority'], $service->entitlementsFor($user));
        $this->assertFalse($service->organizationSummary($user)['over_limit']);
        $service->consume($user, 'chatbot_messages_monthly', 2);
        $this->assertSame(2, UsageRecord::query()->where('user_id', $user->id)->value('quantity'));

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        $service->consume($user, 'chatbot_messages_monthly', 1);
    }

    public function test_owner_can_select_primary_and_schedule_deletion_with_name_confirmation(): void
    {
        $user = User::factory()->create();
        $tenant = Tenant::create([
            'name' => 'Second Workspace',
            'slug' => 'second-workspace',
            'database_name' => 'tenant_second_workspace',
            'owner_id' => $user->id,
            'status' => Tenant::STATUS_ACTIVE,
        ]);
        $tenant->users()->attach($user->id, ['role' => 'owner', 'joined_at' => now()]);

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/tenants/{$tenant->id}/primary")
            ->assertOk();

        $this->assertTrue((bool) $tenant->fresh()->is_primary);

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/tenants/{$tenant->id}/schedule-deletion", ['organization_name' => 'Wrong'])
            ->assertUnprocessable();

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/tenants/{$tenant->id}/schedule-deletion", ['organization_name' => $tenant->name])
            ->assertOk();

        $this->assertNotNull($tenant->fresh()->permanent_deletion_scheduled_at);
    }

    public function test_member_cannot_select_primary_or_schedule_deletion(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = Tenant::create([
            'name' => 'Protected Workspace',
            'slug' => 'protected-workspace',
            'database_name' => 'tenant_protected_workspace',
            'owner_id' => $owner->id,
            'status' => Tenant::STATUS_ACTIVE,
        ]);
        $tenant->users()->attach([
            $owner->id => ['role' => 'owner', 'joined_at' => now()],
            $member->id => ['role' => 'member', 'joined_at' => now()],
        ]);

        $this->actingAs($member, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson("/api/tenants/{$tenant->id}/primary")
            ->assertForbidden();

        $this->actingAs($member, 'sanctum')
            ->deleteJson("/api/tenants/{$tenant->id}/permanent", ['organization_name' => $tenant->name])
            ->assertForbidden();
    }
}
