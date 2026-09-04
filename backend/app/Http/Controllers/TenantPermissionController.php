<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\ActivityLogService;
use App\Services\TenantPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TenantPermissionController extends Controller
{
    public function __construct(private readonly TenantPermissionService $permissions, private readonly ActivityLogService $activity) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenant($request); $allowed = $this->permissions->assignablePermissions($request->user(), $tenant);
        $data = collect($this->permissions->registry())->filter(fn ($meta, $key) => $allowed->contains($key))->map(fn ($meta, $key) => ['key' => $key, ...$meta])->groupBy('group')->map->values();
        return response()->json(['data' => $data, 'assignable' => $allowed->values()]);
    }

    public function roles(Request $request): JsonResponse
    {
        $this->permissions->authorize($request->user(), 'members.view', $this->tenant($request));
        return response()->json(['data' => collect(['admin', 'member'])->mapWithKeys(fn ($role) => [$role => ['name' => ucfirst($role), 'permissions' => config('permissions.roles.'.$role, [])]])]);
    }

    public function show(Request $request, int $user): JsonResponse
    {
        $tenant = $this->tenant($request); $this->permissions->authorize($request->user(), 'members.view', $tenant); $target = $this->target($tenant, $user);
        return response()->json(['data' => ['user' => ['id' => $target->id, 'name' => $target->name, 'email' => $target->email], 'role' => $target->pivot->role, 'effective_permissions' => $this->permissions->permissionsFor($target, $tenant)->values(), 'direct_permissions' => $this->permissions->directPermissions($target, $tenant)->values(), 'protected' => in_array($target->pivot->role, ['owner'], true)]]);
    }

    public function update(Request $request, int $user): JsonResponse
    {
        $tenant = $this->tenant($request); $actor = $request->user(); $this->permissions->authorize($actor, 'members.update_role', $tenant); $target = $this->target($tenant, $user);
        if ($target->id === $actor->id || in_array($target->pivot->role, ['owner'], true)) return response()->json(['message' => 'Protected organization accounts cannot be edited.'], 403);
        $allowed = $this->permissions->assignablePermissions($actor, $tenant);
        $validated = $request->validate(['permissions' => ['required', 'array'], 'permissions.*' => ['string', Rule::in($allowed->all())]]);
        DB::transaction(function () use ($tenant, $target, $actor, $validated, $request) {
            DB::table('tenant_user_permissions')->where('tenant_id', $tenant->id)->where('user_id', $target->id)->delete();
            $ids = DB::table('permissions')->whereIn('key', $validated['permissions'])->pluck('id');
            foreach ($ids as $permissionId) DB::table('tenant_user_permissions')->insert(['tenant_id' => $tenant->id, 'user_id' => $target->id, 'permission_id' => $permissionId, 'granted' => true, 'granted_by' => $actor->id, 'created_at' => now(), 'updated_at' => now()]);
            $this->activity->logFromRequest('team.permissions.updated', 'Organization permissions updated.', ['target_user_id' => $target->id, 'permissions' => $validated['permissions']], $request);
        });
        return $this->show($request, $target->id);
    }

    public function reset(Request $request, int $user): JsonResponse
    {
        $tenant = $this->tenant($request); $this->permissions->authorize($request->user(), 'members.update_role', $tenant); $target = $this->target($tenant, $user);
        if ($target->pivot->role === 'owner') return response()->json(['message' => 'The organization owner is protected.'], 403);
        DB::transaction(function () use ($tenant, $target, $request) { DB::table('tenant_user_permissions')->where('tenant_id', $tenant->id)->where('user_id', $target->id)->delete(); $this->activity->logFromRequest('team.permissions.reset', 'Organization permissions reset.', ['target_user_id' => $target->id], $request); });
        return $this->show($request, $target->id);
    }

    private function tenant(Request $request): Tenant { return $request->attributes->get('tenant') ?? abort(404, 'Tenant not found.'); }
    private function target(Tenant $tenant, int $user) { return $tenant->users()->where('users.id', $user)->firstOrFail(); }
}
