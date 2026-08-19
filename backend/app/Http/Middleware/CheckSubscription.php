<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\TenantSubscriptionResolver;

class CheckSubscription
{
    protected TenantSubscriptionResolver $subscriptions;

    public function __construct(TenantSubscriptionResolver $subscriptions)
    {
        $this->subscriptions = $subscriptions;
    }

    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->subscriptions->currentTenant();

        if (!$tenant) {
            return response()->json([
                'message' => 'A workspace is required for this action.',
                'code' => 'tenant_required',
            ], 403);
        }

        if ($this->subscriptions->isActive($tenant)) {
            return $next($request);
        }

        $status = $this->subscriptions->status($tenant);
        $isPastDue = $status === 'past_due';

        return response()->json([
            'message' => $isPastDue
                ? 'Your subscription requires payment attention.'
                : 'Your account does not have an active subscription.',
            'code' => $isPastDue ? 'tenant_subscription_past_due' : 'tenant_subscription_required',
            'subscription_scope' => 'user',
            'status' => $status,
            'requires_payment' => true,
        ], 402); // Payment Required
    }
}
