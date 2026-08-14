<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_get_their_settings(): void
    {
        $user = User::factory()->create();
        UserSetting::create([
            'user_id' => $user->id,
            'email_enabled' => true,
            'team_enabled' => false,
            'marketing_enabled' => true,
            'timezone' => 'Asia/Karachi',
            'locale' => 'en',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/settings/user')
            ->assertOk()
            ->assertJsonPath('data.notifications.email_enabled', true)
            ->assertJsonPath('data.notifications.team_enabled', false)
            ->assertJsonPath('data.notifications.marketing_enabled', true)
            ->assertJsonPath('data.preferences.timezone', 'Asia/Karachi')
            ->assertJsonPath('data.preferences.locale', 'en')
            ->assertJsonPath('data.security.two_factor_status', 'coming_soon');
    }

    public function test_authenticated_user_can_update_their_settings(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', [
                'email_enabled' => false,
                'team_enabled' => false,
                'marketing_enabled' => true,
                'timezone' => 'Asia/Karachi',
                'locale' => 'en',
            ])
            ->assertOk()
            ->assertJsonPath('data.notifications.email_enabled', false)
            ->assertJsonPath('data.notifications.team_enabled', false)
            ->assertJsonPath('data.notifications.marketing_enabled', true)
            ->assertJsonPath('data.preferences.timezone', 'Asia/Karachi');
    }

    public function test_canonical_notification_names_are_persisted_and_returned(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', [
                'email_notifications_enabled' => false,
                'team_notifications_enabled' => false,
                'marketing_emails_enabled' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.notifications.email_notifications_enabled', false)
            ->assertJsonPath('data.notifications.team_notifications_enabled', false)
            ->assertJsonPath('data.notifications.marketing_emails_enabled', true);

        $this->assertDatabaseHas('user_settings', [
            'user_id' => $user->id,
            'email_enabled' => false,
            'team_enabled' => false,
            'marketing_enabled' => true,
        ]);
    }

    public function test_unauthenticated_user_gets_401(): void
    {
        $this->getJson('/api/settings/user')->assertUnauthorized();
        $this->putJson('/api/settings/user', ['email_enabled' => false])->assertUnauthorized();
    }

    public function test_user_cannot_change_another_users_settings(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        UserSetting::create(['user_id' => $other->id, 'email_enabled' => true, 'timezone' => 'UTC', 'locale' => 'en']);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', [
                'user_id' => $other->id,
                'email_enabled' => false,
            ])
            ->assertOk();

        $this->assertSame(
            1,
            UserSetting::query()->where('user_id', $other->id)->where('email_enabled', true)->count(),
            'Another user settings must remain untouched.',
        );
    }

    public function test_invalid_boolean_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', ['email_enabled' => 'not-a-boolean'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email_enabled');
    }

    public function test_invalid_timezone_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', ['timezone' => 'Invalid/Zone'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('timezone');
    }

    public function test_unsupported_keys_are_ignored(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', ['theme' => 'dark', 'recovery_codes' => ['secret']])
            ->assertOk()
            ->assertJsonMissingPath('data.theme');

        $this->assertDatabaseMissing('user_settings', ['theme' => 'dark']);
    }

    public function test_critical_billing_and_security_alerts_cannot_be_disabled(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', ['billing_enabled' => false])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Critical billing and security alerts cannot be disabled.');

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', ['security_enabled' => false])
            ->assertUnprocessable();
    }

    public function test_settings_do_not_expose_secrets(): void
    {
        $user = User::factory()->create();
        UserSetting::create(['user_id' => $user->id, 'timezone' => 'UTC', 'locale' => 'en']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/settings/user')
            ->assertOk();

        $response->assertJsonMissingPath('data.security.two_factor_secret');
        $response->assertJsonMissingPath('data.security.recovery_codes');
        $response->assertJsonMissingPath('data.preferences.recovery_codes');
    }

    public function test_settings_persist_between_requests(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/user', [
                'email_enabled' => false,
                'marketing_enabled' => true,
                'timezone' => 'America/New_York',
            ])
            ->assertOk();

        // Simulate a fresh session reload.
        $this->actingAs($user, 'sanctum')
            ->getJson('/api/settings/user')
            ->assertOk()
            ->assertJsonPath('data.notifications.email_enabled', false)
            ->assertJsonPath('data.notifications.marketing_enabled', true)
            ->assertJsonPath('data.preferences.timezone', 'America/New_York');
    }
}
