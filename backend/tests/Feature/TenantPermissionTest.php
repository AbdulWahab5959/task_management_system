<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TenantPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_permissions_are_scoped_and_can_be_reset(): void
    {
        $owner = User::factory()->create(); $member = User::factory()->create(); $otherOwner = User::factory()->create();
        $tenant = $this->tenant($owner); $otherTenant = $this->tenant($otherOwner);
        $tenant->users()->attach($member->id, ['role' => 'member']); $otherTenant->users()->attach($member->id, ['role' => 'member']);
        $headers = ['X-Tenant-ID' => (string) $tenant->id];
        $this->actingAs($owner, 'sanctum')->withHeaders($headers)->putJson("/api/tenant/members/{$member->id}/permissions", ['permissions' => ['members.invite']])->assertOk();
        $this->assertDatabaseHas('tenant_user_permissions', ['tenant_id' => $tenant->id, 'user_id' => $member->id]);
        $this->assertDatabaseMissing('tenant_user_permissions', ['tenant_id' => $otherTenant->id, 'user_id' => $member->id]);
        $this->actingAs($owner, 'sanctum')->withHeaders($headers)->postJson("/api/tenant/members/{$member->id}/permissions/reset")->assertOk();
        $this->assertDatabaseMissing('tenant_user_permissions', ['tenant_id' => $tenant->id, 'user_id' => $member->id]);
    }

    public function test_admin_cannot_assign_permissions_they_do_not_have_or_edit_owner(): void
    {
        $owner = User::factory()->create(); $admin = User::factory()->create(); $tenant = $this->tenant($owner); $tenant->users()->attach($admin->id, ['role' => 'admin']);
        $headers = ['X-Tenant-ID' => (string) $tenant->id];
        $this->actingAs($admin, 'sanctum')->withHeaders($headers)->putJson("/api/tenant/members/{$owner->id}/permissions", ['permissions' => ['organization.update']])->assertForbidden();
        $this->actingAs($admin, 'sanctum')->withHeaders($headers)->putJson("/api/tenant/members/{$admin->id}/permissions", ['permissions' => []])->assertForbidden();
    }

    public function test_invalid_permission_keys_are_rejected(): void
    {
        $owner = User::factory()->create(); $member = User::factory()->create(); $tenant = $this->tenant($owner); $tenant->users()->attach($member->id, ['role' => 'member']);
        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)->putJson("/api/tenant/members/{$member->id}/permissions", ['permissions' => ['platform.super_admin']])->assertUnprocessable();
    }

    private function tenant(User $owner): Tenant
    {
        $tenant = Tenant::create(['name' => 'Tenant '.uniqid(), 'slug' => 'tenant-'.uniqid(), 'database_name' => 'tenant_'.uniqid(), 'owner_id' => $owner->id, 'status' => 'active']);
        $tenant->users()->attach($owner->id, ['role' => 'owner']); return $tenant;
    }
}
