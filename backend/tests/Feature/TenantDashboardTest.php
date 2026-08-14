<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Models\TenantInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TenantDashboardTest extends TestCase
{
    use RefreshDatabase;

    private array $tenantDatabasePaths = [];

    protected function tearDown(): void
    {
        DB::purge('tenant');
        foreach ($this->tenantDatabasePaths as $path) {
            if (file_exists($path)) @unlink($path);
        }
        parent::tearDown();
    }

    public function test_members_receive_real_tenant_summary_and_profile_score(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($admin->id, ['role' => 'admin']);
        $tenant->users()->attach($member->id, ['role' => 'member']);
        TenantSetting::query()->insert([
            ['key' => 'industry', 'value' => 'logistics', 'type' => 'string'],
            ['key' => 'website', 'value' => 'https://acme.example.com', 'type' => 'string'],
            ['key' => 'contact_email', 'value' => 'hello@acme.example.com', 'type' => 'string'],
        ]);
        TenantInvitation::create([
            'tenant_id' => $tenant->id,
            'email' => 'pending@example.com',
            'role' => 'member',
            'token_hash' => hash('sha256', 'pending-token'),
            'invited_by' => $owner->id,
            'status' => TenantInvitation::STATUS_PENDING,
            'expires_at' => now()->addDays(7),
        ]);

        foreach ([$owner, $admin, $member] as $viewer) {
            $this->actingAs($viewer, 'sanctum')
                ->withHeader('X-Tenant-ID', (string) $tenant->id)
                ->getJson('/api/tenant/dashboard/summary')
                ->assertOk()
                ->assertJsonPath('data.tenant.id', $tenant->id)
                ->assertJsonPath('data.team.members_total', 3)
                ->assertJsonPath('data.team.owners', 1)
                ->assertJsonPath('data.team.admins', 1)
                ->assertJsonPath('data.team.members', 1)
                ->assertJsonPath('data.team.pending_invitations', 1)
                ->assertJsonPath('data.organization_profile.completion_percent', 100)
                ->assertJsonPath('data.billing.subscription_scope', 'user');
        }
    }

    public function test_cross_tenant_and_inactive_tenant_access_are_blocked(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $this->createTenant($owner, 'owner', 'First Workspace');
        $otherTenant = $this->createTenant($otherOwner, 'owner', 'Other Workspace');

        $this->actingAs($owner, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $otherTenant->id)
            ->getJson('/api/tenant/dashboard/summary')
            ->assertForbidden();

        $inactive = $this->createTenant($owner, 'owner', 'Suspended Workspace', 'suspended');
        $this->actingAs($owner, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $inactive->id)
            ->getJson('/api/tenant/dashboard/summary')
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
        Artisan::call('migrate', ['--database' => 'tenant', '--path' => 'database/migrations/tenant', '--force' => true]);
        DB::connection('tenant')->table('tenant_settings')->insert([
            ['key' => 'site_name', 'value' => $name, 'type' => 'string'],
            ['key' => 'timezone', 'value' => 'UTC', 'type' => 'string'],
            ['key' => 'currency', 'value' => 'USD', 'type' => 'string'],
        ]);
        return $tenant;
    }
}
