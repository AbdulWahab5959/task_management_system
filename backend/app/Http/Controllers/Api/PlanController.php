<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('amount')
            ->get()
            ->map(fn (Plan $plan): array => [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'description' => $plan->description,
                'price' => $plan->price,
                'interval' => $plan->interval,
                'amount' => $plan->amount,
                'amount_minor' => $plan->amount_minor,
                'currency' => strtoupper((string) $plan->currency),
                'billing_interval' => $plan->billing_interval,
                'features' => $plan->features ?? [],
                'entitlements' => $plan->entitlements(),
                'limits' => $plan->limits ?? [],
                'is_popular' => $plan->is_popular,
                'is_active' => $plan->is_active,
                'sort_order' => $plan->sort_order,
            ]);

        return response()->json($plans);
    }
}
