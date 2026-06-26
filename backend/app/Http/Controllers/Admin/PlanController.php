<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->orderBy('sort_order')
            ->get();

        return response()->json($plans);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:plans,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'interval' => ['required', 'string', Rule::in(['month', 'year'])],
            'stripe_price_id' => ['nullable', 'string', 'max:255', 'regex:/^price_[A-Za-z0-9_]+$/'],
            'features' => ['required', 'array', 'min:1'],
            'features.*' => ['required', 'string', 'max:255'],
            'limits' => ['nullable', 'array'],
            'is_popular' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        $plan = Plan::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'description' => $validated['description'] ?? null,
            'amount' => $validated['price'],
            'amount_minor' => (int) round(((float) $validated['price']) * 100),
            'currency' => 'USD',
            'billing_interval' => $validated['interval'],
            'stripe_price_id' => $validated['stripe_price_id'] ?? null,
            'stripe_plan_id' => 'manual_' . $validated['slug'],
            'price' => $validated['price'],
            'interval' => $validated['interval'],
            'features' => $validated['features'],
            'metadata' => [],
            'limits' => $validated['limits'] ?? [],
            'is_popular' => $validated['is_popular'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json($plan, 201);
    }

    public function show(Plan $plan): JsonResponse
    {
        return response()->json($plan);
    }

    public function update(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('plans', 'slug')->ignore($plan->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:999999.99'],
            'interval' => ['sometimes', 'required', 'string', Rule::in(['month', 'year'])],
            'stripe_price_id' => ['nullable', 'string', 'max:255', 'regex:/^price_[A-Za-z0-9_]+$/'],
            'features' => ['sometimes', 'required', 'array', 'min:1'],
            'features.*' => ['required', 'string', 'max:255'],
            'limits' => ['nullable', 'array'],
            'is_popular' => ['boolean'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'min:0'],
        ]);

        if (array_key_exists('price', $validated)) {
            $validated['amount'] = $validated['price'];
            $validated['amount_minor'] = (int) round(((float) $validated['price']) * 100);
        }

        if (array_key_exists('interval', $validated)) {
            $validated['billing_interval'] = $validated['interval'];
        }

        $plan->update($validated);

        return response()->json($plan->refresh());
    }

    public function destroy(Plan $plan): JsonResponse
    {
        $plan->delete();

        return response()->json(['message' => 'Plan deleted successfully.']);
    }
}
