<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminContactMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_user_cannot_access_contact_messages(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/contact-messages')
            ->assertForbidden();
    }

    public function test_admin_can_search_and_paginate_contact_messages(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        ContactMessage::create([
            'name' => 'Alice Admin',
            'email' => 'alice@example.com',
            'subject' => 'Billing question',
            'message' => 'I need help with billing.',
            'status' => ContactMessage::STATUS_NEW,
        ]);

        ContactMessage::create([
            'name' => 'Bob User',
            'email' => 'bob@example.com',
            'subject' => 'Product feedback',
            'message' => 'I have a feature idea.',
            'status' => ContactMessage::STATUS_READ,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/contact-messages?search=Billing&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'alice@example.com')
            ->assertJsonPath('data.0.status', ContactMessage::STATUS_NEW)
            ->assertJsonPath('per_page', 1)
            ->assertJsonPath('total', 1);
    }

    public function test_super_admin_can_view_update_status_and_delete_contact_message(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $message = ContactMessage::create([
            'name' => 'Reply Needed',
            'email' => 'reply@example.com',
            'subject' => 'Support',
            'message' => 'Please reply soon.',
            'status' => ContactMessage::STATUS_NEW,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/admin/contact-messages/{$message->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Please reply soon.');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/contact-messages/{$message->id}/status", [
                'status' => ContactMessage::STATUS_REPLIED,
            ])
            ->assertOk()
            ->assertJsonPath('status', ContactMessage::STATUS_REPLIED);

        $this->assertDatabaseHas('contact_messages', [
            'id' => $message->id,
            'status' => ContactMessage::STATUS_REPLIED,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/admin/contact-messages/{$message->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('contact_messages', [
            'id' => $message->id,
        ]);
    }

    public function test_invalid_contact_message_status_is_rejected(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $message = ContactMessage::create([
            'name' => 'Invalid Status',
            'email' => 'invalid-status@example.com',
            'subject' => 'Status',
            'message' => 'Try an invalid status.',
            'status' => ContactMessage::STATUS_NEW,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/contact-messages/{$message->id}/status", [
                'status' => 'closed',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }
}
