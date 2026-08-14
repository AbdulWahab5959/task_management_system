<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TenantSettingsTest extends TestCase
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

    public function test_owner_can_read_and_update_organization_settings(): void
    {
        $user = User::factory()->create();
        $tenant = $this->createTenant($user, 'owner');
        $originalSlug = $tenant->slug;
        $originalDatabase = $tenant->database_name;

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/tenant/settings')
            ->assertOk()
            ->assertJsonPath('data.name', 'Acme Logistics')
            ->assertJsonPath('data.timezone', 'UTC')
            ->assertJsonPath('data.currency', 'USD');

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/settings', [
                'name' => 'Acme Global Logistics',
                'website' => 'https://acme.example.com',
                'industry' => 'logistics',
                'description' => 'Regional logistics partner.',
                'contact_email' => 'hello@acme.example.com',
                'phone' => '+92 300 1234567',
                'country' => 'Pakistan',
                'timezone' => 'Asia/Karachi',
                'currency' => 'pkr',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Acme Global Logistics')
            ->assertJsonPath('data.currency', 'PKR');

        $tenant->refresh();
        $this->assertSame($originalSlug, $tenant->slug);
        $this->assertSame($originalDatabase, $tenant->database_name);
        $this->assertSame('Acme Global Logistics', $tenant->name);
        $this->assertDatabaseHas('activity_logs', ['action' => 'tenant.settings.updated', 'user_id' => $user->id]);
        $this->assertSame('Asia/Karachi', TenantSetting::where('key', 'timezone')->value('value'));
        $this->assertSame('PKR', TenantSetting::where('key', 'currency')->value('value'));
    }

    public function test_admin_can_update_and_member_can_only_read(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($admin->id, ['role' => 'admin']);
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $this->actingAs($admin, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/settings', ['description' => 'Updated by admin'])
            ->assertOk();

        $this->actingAs($member, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/tenant/settings')
            ->assertOk();

        $this->actingAs($member, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/settings', ['description' => 'Should be rejected'])
            ->assertForbidden();
    }

    public function test_settings_are_isolated_when_switching_tenants(): void
    {
        $user = User::factory()->create();
        $first = $this->createTenant($user, 'owner', 'First Workspace');
        $second = $this->createTenant($user, 'owner', 'Second Workspace');

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $first->id)
            ->getJson('/api/tenant/settings')
            ->assertJsonPath('data.name', 'First Workspace');

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $second->id)
            ->getJson('/api/tenant/settings')
            ->assertJsonPath('data.name', 'Second Workspace');
    }

    public function test_cross_tenant_and_invalid_tenant_access_is_rejected(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $this->createTenant($user, 'owner');
        $otherTenant = $this->createTenant($otherUser, 'owner');

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $otherTenant->id)
            ->putJson('/api/tenant/settings', ['name' => 'Attempted takeover'])
            ->assertForbidden();

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', '999999')
            ->getJson('/api/tenant/settings')
            ->assertNotFound();
    }

    public function test_invalid_profile_values_are_rejected(): void
    {
        $user = User::factory()->create();
        $tenant = $this->createTenant($user, 'owner');

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/settings', [
                'website' => 'not-a-url',
                'industry' => 'unknown-industry',
                'description' => str_repeat('x', 2001),
                'contact_email' => 'not-an-email',
                'timezone' => 'Not/A_Timezone',
                'currency' => 'US',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['website', 'industry', 'description', 'contact_email', 'timezone', 'currency']);
    }

    public function test_suspended_tenant_cannot_be_selected(): void
    {
        $user = User::factory()->create();
        $tenant = $this->createTenant($user, 'owner', 'Suspended Workspace', 'suspended');

        $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/tenant/settings')
            ->assertForbidden();
    }

    private function createTenant(User $owner, string $role, string $name = 'Acme Logistics', string $status = 'active'): Tenant
    {
        $tenant = Tenant::create([
            'name' => $name,
            'slug' => 'tenant-'.uniqid(),
            'database_name' => 'tenant_'.uniqid(),
            'owner_id' => $owner->id,
            'status' => $status,
        ]);
        $tenant->users()->attach($owner->id, ['role' => $role]);

        $path = database_path($tenant->database_name.'.sqlite');
        touch($path);
        $this->tenantDatabasePaths[] = $path;
        $tenant->configure();
        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);
        DB::connection('tenant')->table('tenant_settings')->insert([
            ['key' => 'site_name', 'value' => $name, 'type' => 'string'],
            ['key' => 'timezone', 'value' => 'UTC', 'type' => 'string'],
            ['key' => 'currency', 'value' => 'USD', 'type' => 'string'],
        ]);

        return $tenant;
    }
}
