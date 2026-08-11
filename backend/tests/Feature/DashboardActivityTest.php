<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_dashboard_activity(): void
    {
        $this->getJson('/api/dashboard/activity')
            ->assertUnauthorized();
    }

    public function test_normal_user_only_sees_their_own_activity_logs(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
        ]);

        $otherUser = User::factory()->create([
            'role' => User::ROLE_USER,
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'login',
            'description' => 'User logged in.',
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'profile_update',
            'description' => 'User updated their profile.',
        ]);

        // This log belongs to a different user and should never be exposed.
        ActivityLog::create([
            'user_id' => $otherUser->id,
            'action' => 'login',
            'description' => 'Another user logged in.',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/dashboard/activity')
            ->assertOk();

        $data = $response->json('data');

        $this->assertCount(2, $data);

        foreach ($data as $log) {
            $this->assertEquals($user->id, $log['user_id']);
        }

        $this->assertTrue(
            collect($data)->pluck('description')->doesntContain('Another user logged in.')
        );
    }

    public function test_dashboard_activity_exposes_contact_email_for_contact_form_log(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
        ]);

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'contact_form_submit',
            'description' => 'Contact form submitted by sender@example.com: Billing help',
            'properties' => [
                'email' => 'sender@example.com',
                'name' => 'Sender Name',
                'subject' => 'Billing help',
            ],
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/dashboard/activity')
            ->assertOk()
            ->assertJsonPath('data.0.contact_email', 'sender@example.com')
            ->assertJsonPath('data.0.description', 'Contact form submitted by sender@example.com: Billing help');
    }
}
