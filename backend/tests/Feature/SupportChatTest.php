<?php

namespace Tests\Feature;

use App\Events\SupportMessageCreated;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class SupportChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_create_conversation_and_send_message(): void
    {
        [$customer] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/support/conversation')->assertOk()->assertJsonPath('data.user_id', $customer->id);
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/support/conversation/messages', ['message' => 'I need help.'])
            ->assertOk()->assertJsonPath('data.message', 'I need help.');

        $this->assertDatabaseHas('support_messages', ['sender_id' => $customer->id, 'message' => 'I need help.']);
    }

    public function test_customer_message_history_is_bounded_and_cursor_paginated(): void
    {
        [$customer, $organization] = $this->customerWithOrganization();
        $conversation = SupportConversation::create([
            'user_id' => $customer->id,
            'organization_id' => $organization->id,
            'status' => 'open',
        ]);

        for ($index = 1; $index <= 55; $index++) {
            SupportMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $customer->id,
                'sender_role' => 'user',
                'message' => 'Message '.$index,
            ]);
        }

        $headers = [
            'Authorization' => 'Bearer '.$customer->createToken('support')->plainTextToken,
            'X-Tenant-ID' => (string) $organization->id,
        ];
        $firstPage = $this->withHeaders($headers)
            ->getJson('/api/support/conversation/messages?limit=50')
            ->assertOk()
            ->assertJsonCount(50, 'data')
            ->assertJsonPath('data.0.message', 'Message 6')
            ->assertJsonPath('data.49.message', 'Message 55')
            ->assertJsonPath('has_more', true);

        $cursor = $firstPage->json('next_cursor');
        $this->assertIsString($cursor);
        $this->withHeaders($headers)
            ->getJson('/api/support/conversation/messages?cursor='.urlencode($cursor))
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.message', 'Message 1')
            ->assertJsonPath('data.4.message', 'Message 5')
            ->assertJsonPath('has_more', false)
            ->assertJsonPath('next_cursor', null);
    }

    public function test_admin_message_history_uses_the_same_bounded_contract(): void
    {
        [$customer, $organization] = $this->customerWithOrganization();
        $conversation = SupportConversation::create([
            'user_id' => $customer->id,
            'organization_id' => $organization->id,
            'status' => 'open',
        ]);
        for ($index = 1; $index <= 3; $index++) {
            SupportMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $customer->id,
                'sender_role' => 'user',
                'message' => 'Admin view '.$index,
            ]);
        }

        $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $this->withHeader('Authorization', 'Bearer '.$admin->createToken('support-admin')->plainTextToken)
            ->getJson('/api/admin/support/conversations/'.$conversation->id.'/messages?limit=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.message', 'Admin view 2')
            ->assertJsonPath('data.1.message', 'Admin view 3')
            ->assertJsonPath('has_more', true);
    }

    public function test_super_admin_can_list_view_and_reply_to_conversations(): void
    {
        [$customer] = $this->customerWithOrganization();
        $customerToken = $customer->createToken('support')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$customerToken)->getJson('/api/support/conversation')->assertOk();
        $this->withHeader('Authorization', 'Bearer '.$customerToken)->postJson('/api/support/conversation/messages', ['message' => 'Please reply.']);
        $conversation = SupportConversation::firstOrFail();
        $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $adminToken = $admin->createToken('support-admin')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$adminToken)->getJson('/api/admin/support/conversations')->assertOk()->assertJsonPath('data.data.0.id', $conversation->id);
        $this->withHeader('Authorization', 'Bearer '.$adminToken)->postJson("/api/admin/support/conversations/{$conversation->id}/messages", ['message' => 'We can help.'])
            ->assertOk()->assertJsonPath('data.message', 'We can help.');
    }

    public function test_other_customer_and_admin_cannot_access_super_admin_inbox(): void
    {
        [$customer] = $this->customerWithOrganization();
        $other = User::factory()->create();
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

        $this->withHeader('Authorization', 'Bearer '.$customer->createToken('support')->plainTextToken)->getJson('/api/support/conversation')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$other->createToken('other')->plainTextToken)->getJson('/api/support/conversation/messages')->assertNotFound();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$admin->createToken('admin')->plainTextToken)->getJson('/api/admin/support/conversations')->assertForbidden();
    }

    public function test_empty_and_too_long_messages_are_rejected(): void
    {
        [$customer] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/support/conversation');

        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/support/conversation/messages', ['message' => '   '])->assertUnprocessable()->assertJsonValidationErrors('message');
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/support/conversation/messages', ['message' => str_repeat('x', 2001)])->assertUnprocessable()->assertJsonValidationErrors('message');
    }

    public function test_closed_conversation_can_be_reopened_and_unauthenticated_access_is_rejected(): void
    {
        [$customer] = $this->customerWithOrganization();
        $this->getJson('/api/support/conversation')->assertUnauthorized();
        $token = $customer->createToken('support')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$token)->getJson('/api/support/conversation');
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/support/conversation/status/closed')->assertOk();
        $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/support/conversation/status/open')->assertOk()->assertJsonPath('data.status', 'open');
    }

    public function test_cross_organization_context_is_not_used_for_another_customer(): void
    {
        [$first] = $this->customerWithOrganization('First');
        [$second] = $this->customerWithOrganization('Second');
        $firstToken = $first->createToken('first')->plainTextToken;
        $secondToken = $second->createToken('second')->plainTextToken;
        $this->assertNotSame($first->id, $second->id);
        $this->withHeader('Authorization', 'Bearer '.$firstToken)->getJson('/api/support/conversation')->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$secondToken)->getJson('/api/support/conversation')->assertOk();

        $this->assertDatabaseCount('support_conversations', 2);
        $this->withHeader('Authorization', 'Bearer '.$firstToken)->getJson('/api/support/conversation/messages')->assertOk();
        $this->assertNotSame(
            SupportConversation::where('user_id', $first->id)->value('organization_id'),
            SupportConversation::where('user_id', $second->id)->value('organization_id'),
        );
    }

    public function test_customer_gets_a_separate_support_conversation_per_organization(): void
    {
        [$customer, $firstOrganization] = $this->customerWithOrganization('First workspace');
        $secondOrganization = Tenant::create([
            'name' => 'Second workspace',
            'slug' => 'second-workspace-'.uniqid(),
            'database_name' => 'support-'.uniqid(),
            'owner_id' => $customer->id,
            'status' => Tenant::STATUS_ACTIVE,
        ]);
        DB::table('tenant_users')->insert([
            'tenant_id' => $secondOrganization->id,
            'user_id' => $customer->id,
            'role' => 'owner',
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $customer->createToken('support')->plainTextToken;
        $firstConversation = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'X-Tenant-ID' => (string) $firstOrganization->id,
        ])->getJson('/api/support/conversation')->assertOk()->json('data.id');

        $secondConversation = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'X-Tenant-ID' => (string) $secondOrganization->id,
        ])->getJson('/api/support/conversation')->assertOk()->json('data.id');

        $this->assertNotSame($firstConversation, $secondConversation);
        $this->assertDatabaseCount('support_conversations', 2);
    }

    public function test_faq_interaction_persists_the_question_and_answer(): void
    {
        [$customer, $organization] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'X-Tenant-ID' => (string) $organization->id,
        ])->getJson('/api/support/conversation')->assertOk();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'X-Tenant-ID' => (string) $organization->id,
        ])->postJson('/api/support/conversation/faqs/plans-available')->assertOk();

        $this->assertStringContainsString('Question: What plans are available?', $response->json('data.message'));
        $this->assertStringContainsString('Answer:', $response->json('data.message'));

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'X-Tenant-ID' => (string) $organization->id,
        ])->getJson('/api/support/conversation/messages')
            ->assertOk()
            ->assertJsonPath('data.0.message', $response->json('data.message'));
    }

    public function test_customer_receives_admin_reply_in_their_conversation(): void
    {
        [$customer, $organization] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $organization->id];

        $this->withHeaders($headers)->getJson('/api/support/conversation')->assertOk();
        $this->withHeaders($headers)->postJson('/api/support/conversation/messages', ['message' => 'Need help with billing.'])->assertOk();

        $conversation = SupportConversation::firstOrFail();
        $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$admin->createToken('support-admin')->plainTextToken)
            ->postJson("/api/admin/support/conversations/{$conversation->id}/messages", ['message' => 'We’ll take a look.'])
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withHeaders($headers)->getJson('/api/support/conversation/messages')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.1.sender_role', 'super_admin')
            ->assertJsonPath('data.1.message', 'We’ll take a look.');
    }

    public function test_customer_message_marks_conversation_pending_and_admin_reply_marks_open(): void
    {
        [$customer, $organization] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $organization->id];

        $conversationId = $this->withHeaders($headers)->getJson('/api/support/conversation')->assertOk()->json('data.id');
        $this->assertSame('open', SupportConversation::findOrFail($conversationId)->status);

        $this->withHeaders($headers)->postJson('/api/support/conversation/messages', ['message' => 'Hello support.'])->assertOk();
        $this->assertSame('pending', SupportConversation::findOrFail($conversationId)->status);

        $admin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$admin->createToken('support-admin')->plainTextToken)
            ->postJson("/api/admin/support/conversations/{$conversationId}/messages", ['message' => 'Hi there.'])
            ->assertOk();
        $this->assertSame('open', SupportConversation::findOrFail($conversationId)->status);
    }

    public function test_faq_handoff_marks_conversation_pending_and_persists_type(): void
    {
        [$customer, $organization] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $organization->id];

        $conversationId = $this->withHeaders($headers)->getJson('/api/support/conversation')->assertOk()->json('data.id');
        $response = $this->withHeaders($headers)->postJson('/api/support/conversation/faqs/talk-to-support')->assertOk();

        $response->assertJsonPath('data.sender_role', 'system')
            ->assertJsonPath('data.meta.type', 'handoff')
            ->assertJsonPath('data.meta.slug', 'talk-to-support');
        $this->assertSame('pending', SupportConversation::findOrFail($conversationId)->status);
        $this->assertSame('handoff', SupportMessage::findOrFail($response->json('data.id'))->meta['type']);
    }

    public function test_selecting_the_same_faq_twice_does_not_create_duplicate_messages(): void
    {
        [$customer, $organization] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $organization->id];

        $conversationId = $this->withHeaders($headers)->getJson('/api/support/conversation')->assertOk()->json('data.id');
        $firstId = $this->withHeaders($headers)->postJson('/api/support/conversation/faqs/plans-available')->assertOk()->json('data.id');
        $secondId = $this->withHeaders($headers)->postJson('/api/support/conversation/faqs/plans-available')->assertOk()->json('data.id');

        $this->assertSame($firstId, $secondId);
        $this->assertDatabaseCount('support_messages', 1);
        $this->assertSame(1, SupportConversation::findOrFail($conversationId)->messages()->count());
    }

    public function test_conversation_messages_are_scoped_per_organization(): void
    {
        [$customer, $firstOrganization] = $this->customerWithOrganization('First workspace');
        $secondOrganization = Tenant::create([
            'name' => 'Second workspace',
            'slug' => 'second-workspace-'.uniqid(),
            'database_name' => 'support-'.uniqid(),
            'owner_id' => $customer->id,
            'status' => Tenant::STATUS_ACTIVE,
        ]);
        DB::table('tenant_users')->insert([
            'tenant_id' => $secondOrganization->id,
            'user_id' => $customer->id,
            'role' => 'owner',
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $customer->createToken('support')->plainTextToken;
        $firstHeaders = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $firstOrganization->id];
        $secondHeaders = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $secondOrganization->id];

        $this->withHeaders($firstHeaders)->getJson('/api/support/conversation')->assertOk();
        $this->withHeaders($firstHeaders)->postJson('/api/support/conversation/messages', ['message' => 'Private to the first workspace.'])->assertOk();

        $this->withHeaders($secondHeaders)->getJson('/api/support/conversation')->assertOk();
        $this->withHeaders($secondHeaders)->getJson('/api/support/conversation/messages')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeaders($firstHeaders)->getJson('/api/support/conversation/messages')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.message', 'Private to the first workspace.');
    }

    public function test_cross_organization_header_spoofing_is_rejected(): void
    {
        [$customerA] = $this->customerWithOrganization('Org A');
        [, $organizationB] = $this->customerWithOrganization('Org B');
        $token = $customerA->createToken('support')->plainTextToken;

        $this->withHeaders([
            'Authorization' => 'Bearer '.$token,
            'X-Tenant-ID' => (string) $organizationB->id,
        ])->getJson('/api/support/conversation')->assertForbidden();
    }

    public function test_removed_member_cannot_access_their_historical_conversation(): void
    {
        [$customer, $organization] = $this->customerWithOrganization('Former member workspace');
        $token = $customer->createToken('support')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $organization->id];

        $this->withHeaders($headers)->getJson('/api/support/conversation')->assertOk();
        $this->withHeaders($headers)->postJson('/api/support/conversation/messages', ['message' => 'Private message'])->assertOk();

        DB::table('tenant_users')->where('tenant_id', $organization->id)->where('user_id', $customer->id)->delete();

        $this->withHeaders(['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => ''])
            ->getJson('/api/support/conversation/messages')
            ->assertNotFound();
        $this->withHeaders($headers)
            ->postJson('/api/support/conversation/messages', ['message' => 'Should be rejected'])
            ->assertForbidden();
    }

    public function test_regular_user_cannot_access_admin_inbox(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_USER]);
        $this->withHeader('Authorization', 'Bearer '.$user->createToken('regular')->plainTextToken)
            ->getJson('/api/admin/support/conversations')
            ->assertForbidden();
        $this->assertDatabaseCount('support_conversations', 0);
    }

    public function test_message_endpoint_is_rate_limited(): void
    {
        // In-memory SQLite reuses small ids between tests and the array cache
        // persists within a PHPUnit process; a dedicated high id keeps this
        // user's throttle bucket isolated so the assertion is deterministic.
        $customer = User::factory()->create(['id' => 900_001]);
        $organization = Tenant::create([
            'name' => 'Rate limited workspace',
            'slug' => 'rate-limited-'.uniqid(),
            'database_name' => 'support-'.uniqid(),
            'owner_id' => $customer->id,
            'status' => Tenant::STATUS_ACTIVE,
        ]);
        DB::table('tenant_users')->insert([
            'tenant_id' => $organization->id,
            'user_id' => $customer->id,
            'role' => 'owner',
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $customer->createToken('support')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $organization->id];

        $this->withHeaders($headers)->getJson('/api/support/conversation')->assertOk();

        // The dedicated support-messages limiter allows 10 posts per minute.
        for ($i = 0; $i < 10; $i++) {
            $this->withHeaders($headers)->postJson('/api/support/conversation/messages', ['message' => 'Message '.$i])->assertOk();
        }

        $this->withHeaders($headers)->postJson('/api/support/conversation/messages', ['message' => 'Too many messages.'])
            ->assertStatus(429);
    }

    public function test_message_is_saved_when_realtime_is_unavailable(): void
    {
        // Broadcasting is best-effort: with the realtime event faked away the
        // message must still be persisted and the API must stay successful.
        Event::fake([SupportMessageCreated::class]);

        [$customer, $organization] = $this->customerWithOrganization();
        $token = $customer->createToken('support')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$token, 'X-Tenant-ID' => (string) $organization->id];

        $this->withHeaders($headers)->getJson('/api/support/conversation')->assertOk();
        $this->withHeaders($headers)->postJson('/api/support/conversation/messages', ['message' => 'Saved even when realtime is down.'])
            ->assertOk()
            ->assertJsonPath('data.message', 'Saved even when realtime is down.');
        $this->assertDatabaseHas('support_messages', ['message' => 'Saved even when realtime is down.']);
    }

    private function customerWithOrganization(string $name = 'Customer workspace'): array
    {
        $customer = User::factory()->create();
        $organization = Tenant::create([
            'name' => $name,
            'slug' => strtolower(str_replace(' ', '-', $name)).'-'.uniqid(),
            'database_name' => 'support-'.uniqid(),
            'owner_id' => $customer->id,
            'status' => Tenant::STATUS_ACTIVE,
        ]);
        DB::table('tenant_users')->insert([
            'tenant_id' => $organization->id,
            'user_id' => $customer->id,
            'role' => 'owner',
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$customer, $organization];
    }
}
