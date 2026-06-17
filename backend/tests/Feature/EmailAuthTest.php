<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class EmailAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_sends_verification_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Verify Me',
            'email' => 'verify@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('requires_email_verification', true);

        $user = User::where('email', 'verify@example.com')->firstOrFail();

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_verified_user_can_access_verified_only_route(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/verified-only');

        $response->assertOk()
            ->assertJsonPath('message', 'Verified email access granted.');
    }

    public function test_unverified_user_cannot_access_verified_only_route(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/verified-only')
            ->assertForbidden();
    }

    public function test_user_can_resend_verification_email(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('message', 'Verification email sent.');

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_forgot_password_sends_reset_email(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'reset@example.com',
        ]);

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'reset@example.com',
        ])->assertOk()
            ->assertJsonPath('message', 'If this email exists, a password reset link has been sent.');

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_reset_password_works_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'change@example.com',
            'password' => Hash::make('password123'),
        ]);

        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'change@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk()
            ->assertJsonPath('message', 'Your password has been reset successfully.');

        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
    }

    public function test_reset_password_fails_with_invalid_token(): void
    {
        User::factory()->create([
            'email' => 'invalid-token@example.com',
        ]);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => 'invalid-token@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_verification_resend_is_rate_limited(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('auth_token')->plainTextToken;

        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->withHeader('Authorization', 'Bearer '.$token)
                ->postJson('/api/auth/email/verification-notification');
        }

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/email/verification-notification')
            ->assertStatus(429);
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson('/api/auth/forgot-password', [
                'email' => 'limit@example.com',
            ]);
        }

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'limit@example.com',
        ])->assertStatus(429);
    }
}