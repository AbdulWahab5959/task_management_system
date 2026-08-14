<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\TenantService;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class TenantController extends Controller
{
    protected TenantService $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function index(Request $request): JsonResponse
    {
        $tenants = $request->user()->tenants()
            ->get(['tenants.id', 'tenants.name', 'tenants.slug', 'tenants.status', 'tenants.owner_id', 'tenants.trial_ends_at', 'tenants.created_at'])
            ->map(fn (Tenant $tenant) => $this->serializeTenant($tenant, $request->user()));

        return response()->json(['data' => $tenants]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $user = $request->user();

        // Authorization: only admins may create an organization without a
        // personal active subscription. Normal users must first purchase an
        // active plan so the workspace is backed by billing.
        if (! in_array($user->role, User::ADMIN_ROLES, true)) {
            $hasActiveSubscription = Subscription::query()
                ->where('user_id', $user->id)
                ->whereIn('status', ['active', 'trialing'])
                ->exists();

            if (! $hasActiveSubscription) {
                return response()->json([
                    'message' => 'Please choose a plan before creating an organization.',
                ], 403);
            }
        }

        $tenant = $this->tenantService->create($validated, $user);

        return response()->json([
            'data' => $this->serializeTenant($tenant, $request->user()),
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

    public function destroy(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);

        if (!$request->user()->isOwnerOfTenant($tenant)) {
            return response()->json(['message' => 'Only the owner can delete the tenant'], 403);
        }

        $this->tenantService->delete($tenant);

        return response()->json(['message' => 'Tenant successfully deleted']);
    }

    private function serializeTenant(Tenant $tenant, $user): array
    {
        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'status' => $tenant->status,
            'role' => $tenant->pivot?->role ?? $user->getRoleInTenant($tenant),
            'owner_id' => $tenant->owner_id,
            'trial_ends_at' => $tenant->trial_ends_at?->toISOString(),
            'created_at' => $tenant->created_at?->toISOString(),
        ];
    }
}
