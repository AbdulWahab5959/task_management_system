<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class UserController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', Rule::in(User::ROLES)],
            'status' => ['nullable', 'string', Rule::in(User::STATUSES)],
            'verified' => ['nullable', 'string', Rule::in(['verified', 'unverified'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $search = $validated['search'] ?? null;
        $perPage = $validated['per_page'] ?? 10;

        $users = User::query()
            ->when($search, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($validated['role'] ?? null, fn ($query, string $role) => $query->where('role', $role))
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($validated['verified'] ?? null, function ($query, string $verified) {
                $verified === 'verified'
                    ? $query->whereNotNull('email_verified_at')
                    : $query->whereNull('email_verified_at');
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json($users);
    }

    public function show(User $user)
    {
        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $this->ensureCanManageUser($request->user(), $user);
        $admin = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        $changes = [];

        if (array_key_exists('name', $validated) && $validated['name'] !== $user->name) {
            $changes['name'] = ['old' => $user->name, 'new' => $validated['name']];
            $user->name = $validated['name'];
        }

        if (array_key_exists('email', $validated) && $validated['email'] !== $user->email) {
            $changes['email'] = ['old' => $user->email, 'new' => $validated['email']];
            $user->email = $validated['email'];
            $user->email_verified_at = null;
        }

        $user->save();

        if (!empty($changes)) {
            $this->activityLogService->log(
                action: 'admin_user_update',
                description: "Admin updated user: {$user->email}",
                properties: [
                    'admin_id' => $admin->id,
                    'admin_email' => $admin->email,
                    'target_user_id' => $user->id,
                    'target_user_email' => $user->email,
                    'changes' => $changes,
                ],
                userId: $admin->id,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
            );
        }

        return response()->json($user->refresh());
    }

    public function updateStatus(Request $request, User $user)
    {
        $this->ensureCanManageUser($request->user(), $user);
        $admin = $request->user();

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(User::STATUSES)],
        ]);

        if ($admin->is($user) && $validated['status'] === User::STATUS_INACTIVE) {
            throw ValidationException::withMessages([
                'status' => ['You cannot deactivate your own account.'],
            ]);
        }

        $oldStatus = $user->status;
        $user->update([
            'status' => $validated['status'],
        ]);

        if ($validated['status'] === User::STATUS_INACTIVE) {
            $user->tokens()->delete();
        }

        $this->activityLogService->log(
            action: 'admin_user_update',
            description: "Admin updated user status: {$user->email} ({$oldStatus} → {$validated['status']})",
            properties: [
                'admin_id' => $admin->id,
                'admin_email' => $admin->email,
                'target_user_id' => $user->id,
                'target_user_email' => $user->email,
                'changes' => ['status' => ['old' => $oldStatus, 'new' => $validated['status']]],
            ],
            userId: $admin->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json($user->refresh());
    }

    public function updateRole(Request $request, User $user)
    {
        $this->ensureCanManageUser($request->user(), $user);
        $admin = $request->user();

        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(User::ROLES)],
        ]);

        if ($admin->is($user)) {
            throw ValidationException::withMessages([
                'role' => ['You cannot change your own role.'],
            ]);
        }

        if ($validated['role'] === User::ROLE_SUPER_ADMIN && $admin->role !== User::ROLE_SUPER_ADMIN) {
            abort(Response::HTTP_FORBIDDEN, 'Only a super admin can assign the super admin role.');
        }

        $oldRole = $user->role;
        $user->update([
            'role' => $validated['role'],
        ]);

        $this->activityLogService->log(
            action: 'admin_user_update',
            description: "Admin updated user role: {$user->email} ({$oldRole} → {$validated['role']})",
            properties: [
                'admin_id' => $admin->id,
                'admin_email' => $admin->email,
                'target_user_id' => $user->id,
                'target_user_email' => $user->email,
                'changes' => ['role' => ['old' => $oldRole, 'new' => $validated['role']]],
            ],
            userId: $admin->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json($user->refresh());
    }

    private function ensureCanManageUser(User $actor, User $target): void
    {
        if ($target->role === User::ROLE_SUPER_ADMIN && $actor->role !== User::ROLE_SUPER_ADMIN) {
            abort(Response::HTTP_FORBIDDEN, 'Only a super admin can manage a super admin.');
        }
    }
}