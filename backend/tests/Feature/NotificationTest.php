<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Models\UserSetting;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_only_read_and_update_their_own_notifications(): void
    {
        $user = User::factory()->create(); $other = User::factory()->create();
        Notification::create(['user_id' => $user->id, 'type' => 'security_alert', 'title' => 'Security alert', 'message' => 'Review your account.']);
        $otherNotification = Notification::create(['user_id' => $other->id, 'type' => 'security_alert', 'title' => 'Security alert', 'message' => 'Review your account.']);

        $this->actingAs($user, 'sanctum')->getJson('/api/notifications')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($user, 'sanctum')->postJson("/api/notifications/{$otherNotification->id}/read")->assertNotFound();
        $this->assertDatabaseHas('notifications', ['user_id' => $user->id, 'read_at' => null]);
    }

    public function test_optional_notifications_respect_preferences_but_billing_notifications_are_mandatory(): void
    {
        $user = User::factory()->create();
        UserSetting::create(['user_id' => $user->id, 'email_enabled' => false, 'billing_enabled' => false, 'team_enabled' => false, 'security_enabled' => false, 'marketing_enabled' => false, 'timezone' => 'UTC', 'locale' => 'en']);
        $service = app(NotificationService::class);

        $suppressed = $service->create($user->id, 'team_membership_changed', 'Team access updated', 'Your access changed.');
        $billing = $service->create($user->id, 'refund_completed', 'Refund completed', 'Your refund is complete.');

        $this->assertFalse($suppressed->exists);
        $this->assertTrue($billing->exists);
        $this->assertDatabaseHas('notifications', ['user_id' => $user->id, 'category' => 'billing', 'mandatory' => 1]);
    }

    public function test_notification_list_supports_safe_category_filter_and_metadata(): void
    {
        $user = User::factory()->create();
        app(NotificationService::class)->refundCompleted($user->id, 10.5, 'USD', 44, 55);

        $this->actingAs($user, 'sanctum')->getJson('/api/notifications?category=billing&limit=1')
            ->assertOk()->assertJsonPath('data.0.action_url', '/dashboard/billing#payment-history')->assertJsonPath('data.0.mandatory', true)->assertJsonPath('meta.returned', 1);
        $this->actingAs($user, 'sanctum')->getJson('/api/notifications?category=not-a-category')->assertUnprocessable();
    }
}
