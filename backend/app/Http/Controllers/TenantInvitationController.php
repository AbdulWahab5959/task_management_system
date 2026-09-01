<?php

namespace App\Http\Controllers;

use App\Mail\TenantInvitationMail;
use App\Models\Tenant;
use App\Models\TenantInvitation;
use App\Services\ActivityLogService;
use App\Services\TenantPermissionService;
use App\Services\NotificationService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class TenantInvitationController extends Controller
{
    private const INVITABLE_ROLES = ['admin', 'member'];

    public function __construct(private readonly ActivityLogService $activityLogService, private readonly TenantPermissionService $permissions, private readonly NotificationService $notifications)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $this->authorizeManager($request, $tenant);

        $invitations = TenantInvitation::query()
            ->where('tenant_id', $tenant->id)
            ->with('inviter:id,name,email')
            ->whereIn('status', [TenantInvitation::STATUS_PENDING, TenantInvitation::STATUS_EXPIRED])
            ->latest()
            ->get()
            ->map(fn (TenantInvitation $invitation) => $this->serializeInvitation($invitation));

        return response()->json(['data' => $invitations]);
    }

    public function pendingForUser(Request $request): JsonResponse
    {
        $email = strtolower(trim((string) $request->user()->email));
        $invitations = TenantInvitation::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where('status', TenantInvitation::STATUS_PENDING)
            ->where('expires_at', '>', now())
            ->with(['tenant:id,name,slug,status', 'inviter:id,name,email'])
            ->latest()
            ->get()
            ->map(fn (TenantInvitation $invitation) => $this->serializeInvitation($invitation));

        return response()->json(['data' => $invitations]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $role = $this->authorizeManager($request, $tenant);
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', Rule::in($role === 'admin' ? ['member'] : self::INVITABLE_ROLES)],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        $assignable = $this->permissions->assignablePermissions($request->user(), $tenant);
        $requestedPermissions = collect($validated['permissions'] ?? [])->unique()->values();
        if ($requestedPermissions->diff($assignable)->isNotEmpty()) {
            return response()->json(['message' => 'One or more permissions cannot be assigned by your account.'], 422);
        }

        $email = strtolower(trim($validated['email']));
        if (strtolower((string) $request->user()->email) === $email) {
            return response()->json(['message' => 'You cannot invite your own account.'], 422);
        }

        if ($tenant->users()->whereRaw('LOWER(users.email) = ?', [$email])->exists()) {
            return response()->json(['message' => 'This user is already a member of this organization.'], 409);
        }

        $existing = TenantInvitation::query()
            ->where('tenant_id', $tenant->id)
            ->where('email', $email)
            ->where('status', TenantInvitation::STATUS_PENDING)
            ->latest()
            ->first();

        if ($existing && $existing->isPending()) {
            return response()->json(['message' => 'A pending invitation already exists for this email.'], 409);
        }

        if ($existing && !$existing->isPending()) {
            $existing->update(['status' => TenantInvitation::STATUS_EXPIRED]);
        }

        $token = bin2hex(random_bytes(32));
        $invitation = TenantInvitation::create([
            'tenant_id' => $tenant->id,
            'email' => $email,
            'role' => $validated['role'],
            'permissions' => $requestedPermissions->all(),
            'token_hash' => hash('sha256', $token),
            'invited_by' => $request->user()->id,
            'status' => TenantInvitation::STATUS_PENDING,
            'expires_at' => now()->addDays(config('team.invitation_expiry_days', 7)),
        ]);

        $this->logEvent('team.invitation.created', $request, $invitation);
        $recipient = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if ($recipient) $this->notifications->teamInvitation($recipient->id, $tenant->id, $tenant->name, $invitation->id);
        $mailSent = $this->sendInvitation($invitation, $token);

        return response()->json([
            'data' => $this->serializeInvitation($invitation->load('inviter:id,name,email')),
            'message' => $mailSent
                ? 'Invitation sent.'
                : 'Invitation created, but email delivery failed. You can resend it later.',
        ], $mailSent ? 201 : 202);
    }

    public function resend(Request $request, int $invitation): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $this->authorizeManager($request, $tenant);
        $record = TenantInvitation::query()->where('tenant_id', $tenant->id)->findOrFail($invitation);

        if (!$record->isPending()) {
            return response()->json(['message' => 'Only pending invitations can be resent.'], 422);
        }

        $token = bin2hex(random_bytes(32));
        $record->update([
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDays(config('team.invitation_expiry_days', 7)),
        ]);

        $this->logEvent('team.invitation.resent', $request, $record);
        $mailSent = $this->sendInvitation($record, $token);

        return response()->json([
            'data' => $this->serializeInvitation($record->fresh('inviter:id,name,email')),
            'message' => $mailSent
                ? 'Invitation resent.'
                : 'Invitation remains pending, but email delivery failed.',
        ], $mailSent ? 200 : 202);
    }

    public function revoke(Request $request, int $invitation): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $this->authorizeManager($request, $tenant);
        $record = TenantInvitation::query()->where('tenant_id', $tenant->id)->findOrFail($invitation);

        if (!$record->isPending()) {
            return response()->json(['message' => 'Only pending invitations can be revoked.'], 422);
        }

        $record->update([
            'status' => TenantInvitation::STATUS_REVOKED,
            'revoked_at' => now(),
        ]);
        $this->logEvent('team.invitation.revoked', $request, $record);

        return response()->json(['message' => 'Invitation revoked.']);
    }

    public function preview(string $token): JsonResponse
    {
        $record = $this->findByToken($token);
        if (!$record || !$record->isPending()) {
            return response()->json(['message' => 'This invitation is no longer available.'], 404);
        }

        return response()->json([
            'data' => [
                'tenant_id' => $record->tenant_id,
                'email' => $record->email,
                'role' => $record->role,
                'tenant_name' => $record->tenant->name,
                'inviter_name' => $record->inviter?->name,
                'expires_at' => $record->expires_at->toISOString(),
            ],
        ]);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $record = $this->findByToken($token);
        if (!$record) {
            return response()->json(['message' => 'This invitation is no longer available.'], 422);
        }

        return $this->acceptRecord($request, $record);
    }

    public function acceptForUser(Request $request, int $invitation): JsonResponse
    {
        $record = TenantInvitation::query()->with(['tenant', 'inviter:id,name,email'])->find($invitation);
        if (!$record) {
            return response()->json(['message' => 'This invitation is no longer available.'], 422);
        }

        if ($record->status === TenantInvitation::STATUS_PENDING && $record->hasExpired()) {
            $record->update(['status' => TenantInvitation::STATUS_EXPIRED]);
        }

        return $this->acceptRecord($request, $record->fresh(['tenant', 'inviter:id,name,email']));
    }

    private function acceptRecord(Request $request, TenantInvitation $record): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Authentication is required to accept an invitation.'], 401);
        }

        if (strtolower((string) $user->email) !== strtolower($record->email)) {
            return response()->json(['message' => 'This invitation was issued to a different email address.'], 403);
        }

        if ($record->status === TenantInvitation::STATUS_ACCEPTED) {
            return response()->json(['message' => 'This invitation has already been accepted.']);
        }

        if (!$record->isPending()) {
            return response()->json(['message' => 'This invitation is no longer available.'], 422);
        }

        if (!$user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Verify your email address before accepting this invitation.'], 403);
        }

        $result = DB::transaction(function () use ($record, $user, $request) {
            $locked = TenantInvitation::query()->lockForUpdate()->find($record->id);
            if (!$locked || !$locked->isPending()) {
                return ['message' => 'This invitation has already been processed.', 'status' => 200];
            }

            if (!$locked->tenant->isActive()) {
                return ['message' => 'This organization is not available.', 'status' => 403];
            }

            if ($locked->tenant->users()->where('users.id', $user->id)->exists()) {
                $locked->update(['status' => TenantInvitation::STATUS_ACCEPTED, 'accepted_at' => now()]);
                return ['message' => 'You are already a member of this organization.', 'status' => 200];
            }

            $locked->tenant->users()->attach($user->id, [
                'role' => $locked->role,
                'invited_by' => $locked->invited_by,
                'invited_at' => $locked->created_at,
                'joined_at' => now(),
            ]);
            $permissionIds = DB::table('permissions')->whereIn('key', $locked->permissions ?? [])->pluck('id');
            foreach ($permissionIds as $permissionId) {
                DB::table('tenant_user_permissions')->insert([
                    'tenant_id' => $locked->tenant_id,
                    'user_id' => $user->id,
                    'permission_id' => $permissionId,
                    'granted' => true,
                    'granted_by' => $locked->invited_by,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $locked->update(['status' => TenantInvitation::STATUS_ACCEPTED, 'accepted_at' => now()]);

            $this->logEvent('team.invitation.accepted', $request, $locked, $user->id);
            $this->notifications->teamMembershipChanged($user->id, $locked->tenant_id, "You joined {$locked->tenant->name}.", "invitation-accepted:{$locked->id}");

            return ['message' => 'Invitation accepted.', 'status' => 200];
        });

        return response()->json([
            'message' => $result['message'],
            'tenant_id' => $record->tenant_id,
        ], $result['status']);
    }

    public function rejectForUser(Request $request, int $invitation): JsonResponse
    {
        $record = TenantInvitation::query()->find($invitation);
        if (!$record || !$record->isPending()) {
            return response()->json(['message' => 'This invitation is no longer available.'], 422);
        }

        if (strtolower((string) $request->user()->email) !== strtolower($record->email)) {
            return response()->json(['message' => 'This invitation was issued to a different email address.'], 403);
        }

        $record->update([
            'status' => TenantInvitation::STATUS_REJECTED,
            'rejected_at' => now(),
        ]);
        $this->logEvent('team.invitation.rejected', $request, $record);

        return response()->json(['message' => 'Invitation rejected.']);
    }

    public function reject(Request $request, string $token): JsonResponse
    {
        $record = $this->findByToken($token);
        if (!$record || !$record->isPending()) {
            return response()->json(['message' => 'This invitation is no longer available.'], 422);
        }

        if (strtolower((string) $request->user()->email) !== strtolower($record->email)) {
            return response()->json(['message' => 'This invitation was issued to a different email address.'], 403);
        }

        $record->update([
            'status' => TenantInvitation::STATUS_REJECTED,
            'rejected_at' => now(),
        ]);
        $this->logEvent('team.invitation.rejected', $request, $record);

        return response()->json(['message' => 'Invitation rejected.']);
    }

    private function resolvedTenant(Request $request): Tenant
    {
        return $request->attributes->get('tenant') ?? abort(404, 'Tenant not found.');
    }

    private function authorizeManager(Request $request, Tenant $tenant): string
    {
        if ($request->user()->role === \App\Models\User::ROLE_SUPER_ADMIN) {
            return 'owner';
        }

        $role = $request->user()->getRoleInTenant($tenant);
        if (!$role) {
            abort(403, 'You do not have permission to manage invitations.');
        }

        return $role;
    }

    private function findByToken(string $token): ?TenantInvitation
    {
        $record = TenantInvitation::query()->with(['tenant', 'inviter:id,name,email'])
            ->where('token_hash', hash('sha256', $token))
            ->first();

        if ($record?->status === TenantInvitation::STATUS_PENDING && $record->hasExpired()) {
            $record->update(['status' => TenantInvitation::STATUS_EXPIRED]);
        }

        return $record;
    }

    private function sendInvitation(TenantInvitation $invitation, string $token): bool
    {
        try {
            Mail::to($invitation->email)->send(new TenantInvitationMail($invitation->load(['tenant', 'inviter']), $token));
            return true;
        } catch (\Throwable $exception) {
            Log::error('Tenant invitation email delivery failed.', [
                'invitation_id' => $invitation->id,
                'tenant_id' => $invitation->tenant_id,
                'error' => $exception->getMessage(),
            ]);
            return false;
        }
    }

    private function logEvent(string $action, Request $request, TenantInvitation $invitation, ?int $targetUserId = null): void
    {
        $this->activityLogService->logFromRequest(
            action: $action,
            description: 'Team invitation event.',
            properties: [
                'tenant_id' => $invitation->tenant_id,
                'invitation_id' => $invitation->id,
                'role' => $invitation->role,
                'permissions' => $invitation->permissions ?? [],
                'target_user_id' => $targetUserId,
            ],
            request: $request,
        );
    }

    private function serializeInvitation(TenantInvitation $invitation): array
    {
        return [
            'id' => $invitation->id,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'permissions' => $invitation->permissions ?? [],
            'status' => $invitation->effectiveStatus(),
            'invited_by' => $invitation->inviter ? [
                'id' => $invitation->inviter->id,
                'name' => $invitation->inviter->name,
                'email' => $invitation->inviter->email,
            ] : null,
            'expires_at' => $invitation->expires_at->toISOString(),
            'created_at' => $invitation->created_at->toISOString(),
            'tenant' => $invitation->relationLoaded('tenant') && $invitation->tenant ? [
                'id' => $invitation->tenant->id,
                'name' => $invitation->tenant->name,
                'slug' => $invitation->tenant->slug,
            ] : null,
        ];
    }
}
