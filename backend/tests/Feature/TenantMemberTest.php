<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\TenantInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantMemberTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorized_users_see_only_current_tenant_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $otherOwner = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member', 'joined_at' => now()]);
        $otherTenant = $this->createTenant($otherOwner, 'owner');
        $otherMember = User::factory()->create();
        $otherTenant->users()->attach($otherMember->id, ['role' => 'member']);

        $response = $this->actingAs($member, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/tenant/members');
        $response->assertOk()->assertJsonCount(2, 'data')->assertJsonMissing(['id' => $otherMember->id]);
        $this->assertIsString($response->json('data.1.joined_at'));
    }

    public function test_pending_invitation_is_not_an_active_member(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create(['email' => 'pending@example.com']);
        $tenant = $this->createTenant($owner, 'owner');
        TenantInvitation::create([
            'tenant_id' => $tenant->id,
            'email' => $invitee->email,
            'role' => 'member',
            'token_hash' => hash('sha256', 'pending-token'),
            'invited_by' => $owner->id,
            'status' => TenantInvitation::STATUS_PENDING,
            'expires_at' => now()->addDays(7),
        ]);

        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/tenant/members')->assertOk()->assertJsonCount(1, 'data')->assertJsonMissing(['email' => $invitee->email]);
    }

    public function test_owner_can_promote_and_demote_non_owner_members(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/members/'.$member->id.'/role', ['role' => 'admin'])->assertOk();
        $this->assertDatabaseHas('tenant_users', ['tenant_id' => $tenant->id, 'user_id' => $member->id, 'role' => 'admin']);

        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/members/'.$member->id.'/role', ['role' => 'member'])->assertOk();
    }

    public function test_admin_can_only_remove_members_and_cannot_promote_or_modify_admins(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($admin->id, ['role' => 'admin']);
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $this->actingAs($admin, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/members/'.$member->id.'/role', ['role' => 'admin'])->assertForbidden();
        $this->actingAs($admin, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/members/'.$admin->id)->assertForbidden();
        $this->actingAs($admin, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/members/'.$member->id)->assertOk();
    }

    public function test_owner_is_protected_and_owner_role_cannot_be_assigned(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/members/'.$owner->id.'/role', ['role' => 'member'])->assertForbidden();
        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/members/'.$owner->id)->assertForbidden();
        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/members/'.$member->id.'/role', ['role' => 'owner'])->assertUnprocessable();
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'owner_id' => $owner->id]);
    }

    public function test_member_cannot_manage_members_and_cross_tenant_targets_are_not_found(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $otherOwner = User::factory()->create();
        $otherMember = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $otherTenant = $this->createTenant($otherOwner, 'owner');
        $otherTenant->users()->attach($otherMember->id, ['role' => 'member']);

        $this->actingAs($member, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson('/api/tenant/members/'.$owner->id.'/role', ['role' => 'member'])->assertForbidden();
        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/members/'.$otherMember->id)->assertNotFound();
    }

    public function test_removed_member_loses_access_immediately_and_repeated_remove_is_safe(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/members/'.$member->id)->assertOk();
        $this->actingAs($member, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/tenant/members')->assertForbidden();
        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/members/'.$member->id)->assertNotFound();
        $this->assertDatabaseHas('activity_logs', ['action' => 'team.member.removed', 'user_id' => $owner->id]);
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
}
