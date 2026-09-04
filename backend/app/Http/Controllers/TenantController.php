<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\TenantService;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Exceptions\OrganizationCreationException;
use App\Services\ActivityLogService;
use App\Services\TenantPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;
use App\Services\PlanEntitlementService;

class TenantController extends Controller
{
    protected TenantService $tenantService;

    public function __construct(
        TenantService $tenantService,
        private readonly ActivityLogService $activityLogService,
        private readonly TenantPermissionService $tenantPermissionService,
        private readonly PlanEntitlementService $entitlements,
    )
    {
        $this->tenantService = $tenantService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->role === User::ROLE_SUPER_ADMIN
            ? Tenant::query()
            : $request->user()->tenants();

        $tenants = $query
            ->where('tenants.status', Tenant::STATUS_ACTIVE)
            ->get(['tenants.id', 'tenants.name', 'tenants.slug', 'tenants.status', 'tenants.owner_id', 'tenants.trial_ends_at', 'tenants.created_at'])
            ->map(fn (Tenant $tenant) => $this->serializeTenant($tenant, $request->user()));

        return response()->json(['data' => $tenants]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->user()->role === User::ROLE_SUPER_ADMIN) {
            return response()->json([
                'message' => 'Super admins manage existing organizations and cannot create organizations.',
                'code' => 'super_admin_creation_forbidden',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'industry' => ['required', 'string', Rule::in([
                'healthcare', 'logistics', 'ecommerce', 'real-estate', 'education',
                'hospitality', 'professional-services', 'other',
            ])],
            'website' => ['required', 'url', 'max:2048'],
            'contact_email' => ['required', 'email', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();

        // Fast authorization response for normal users. TenantService repeats
        // the check inside its locked transaction to protect against races.
        if (! Subscription::query()->where('user_id', $user->id)->whereIn('status', ['active', 'trialing'])->exists()) {
            return response()->json([
                'message' => 'Please choose a plan before creating an organization.',
                'code' => 'subscription_required',
            ], 403);
        }

        try {
            $tenant = $this->tenantService->create($validated, $user);
        } catch (OrganizationCreationException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'code' => $exception->errorCode,
                ...$exception->details,
            ], $exception->status);
        } catch (Throwable $exception) {
            Log::error('Organization creation failed.', [
                'user_id' => $user->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'We could not create the organization. Please try again.',
                'code' => 'organization_creation_failed',
            ], 500);
        }

        $this->activityLogService->log(
            action: 'tenant.organization.created',
            description: "Organization created: {$tenant->name}",
            properties: [
                'tenant_id' => $tenant->id,
                'organization_name' => $tenant->name,
                'industry' => $validated['industry'],
                'website' => $validated['website'],
                'contact_email' => $validated['contact_email'],
            ],
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
            tenantId: $tenant->id,
        );

        return response()->json([
            'data' => $this->serializeTenant($tenant->fresh(), $request->user()),
        ], 201);
    }

    public function show(Request $request, string $tenant): JsonResponse
    {
        // IdentifyTenant has already resolved and authorized this central tenant.
        $resolvedTenant = $request->attributes->get('tenant') ?? Tenant::findOrFail($tenant);

        return response()->json([
            'data' => $this->serializeTenant($resolvedTenant, $request->user()),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant') ?? Tenant::findOrFail($id);

        if (!$request->user()->isOwnerOfTenant($tenant)) {
            return response()->json(['message' => 'Only the organization owner can delete this organization.'], 403);
        }

        $this->tenantService->delete($tenant);

        return response()->json(['message' => 'Organization successfully deleted.']);
    }

    public function setPrimary(Request $request, string $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant') ?? Tenant::findOrFail($id);
        abort_unless($request->user()->isOwnerOfTenant($tenant), 403, 'Only the organization owner can select the primary organization.');
        $this->tenantService->setPrimary($tenant, $request->user());
        $this->activityLogService->logFromRequest('tenant.organization.primary_selected', 'Primary organization selected.', [], $request);
        return response()->json(['message' => 'Primary organization selected.']);
    }

    public function schedulePermanentDeletion(Request $request, string $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant') ?? Tenant::findOrFail($id);
        abort_unless($request->user()->isOwnerOfTenant($tenant), 403, 'Only the organization owner can schedule deletion.');
        $validated = $request->validate(['organization_name' => ['required', 'string']]);
        abort_unless(hash_equals($tenant->name, $validated['organization_name']), 422, 'Organization name confirmation does not match.');
        $this->tenantService->schedulePermanentDeletion($tenant);
        $this->activityLogService->logFromRequest('tenant.organization.deletion_scheduled', 'Organization permanent deletion scheduled.', [], $request);
        return response()->json(['message' => 'Organization deletion scheduled after the 30-day grace period.', 'deletes_at' => $tenant->fresh()->permanent_deletion_scheduled_at?->toISOString()]);
    }

    public function permanentlyDelete(Request $request, string $id): JsonResponse
    {
        $tenant = $request->attributes->get('tenant') ?? Tenant::findOrFail($id);
        abort_unless($request->user()->isOwnerOfTenant($tenant), 403, 'Only the organization owner can permanently delete this organization.');
        $validated = $request->validate(['organization_name' => ['required', 'string']]);
        abort_unless(hash_equals($tenant->name, $validated['organization_name']), 422, 'Organization name confirmation does not match.');
        abort_unless($tenant->permanent_deletion_scheduled_at && $tenant->permanent_deletion_scheduled_at->isPast(), 409, 'The deletion grace period has not ended.');
        $tenantId = $tenant->id;
        $this->tenantService->permanentlyDelete($tenant);
        $this->activityLogService->logFromRequest('tenant.organization.deleted_permanently', "Organization {$tenantId} permanently deleted.", [], $request);
        return response()->json(['message' => 'Organization permanently deleted.']);
    }

    private function serializeTenant(Tenant $tenant, $user): array
    {
        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'status' => $tenant->status,
            'role' => $user->role === User::ROLE_SUPER_ADMIN
                ? User::ROLE_SUPER_ADMIN
                : ($tenant->pivot?->role ?? $user->getRoleInTenant($tenant)),
            'permissions' => $this->tenantPermissionService->permissionsFor($user, $tenant)->values(),
            'owner_id' => $tenant->owner_id,
            'is_primary' => (bool) $tenant->is_primary,
            'archived_at' => $tenant->archived_at?->toISOString(),
            'permanent_deletion_scheduled_at' => $tenant->permanent_deletion_scheduled_at?->toISOString(),
            'trial_ends_at' => $tenant->trial_ends_at?->toISOString(),
            'created_at' => $tenant->created_at?->toISOString(),
        ];
    }
}
