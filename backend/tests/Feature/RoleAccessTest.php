<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['auth:sanctum', 'admin'])
            ->get('/api/admin/rbac-test', fn () => response()->json(['ok' => true]));
    }

    public function test_normal_user_cannot_access_admin_routes(): void
    {
        $user = User::factory()->create([
            'role' => User::ROLE_USER,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/rbac-test')
            ->assertForbidden();
    }

    public function test_admin_and_super_admin_can_access_admin_routes(): void
    {
        foreach (User::ADMIN_ROLES as $role) {
            $user = User::factory()->create([
                'role' => $role,
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            $this->withHeader('Authorization', 'Bearer '.$token)
                ->getJson('/api/admin/rbac-test')
                ->assertOk()
                ->assertJsonPath('ok', true);
        }
    }
}
