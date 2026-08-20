<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\ActivityLog;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class OrganizationCreationTest extends TestCase
{
    use RefreshDatabase;

    private array $tenantDatabasePaths = [];

    protected function tearDown(): void
    {
        DB::purge('tenant');
        foreach ($this->tenantDatabasePaths as $path) {
            if (file_exists($path)) {
                @unlink($path);
            }
        }
        parent::tearDown();
    }

    public function test_normalized_duplicate_organization_names_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->createSubscription($user, ['organizations' => 3]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', $this->organizationPayload(' Acme   Logistics '))
            ->assertCreated();
        $this->trackLatestTenantDatabase($user);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', $this->organizationPayload('acme logistics'))
            ->assertForbidden()
            ->assertJsonPath('code', 'organization_duplicate_name');
    }

    public function test_plan_organization_limit_is_enforced(): void
    {
        $user = User::factory()->create();
        $this->createSubscription($user, ['organizations' => 1]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', $this->organizationPayload('First Organization'))
            ->assertCreated();
        $this->trackLatestTenantDatabase($user);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', $this->organizationPayload('Second Organization'))
            ->assertForbidden()
            ->assertJsonPath('code', 'organization_limit_reached')
            ->assertJsonPath('limit', 1);
    }

    public function test_creation_requires_industry_website_and_contact_email(): void
    {
        $user = User::factory()->create();
        $this->createSubscription($user, ['organizations' => 3]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', ['name' => 'Incomplete Organization'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['industry', 'website', 'contact_email']);
    }

    public function test_organization_creation_is_recorded_in_activity_logs(): void
    {
        $user = User::factory()->create();
        $this->createSubscription($user, ['organizations' => 3]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', $this->organizationPayload('Activity Organization'))
            ->assertCreated();

        $this->trackLatestTenantDatabase($user);
        $tenantId = $response->json('data.id');

        $this->assertDatabaseHas('activity_logs', [
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'action' => 'tenant.organization.created',
        ]);
    }

    public function test_unlimited_plan_allows_multiple_organizations(): void
    {
        $user = User::factory()->create();
        $this->createSubscription($user, ['organizations' => 'unlimited']);

        foreach (['First Organization '.uniqid(), 'Second Organization '.uniqid()] as $name) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/tenants', $this->organizationPayload($name))
                ->assertCreated();
            $this->trackLatestTenantDatabase($user);
        }

        $this->assertSame(2, Tenant::query()->where('owner_id', $user->id)->count());
    }

    public function test_unexpected_creation_failure_returns_safe_error(): void
    {
        $user = User::factory()->create();
        $this->createSubscription($user, ['organizations' => 1]);
        $service = Mockery::mock(TenantService::class);
        $service->shouldReceive('create')->once()->andThrow(new \RuntimeException('There is no active transaction'));
        $this->app->instance(TenantService::class, $service);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/tenants', $this->organizationPayload('Acme Logistics'))
            ->assertStatus(500)
            ->assertJsonPath('code', 'organization_creation_failed')
            ->assertJsonMissing(['message' => 'There is no active transaction']);
    }

    private function createSubscription(User $user, array $limits): Subscription
    {
        $plan = Plan::create([
            'name' => 'Organization Test Plan',
            'slug' => 'organization-test-'.uniqid(),
            'amount' => 29,
            'price' => 29,
            'currency' => 'USD',
            'billing_interval' => 'month',
            'interval' => 'month',
            'features' => [],
            'limits' => $limits,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        return Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'active',
        ]);
    }

    private function trackLatestTenantDatabase(User $owner): void
    {
        $tenant = Tenant::query()->where('owner_id', $owner->id)->latest()->firstOrFail();
        $this->tenantDatabasePaths[] = database_path($tenant->database_name.'.sqlite');
    }

    private function organizationPayload(string $name): array
    {
        return [
            'name' => $name,
            'industry' => 'logistics',
            'website' => 'https://example.com',
            'contact_email' => 'hello@example.com',
        ];
    }
}
