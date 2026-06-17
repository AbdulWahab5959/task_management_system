<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\TenantService;

class CheckSubscription
{
    protected TenantService $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->tenantService->getCurrentTenant();

        if (!$tenant) {
            return response()->json([
                'message' => 'Tenant not identified',
            ], 403);
        }

        // Allow access if on trial
        if ($tenant->isOnTrial()) {
            return $next($request);
        }

        // Check if subscription is active
        if (!$tenant->hasActiveSubscription()) {
            return response()->json([
                'message' => 'Your subscription is not active. Please update your payment details.',
                'requires_payment' => true,
            ], 402); // 402 Payment Required
        }

        return $next($request);
    }
}
