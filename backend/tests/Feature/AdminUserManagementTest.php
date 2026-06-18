<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_user_cannot_access_user_management(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_admin_can_search_paginate_and_filter_users(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        User::factory()->create([
            'name' => 'Alice Verified',
            'email' => 'alice@example.com',
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
            'email_verified_at' => now(),
        ]);

        User::factory()->create([
            'name' => 'Bob Unverified',
            'email' => 'bob@example.com',
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_INACTIVE,
            'email_verified_at' => null,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/users?search=alice&role=user&verified=verified&status=active&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'alice@example.com')
            ->assertJsonPath('data.0.role', User::ROLE_USER)
            ->assertJsonPath('data.0.status', User::STATUS_ACTIVE)
            ->assertJsonPath('per_page', 1)
            ->assertJsonPath('total', 1);
    }

    public function test_admin_can_view_and_update_regular_user(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $managedUser = User::factory()->create([
            'name' => 'Managed User',
            'email' => 'managed@example.com',
            'role' => User::ROLE_USER,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/admin/users/{$managedUser->id}")
            ->assertOk()
            ->assertJsonPath('email', 'managed@example.com');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$managedUser->id}", [
                'name' => 'Managed Updated',
                'email' => 'managed-updated@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Managed Updated')
            ->assertJsonPath('email', 'managed-updated@example.com')
            ->assertJsonPath('email_verified_at', null);

        $this->assertDatabaseHas('users', [
            'id' => $managedUser->id,
            'name' => 'Managed Updated',
            'email' => 'managed-updated@example.com',
        ]);
    }

    public function test_admin_can_update_regular_user_status_and_role(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $managedUser = User::factory()->create([
            'role' => User::ROLE_USER,
            'status' => User::STATUS_ACTIVE,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$managedUser->id}/role", [
                'role' => User::ROLE_ADMIN,
            ])
            ->assertOk()
            ->assertJsonPath('role', User::ROLE_ADMIN);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$managedUser->id}/status", [
                'status' => User::STATUS_INACTIVE,
            ])
            ->assertOk()
            ->assertJsonPath('status', User::STATUS_INACTIVE);

        $this->assertDatabaseHas('users', [
            'id' => $managedUser->id,
            'role' => User::ROLE_ADMIN,
            'status' => User::STATUS_INACTIVE,
        ]);
    }

    public function test_admin_cannot_manage_super_admin_or_assign_super_admin_role(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
        ]);

        $superAdmin = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $regularUser = User::factory()->create([
            'role' => User::ROLE_USER,
        ]);

        $token = $admin->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$superAdmin->id}/status", [
                'status' => User::STATUS_INACTIVE,
            ])
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$regularUser->id}/role", [
                'role' => User::ROLE_SUPER_ADMIN,
            ])
            ->assertForbidden();
    }

    public function test_super_admin_can_manage_super_admin_user(): void
    {
        $actor = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $target = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
            'status' => User::STATUS_ACTIVE,
        ]);

        $token = $actor->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/admin/users/{$target->id}/status", [
                'status' => User::STATUS_INACTIVE,
            ])
            ->assertOk()
            ->assertJsonPath('status', User::STATUS_INACTIVE);
    }

    public function test_inactive_user_cannot_log_in(): void
    {
        User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => bcrypt('password123'),
            'status' => User::STATUS_INACTIVE,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'password123',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
