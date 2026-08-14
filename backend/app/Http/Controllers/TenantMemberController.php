<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Services\ActivityLogService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TenantMemberController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLogService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $members = $tenant->users()
            ->select('users.id', 'users.name', 'users.email', 'users.avatar_url')
            ->get()
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
                'role' => $user->pivot->role,
                'joined_at' => $user->pivot->joined_at
                    ? CarbonImmutable::parse($user->pivot->joined_at)->toISOString()
                    : null,
            ]);

        return response()->json(['data' => $members]);
    }

    public function updateRole(Request $request, int $user): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $actorRole = $this->actorRole($request, $tenant);
        $validated = $request->validate(['role' => ['required', Rule::in(['admin', 'member'])]]);
        $target = $this->targetMember($tenant, $user);
        $targetRole = $target->pivot->role;

        if ($target->id === $request->user()->id || $this->isOwner($tenant, $target->id, $targetRole)) {
            return response()->json(['message' => 'The tenant owner and your own role cannot be changed here.'], 403);
        }

        if ($actorRole === 'admin' && ($targetRole !== 'member' || $validated['role'] !== 'member')) {
            return response()->json(['message' => 'Admins can only manage members.'], 403);
        }

        if ($targetRole === $validated['role']) {
            return response()->json(['message' => 'The member already has this role.']);
        }

        DB::transaction(function () use ($tenant, $target, $targetRole, $validated, $request) {
            DB::table('tenant_users')->where('tenant_id', $tenant->id)->where('user_id', $target->id)->lockForUpdate()->first();
            $tenant->users()->updateExistingPivot($target->id, ['role' => $validated['role']]);
            $this->logChange('team.member.role_changed', $request, $tenant, $target->id, [
                'old_role' => $targetRole,
                'new_role' => $validated['role'],
            ]);
        });

        return response()->json(['message' => 'Member role updated.']);
    }

    public function destroy(Request $request, int $user): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $actorRole = $this->actorRole($request, $tenant);
        $target = $this->targetMember($tenant, $user);
        $targetRole = $target->pivot->role;

        if ($target->id === $request->user()->id || $this->isOwner($tenant, $target->id, $targetRole)) {
            return response()->json(['message' => 'The tenant owner and your own membership cannot be removed here.'], 403);
        }

        if ($actorRole === 'admin' && $targetRole !== 'member') {
            return response()->json(['message' => 'Admins can only remove members.'], 403);
        }

        DB::transaction(function () use ($tenant, $target, $request) {
            DB::table('tenant_users')->where('tenant_id', $tenant->id)->where('user_id', $target->id)->lockForUpdate()->first();
            $tenant->users()->detach($target->id);
            $this->logChange('team.member.removed', $request, $tenant, $target->id);
        });

        return response()->json(['message' => 'Member removed from the organization.']);
    }

    private function resolvedTenant(Request $request): Tenant
    {
        return $request->attributes->get('tenant') ?? abort(404, 'Tenant not found.');
    }

    private function actorRole(Request $request, Tenant $tenant): string
    {
        $role = $request->user()->getRoleInTenant($tenant);
        if (!$role) {
            abort(403, 'You do not have access to this organization.');
        }

        return $role;
    }

    private function targetMember(Tenant $tenant, int $user)
    {
        return $tenant->users()->where('users.id', $user)->firstOrFail();
    }

    private function isOwner(Tenant $tenant, int $userId, string $membershipRole): bool
    {
        return $membershipRole === 'owner' || $tenant->owner_id === $userId;
    }

    private function logChange(string $action, Request $request, Tenant $tenant, int $targetUserId, array $properties = []): void
    {
        $this->activityLogService->logFromRequest(
            action: $action,
            description: 'Tenant team membership changed.',
            properties: array_merge([
                'tenant_id' => $tenant->id,
                'actor_user_id' => $request->user()->id,
                'target_user_id' => $targetUserId,
            ], $properties),
            request: $request,
        );
    }
}
