<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TenantEntitlementService;
use App\Services\TenantSubscriptionResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantSubscriptionAccessController extends Controller
{
    public function __invoke(
        Request $request,
        TenantSubscriptionResolver $subscriptions,
        TenantEntitlementService $entitlements,
    ): JsonResponse {
        $tenant = $subscriptions->currentTenant();
        if (! $tenant) {
            return response()->json([
                'message' => 'A workspace is required for this action.',
                'code' => 'tenant_required',
            ], 403);
        }

        $subscription = $subscriptions->latestForTenant($tenant);
        $plan = $subscription?->plan;

        return response()->json([
            'subscription' => [
                'id' => $subscription?->id,
                'status' => $subscriptions->status($tenant),
                'requires_payment' => $subscriptions->requiresPayment($tenant),
            ],
            'plan' => $plan ? [
                'id' => $plan->id,
                'name' => $plan->name,
            ] : null,
            'features' => $plan?->features ?? [],
            'limits' => $entitlements->normalizedLimits($tenant),
        ]);
    }
}
