<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Mockery;
use Tests\TestCase;

class TenantIdentificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['auth:sanctum', 'tenant.identify'])
            ->get('/testing/tenant-context', function () {
                return response()->json([
                    'tenant_id' => request()->attributes->get('tenant')->id,
                ]);
            });
    }

    public function test_owner_can_access_their_tenant(): void
    {
        $user = User::factory()->create();
        $tenant = $this->createTenant($user, 'owner');
        $this->mockTenantSwitch($tenant);

        $this->actingAs($user, 'sanctum')
            ->getJson('/testing/tenant-context?tenant_id='.$tenant->id)
            ->assertOk()
            ->assertJsonPath('tenant_id', $tenant->id);
    }

    public function test_member_can_access_a_tenant(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $this->mockTenantSwitch($tenant);

        $this->actingAs($member, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/testing/tenant-context')
            ->assertOk();
    }

    public function test_cross_tenant_header_is_rejected_before_switching(): void
    {
        $user = User::factory()->create();
        $ownTenant = $this->createTenant($user, 'owner');
        $otherTenant = $this->createTenant(User::factory()->create(), 'owner');
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('switchTenant')->never();
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $otherTenant->id)
            ->getJson('/testing/tenant-context')
            ->assertForbidden();

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'tenant_id' => null,
            'action' => 'tenant.access_denied',
        ]);
        $this->assertNotSame($ownTenant->id, $otherTenant->id);
    }

    public function test_cross_tenant_request_parameter_is_rejected(): void
    {
        $user = User::factory()->create();
        $this->createTenant($user, 'owner');
        $otherTenant = $this->createTenant(User::factory()->create(), 'owner');
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('switchTenant')->never();
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->getJson('/testing/tenant-context?tenant_id='.$otherTenant->id)
            ->assertForbidden();
    }

    public function test_nonexistent_tenant_is_not_found(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', '999999')
            ->getJson('/testing/tenant-context')
            ->assertNotFound();
    }

    public function test_conflicting_identifiers_are_rejected(): void
    {
        $user = User::factory()->create();
        $first = $this->createTenant($user, 'owner');
        $second = $this->createTenant(User::factory()->create(), 'owner');

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $second->id)
            ->getJson('/testing/tenant-context?tenant_id='.$first->id)
            ->assertStatus(422);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->withHeader('X-Tenant-ID', '1')
            ->getJson('/testing/tenant-context')
            ->assertUnauthorized();
    }

    private function createTenant(User $owner, string $role): Tenant
    {
        $tenant = Tenant::create([
            'name' => 'Tenant '.uniqid(),
            'slug' => 'tenant-'.uniqid(),
            'database_name' => 'tenant_'.uniqid(),
            'owner_id' => $owner->id,
            'status' => 'active',
        ]);

        $tenant->users()->attach($owner->id, ['role' => $role]);

        return $tenant;
    }

    private function mockTenantSwitch(Tenant $tenant): void
    {
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('switchTenant')->once()->with(Mockery::type(Tenant::class));
        $this->app->instance(TenantService::class, $service);
    }
}
