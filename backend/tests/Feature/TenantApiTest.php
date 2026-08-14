<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class TenantApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_list_only_returns_memberships_with_roles(): void
    {
        $user = User::factory()->create();
        $ownTenant = $this->createTenant($user, 'owner');
        $memberTenant = $this->createTenant(User::factory()->create(), 'owner');
        $memberTenant->users()->attach($user->id, ['role' => 'member']);
        $this->createTenant(User::factory()->create(), 'owner');

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/tenants')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $ownTenant->id, 'role' => 'owner'])
            ->assertJsonFragment(['id' => $memberTenant->id, 'role' => 'member']);
    }

    public function test_authenticated_user_can_create_a_tenant_through_the_existing_service(): void
    {
        $user = User::factory()->create();
        $this->createActiveSubscription($user);
        $tenant = $this->createTenant($user, 'owner');
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('create')
            ->once()
            ->with(['name' => 'Acme Logistics'], Mockery::on(fn (User $owner) => $owner->is($user)))
            ->andReturn($tenant);
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', ['name' => 'Acme Logistics'])
            ->assertCreated()
            ->assertJsonPath('data.id', $tenant->id)
            ->assertJsonPath('data.role', 'owner');
    }

    public function test_user_without_active_subscription_cannot_create_a_tenant(): void
    {
        $user = User::factory()->create();
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('create')->never();
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', ['name' => 'Acme Logistics'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Please choose a plan before creating an organization.');

        $this->assertDatabaseMissing('tenants', ['name' => 'Acme Logistics']);
    }

    public function test_user_with_cancelled_subscription_cannot_create_a_tenant(): void
    {
        $user = User::factory()->create();
        $this->createActiveSubscription($user, 'cancelled');
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('create')->never();
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', ['name' => 'Acme Logistics'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Please choose a plan before creating an organization.');
    }

    public function test_admin_without_subscription_can_create_a_tenant(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $tenant = $this->createTenant($user, 'owner');
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('create')
            ->once()
            ->with(['name' => 'Acme Logistics'], Mockery::on(fn (User $owner) => $owner->is($user)))
            ->andReturn($tenant);
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', ['name' => 'Acme Logistics'])
            ->assertCreated()
            ->assertJsonPath('data.role', 'owner');
    }

    public function test_tenant_service_creates_and_seeds_the_tenant_database(): void
    {
        $user = User::factory()->create();
        $tenant = null;

        try {
            $tenant = app(TenantService::class)->create(['name' => 'Acme Logistics'], $user);
            $databasePath = database_path($tenant->database_name.'.sqlite');

            $this->assertFileExists($databasePath);
            $this->assertDatabaseHas('tenant_users', [
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => 'owner',
            ]);
            $this->assertDatabaseHas('tenant_settings', ['key' => 'site_name'], 'tenant');
        } finally {
            if ($tenant) {
                $databasePath = database_path($tenant->database_name.'.sqlite');
                DB::purge('tenant');
                if (file_exists($databasePath)) {
                    @unlink($databasePath);
                }
            }
        }
    }

    public function test_owner_and_member_can_view_a_tenant(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('switchTenant')->twice()->with(Mockery::type(Tenant::class));
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($owner, 'sanctum')->getJson('/api/tenants/'.$tenant->id)->assertOk();
        $this->actingAs($member, 'sanctum')->getJson('/api/tenants/'.$tenant->id)->assertOk();
    }

    public function test_outsider_cannot_view_a_tenant(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('switchTenant')->never();
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($outsider, 'sanctum')
            ->getJson('/api/tenants/'.$tenant->id)
            ->assertForbidden();
    }

    public function test_nonexistent_tenant_returns_not_found(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum')
            ->getJson('/api/tenants/999999')
            ->assertNotFound();
    }

    public function test_unavailable_tenant_is_rejected(): void
    {
        $user = User::factory()->create();
        $tenant = $this->createTenant($user, 'owner', 'suspended');
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('switchTenant')->never();
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/tenants/'.$tenant->id)
            ->assertForbidden();
    }

    private function createTenant(User $owner, string $role, string $status = 'active'): Tenant
    {
        $tenant = Tenant::create([
            'name' => 'Tenant '.uniqid(),
            'slug' => 'tenant-'.uniqid(),
            'database_name' => 'tenant_'.uniqid(),
            'owner_id' => $owner->id,
            'status' => $status,
        ]);

        $tenant->users()->attach($owner->id, ['role' => $role]);

        return $tenant;
    }

    private function createActiveSubscription(User $user, string $status = 'active'): Subscription
    {
        $plan = Plan::create([
            'name' => 'Pro Plan',
            'slug' => 'pro-'.uniqid(),
            'stripe_plan_id' => 'plan_'.uniqid(),
            'price' => 29.00,
            'interval' => 'month',
            'features' => [],
            'limits' => [],
            'is_active' => true,
            'sort_order' => 1,
        ]);

        return Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => $status,
            'starts_at' => now(),
        ]);
    }
}
