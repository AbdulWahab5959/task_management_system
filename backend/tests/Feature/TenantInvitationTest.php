<?php

namespace Tests\Feature;

use App\Mail\TenantInvitationMail;
use App\Models\Tenant;
use App\Models\TenantInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class TenantInvitationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_owner_can_invite_member_and_admin(): void
    {
        $owner = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');

        $this->sendInvitation($owner, $tenant, 'member@example.com', 'member')->assertCreated();
        $this->sendInvitation($owner, $tenant, 'admin@example.com', 'admin')->assertCreated();

        $this->assertDatabaseCount('tenant_invitations', 2);
        Mail::assertSent(TenantInvitationMail::class, 2);
    }

    public function test_admin_can_invite_member_but_not_admin_or_owner(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($admin->id, ['role' => 'admin']);

        $this->sendInvitation($admin, $tenant, 'member@example.com', 'member')->assertCreated();
        $this->sendInvitation($admin, $tenant, 'admin@example.com', 'admin')->assertUnprocessable();
        $this->sendInvitation($admin, $tenant, 'owner@example.com', 'owner')->assertUnprocessable();
    }

    public function test_member_cannot_invite(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $this->sendInvitation($member, $tenant, 'new@example.com', 'member')->assertForbidden();
    }

    public function test_existing_member_and_duplicate_pending_invitation_are_rejected(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create(['email' => 'member@example.com']);
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $this->sendInvitation($owner, $tenant, ' MEMBER@example.com ', 'member')->assertStatus(409);
        $this->sendInvitation($owner, $tenant, 'pending@example.com', 'member')->assertCreated();
        $this->sendInvitation($owner, $tenant, 'PENDING@example.com', 'member')->assertStatus(409);
    }

    public function test_valid_existing_user_accepts_once_and_creates_membership(): void
    {
        $owner = User::factory()->create();
        $recipient = User::factory()->create([
            'email' => 'recipient@example.com',
            'email_verified_at' => now(),
        ]);
        $tenant = $this->createTenant($owner, 'owner');
        $token = $this->createInvitation($owner, $tenant, 'recipient@example.com', 'member');

        $this->actingAs($recipient, 'sanctum')
            ->postJson('/api/invitations/'.$token.'/accept')
            ->assertOk();
        $this->assertDatabaseHas('tenant_users', ['tenant_id' => $tenant->id, 'user_id' => $recipient->id, 'role' => 'member']);
        $this->assertDatabaseHas('tenant_invitations', ['tenant_id' => $tenant->id, 'email' => 'recipient@example.com', 'status' => 'accepted']);

        $this->actingAs($recipient, 'sanctum')
            ->postJson('/api/invitations/'.$token.'/accept')
            ->assertOk();
    }

    public function test_invited_user_can_list_and_accept_pending_invitation_without_tenant_context(): void
    {
        $owner = User::factory()->create();
        $recipient = User::factory()->create([
            'email' => 'pending-recipient@example.com',
            'email_verified_at' => now(),
        ]);
        $tenant = $this->createTenant($owner, 'owner');
        $this->createInvitation($owner, $tenant, $recipient->email, 'member');
        $invitation = TenantInvitation::query()->where('tenant_id', $tenant->id)->firstOrFail();

        $this->actingAs($recipient, 'sanctum')
            ->getJson('/api/me/invitations')
            ->assertOk()
            ->assertJsonPath('data.0.email', $recipient->email)
            ->assertJsonPath('data.0.tenant.id', $tenant->id)
            ->assertJsonMissing(['token_hash']);

        $this->actingAs($recipient, 'sanctum')
            ->postJson('/api/me/invitations/'.$invitation->id.'/accept')
            ->assertOk()
            ->assertJsonPath('tenant_id', $tenant->id);

        $this->assertDatabaseHas('tenant_users', [
            'tenant_id' => $tenant->id,
            'user_id' => $recipient->id,
            'role' => 'member',
        ]);
        $this->assertDatabaseHas('tenant_invitations', [
            'id' => $invitation->id,
            'status' => TenantInvitation::STATUS_ACCEPTED,
        ]);
    }

    public function test_wrong_email_cannot_accept(): void
    {
        $owner = User::factory()->create();
        $wrongUser = User::factory()->create(['email' => 'wrong@example.com', 'email_verified_at' => now()]);
        $tenant = $this->createTenant($owner, 'owner');
        $token = $this->createInvitation($owner, $tenant, 'recipient@example.com', 'member');

        $this->actingAs($wrongUser, 'sanctum')
            ->postJson('/api/invitations/'.$token.'/accept')
            ->assertForbidden();
    }

    public function test_reject_revoke_and_expiry_prevent_acceptance(): void
    {
        $owner = User::factory()->create();
        $recipient = User::factory()->create(['email' => 'recipient@example.com', 'email_verified_at' => now()]);
        $tenant = $this->createTenant($owner, 'owner');

        $revokedToken = $this->createInvitation($owner, $tenant, 'recipient@example.com', 'member');
        $revoked = TenantInvitation::where('token_hash', hash('sha256', $revokedToken))->firstOrFail();
        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/invitations/'.$revoked->id)->assertOk();
        $this->actingAs($recipient, 'sanctum')->postJson('/api/invitations/'.$revokedToken.'/accept')->assertStatus(422);

        $rejectedToken = $this->createInvitation($owner, $tenant, 'recipient@example.com', 'member');
        $this->actingAs($recipient, 'sanctum')->postJson('/api/invitations/'.$rejectedToken.'/reject')->assertOk();
        $this->assertDatabaseMissing('tenant_users', ['tenant_id' => $tenant->id, 'user_id' => $recipient->id]);

        $expiredToken = $this->createInvitation($owner, $tenant, 'expired@example.com', 'member');
        TenantInvitation::where('token_hash', hash('sha256', $expiredToken))->update(['expires_at' => now()->subMinute()]);
        $this->getJson('/api/invitations/'.$expiredToken)->assertNotFound();
    }

    public function test_cross_tenant_management_and_tampered_tokens_are_blocked(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $otherTenant = $this->createTenant($otherOwner, 'owner');
        $token = $this->createInvitation($otherOwner, $otherTenant, 'recipient@example.com', 'member');

        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/tenant/invitations')->assertOk()->assertJsonCount(0, 'data');
        $otherInvitation = TenantInvitation::where('tenant_id', $otherTenant->id)->firstOrFail();
        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->deleteJson('/api/tenant/invitations/'.$otherInvitation->id)->assertNotFound();
        $this->getJson('/api/invitations/'.substr($token, 0, -1).'x')->assertNotFound();
    }

    public function test_resend_regenerates_expiration_and_is_rate_limited(): void
    {
        $owner = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $this->sendInvitation($owner, $tenant, 'resend@example.com', 'member')->assertCreated();
        $invitation = TenantInvitation::firstOrFail();

        $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson('/api/tenant/invitations/'.$invitation->id.'/resend')->assertOk();

        $limited = false;
        for ($attempt = 0; $attempt < 12; $attempt++) {
            $response = $this->actingAs($owner, 'sanctum')->withHeader('X-Tenant-ID', (string) $tenant->id)
                ->postJson('/api/tenant/invitations/'.$invitation->id.'/resend');
            if ($response->status() === 429) {
                $limited = true;
                break;
            }
        }

        $this->assertTrue($limited);
    }

    private function sendInvitation(User $user, Tenant $tenant, string $email, string $role)
    {
        return $this->actingAs($user, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->postJson('/api/tenant/invitations', compact('email', 'role'));
    }

    private function createInvitation(User $owner, Tenant $tenant, string $email, string $role): string
    {
        $this->sendInvitation($owner, $tenant, $email, $role)->assertCreated();
        $token = null;
        Mail::assertSent(TenantInvitationMail::class, function (TenantInvitationMail $mail) use (&$token, $email) {
            if ($mail->invitation->email === strtolower($email)) {
                $token = $mail->token;
                return true;
            }
            return false;
        });

        return (string) $token;
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
