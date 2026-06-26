<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class BillingController extends Controller
{
    public function getCurrentSubscription(Request $request): JsonResponse
    {
        $user = $request->user();

        $subscription = Subscription::query()
            ->where('user_id', $user->id)
            ->with('plan')
            ->latest()
            ->first();

        $paymentHistory = Payment::query()
            ->where('user_id', $user->id)
            ->with('plan')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'subscription' => $subscription ? $this->serializeSubscription($subscription) : null,
            'current_plan' => $this->serializePlan($subscription?->plan),
            'payment_history' => $paymentHistory->map(fn (Payment $payment) => $this->serializePayment($payment)),
        ]);
    }

    public function getPlans(): JsonResponse
    {
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => $plans->map(fn (Plan $plan) => $this->serializePlan($plan)),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'gateway' => ['nullable', 'string', 'in:manual,stripe,payfast,bsecure,bSecure,sandbox'],
        ]);

        $user = $request->user();
        $plan = Plan::query()->findOrFail($validated['plan_id']);

        if (! $plan->is_active) {
            return response()->json([
                'message' => 'Selected plan is not available.',
            ], 400);
        }

        if ($plan->isFree()) {
            return $this->activateFreePlan($user, $plan);
        }

        $gateway = $validated['gateway'] ?? 'stripe';

        if ($gateway === 'stripe') {
            // Redirect to Stripe-specific checkout controller
            return response()->json([
                'redirect' => true,
                'checkout_url' => null,
                'message' => 'Please use the stripe/checkout endpoint for Stripe payments.',
            ], 400);
        }

        return $this->createPendingCheckout($user, $plan, $gateway);
    }

    public function cancelSubscription(Request $request): JsonResponse
    {
        $user = $request->user();

        $subscription = Subscription::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'trialing'])
            ->latest()
            ->first();

        if (! $subscription) {
            return response()->json([
                'message' => 'No active subscription found for your account.',
            ], 404);
        }

        try {
            $subscription->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);

            return response()->json([
                'message' => 'Your subscription has been cancelled successfully.',
                'subscription' => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'cancelled_at' => $subscription->cancelled_at?->toISOString(),
                ],
            ]);
        } catch (Throwable $exception) {
            Log::error('Failed to cancel subscription.', [
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Failed to cancel subscription. Please contact support if the issue persists.',
            ], 500);
        }
    }

    public function getPaymentHistory(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->where('user_id', $request->user()->id)
            ->with('plan')
            ->orderByDesc('created_at')
            ->paginate(10);

        return response()->json([
            'data' => $payments->map(fn (Payment $payment) => $this->serializePayment($payment)),
            'links' => [
                'first' => $payments->url(1),
                'last' => $payments->url($payments->lastPage()),
                'prev' => $payments->previousPageUrl(),
                'next' => $payments->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $payments->currentPage(),
                'from' => $payments->firstItem(),
                'last_page' => $payments->lastPage(),
                'path' => $payments->path(),
                'per_page' => $payments->perPage(),
                'to' => $payments->lastItem(),
                'total' => $payments->total(),
            ],
        ]);
    }

    private function activateFreePlan(User $user, Plan $plan): JsonResponse
    {
        try {
            $subscription = Subscription::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                ],
                [
                    'gateway' => null,
                    'status' => 'active',
                    'starts_at' => now(),
                    'ends_at' => null,
                    'cancelled_at' => null,
                ]
            );

            return response()->json([
                'message' => 'Subscribed to free plan successfully.',
                'redirect' => '/dashboard/billing',
                'subscription' => $this->serializeSubscription($subscription->load('plan')),
            ]);
        } catch (Throwable $exception) {
            Log::error('Free plan subscription failed.', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Could not subscribe to free plan. Please try again.',
            ], 500);
        }
    }

    private function createPendingCheckout(User $user, Plan $plan, string $gateway): JsonResponse
    {
        $gateway = $gateway === 'bSecure' ? 'bsecure' : $gateway;

        try {
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'gateway' => $gateway,
                'status' => 'pending',
            ]);

            $payment = Payment::create([
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'plan_id' => $plan->id,
                'gateway' => $gateway,
                'reference' => 'pay_'.Str::uuid()->toString(),
                'amount' => $plan->amount,
                'currency' => strtoupper((string) ($plan->currency ?: 'USD')),
                'status' => Payment::STATUS_PENDING,
            ]);

            return response()->json([
                'payment_reference' => $payment->reference,
                'checkout_url' => null,
                'message' => 'Payment gateway is not connected yet. Your plan request is pending.',
                'subscription' => $this->serializeSubscription($subscription->load('plan')),
            ], 201);
        } catch (Throwable $exception) {
            Log::error('Billing checkout failed.', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Checkout could not be started. Please try again in a moment.',
            ], 500);
        }
    }

    private function serializeSubscription(Subscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'plan_id' => $subscription->plan_id,
            'status' => $subscription->status,
            'gateway' => $subscription->gateway,
            'trial_ends_at' => $subscription->trial_ends_at?->toISOString(),
            'starts_at' => $subscription->starts_at?->toISOString(),
            'ends_at' => $subscription->ends_at?->toISOString(),
            'current_period_start' => $subscription->current_period_start?->toISOString(),
            'current_period_end' => $subscription->current_period_end?->toISOString(),
            'cancelled_at' => $subscription->cancelled_at?->toISOString(),
            'created_at' => $subscription->created_at->toISOString(),
            'plan' => $this->serializePlan($subscription->plan),
        ];
    }

    private function serializePlan(?Plan $plan): ?array
    {
        if (! $plan) {
            return null;
        }

        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'description' => $plan->description,
            'price' => $plan->getFormattedPrice(),
            'amount' => $plan->amount,
            'currency' => $plan->currency,
            'interval' => $plan->interval ?? $plan->billing_interval,
            'billing_interval' => $plan->billing_interval,
            'features' => $plan->features,
            'is_popular' => $plan->is_popular,
            'is_active' => $plan->is_active,
            'sort_order' => $plan->sort_order,
        ];
    }

    private function serializePayment(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'reference' => $payment->reference,
            'gateway' => $payment->gateway,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'status' => $payment->status,
            'paid_at' => $payment->paid_at?->toISOString(),
            'created_at' => $payment->created_at->toISOString(),
            'plan' => $payment->plan ? [
                'id' => $payment->plan->id,
                'name' => $payment->plan->name,
            ] : null,
        ];
    }
}