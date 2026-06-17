<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\Subscription;
use App\Services\PaymentService;
use App\Services\TenantService;

class SubscriptionController extends Controller
{
    protected PaymentService $paymentService;
    protected TenantService $tenantService;

    public function __construct(PaymentService $paymentService, TenantService $tenantService)
    {
        $this->paymentService = $paymentService;
        $this->tenantService = $tenantService;
    }

    public function plans()
    {
        return response()->json(Plan::where('is_active', true)->orderBy('sort_order')->get());
    }

    public function subscribe(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'payment_method_id' => 'required|string',
        ]);

        $tenant = $this->tenantService->getCurrentTenant();

        if (!$tenant) {
            return response()->json(['message' => 'Tenant context required'], 400);
        }

        $plan = Plan::findOrFail($request->plan_id);

        $subscription = $this->paymentService->createSubscription($tenant, $plan, $request->payment_method_id);

        return response()->json([
            'message' => 'Subscription created successfully',
            'subscription' => $subscription,
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
        ]);

        $tenant = $this->tenantService->getCurrentTenant();

        if (!$tenant || !$tenant->subscription) {
            return response()->json(['message' => 'No active subscription found for tenant'], 400);
        }

        $newPlan = Plan::findOrFail($request->plan_id);
        $updatedSubscription = $this->paymentService->updateSubscription($tenant->subscription, $newPlan);

        return response()->json([
            'message' => 'Subscription updated successfully',
            'subscription' => $updatedSubscription,
        ]);
    }

    public function cancel(Request $request)
    {
        $request->validate([
            'immediately' => 'boolean',
        ]);

        $tenant = $this->tenantService->getCurrentTenant();

        if (!$tenant || !$tenant->subscription) {
            return response()->json(['message' => 'No active subscription found for tenant'], 400);
        }

        $this->paymentService->cancelSubscription($tenant->subscription, $request->immediately ?? false);

        return response()->json([
            'message' => 'Subscription cancelled successfully',
            'subscription' => $tenant->subscription->fresh(),
        ]);
    }

    public function resume(Request $request)
    {
        $tenant = $this->tenantService->getCurrentTenant();

        if (!$tenant || !$tenant->subscription) {
            return response()->json(['message' => 'No active subscription found for tenant'], 400);
        }

        $this->paymentService->resumeSubscription($tenant->subscription);

        return response()->json([
            'message' => 'Subscription resumed successfully',
            'subscription' => $tenant->subscription->fresh(),
        ]);
    }

    public function invoices(Request $request)
    {
        $tenant = $this->tenantService->getCurrentTenant();

        if (!$tenant || !$tenant->subscription) {
            return response()->json([]);
        }

        return response()->json($tenant->subscription->invoices()->orderBy('created_at', 'desc')->get());
    }

    public function webhook(Request $request)
    {
        $payload = $request->all();
        $this->paymentService->handleWebhook($payload);

        return response()->json(['status' => 'success']);
    }
}
