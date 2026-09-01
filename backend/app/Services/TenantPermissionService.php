<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class TenantPermissionService
{
    public function registry(): array { return config('permissions.registry', []); }

    public function userCan(User $user, string $permission, ?Tenant $tenant = null): bool
    {
        if (! array_key_exists($permission, $this->registry()) || ! $tenant || ! $tenant->isActive()) return false;
        if ($user->role === User::ROLE_SUPER_ADMIN) return true;
        $membership = DB::table('tenant_users')->where('tenant_id', $tenant->id)->where('user_id', $user->id)->first();
        if (! $membership) return false;
        if ($membership->role === 'owner') return true;

        $direct = DB::table('tenant_user_permissions')
            ->join('permissions', 'permissions.id', '=', 'tenant_user_permissions.permission_id')
            ->where('tenant_id', $tenant->id)->where('user_id', $user->id)->where('permissions.key', $permission)
            ->value('granted');
        if ($direct !== null) return (int) $direct === 1;

        return in_array($permission, config('permissions.roles.'.$membership->role, []), true);
    }

    public function authorize(User $user, string $permission, ?Tenant $tenant = null): void
    {
        if (! $this->userCan($user, $permission, $tenant)) throw new AccessDeniedHttpException('You do not have permission to perform this action.');
    }

    public function permissionsFor(User $user, Tenant $tenant): Collection
    {
        if (! $tenant->isActive() || ! DB::table('tenant_users')->where('tenant_id', $tenant->id)->where('user_id', $user->id)->exists()) return collect();
        return collect(array_keys($this->registry()))->filter(fn (string $key) => $this->userCan($user, $key, $tenant))->values();
    }

    public function directPermissions(User $user, Tenant $tenant): Collection
    {
        return DB::table('tenant_user_permissions')->join('permissions', 'permissions.id', '=', 'tenant_user_permissions.permission_id')
            ->where('tenant_id', $tenant->id)->where('user_id', $user->id)->where('granted', true)->pluck('permissions.key');
    }

    public function assignablePermissions(User $actor, Tenant $tenant): Collection
    {
        return $this->permissionsFor($actor, $tenant)->reject(fn (string $key) => in_array($key, ['organization.update', 'billing.manage'], true))->values();
    }
}
