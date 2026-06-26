<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $page = (int) $request->input('page', 1);
        $limit = min((int) $request->input('limit', 15), 100);
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status');
        $gateway = $request->input('gateway');
        $planId = $request->input('plan_id');

        $query = DB::table('subscriptions')
            ->select([
                'subscriptions.id',
                'subscriptions.user_id',
                'subscriptions.tenant_id',
                'subscriptions.plan_id',
                'subscriptions.gateway',
                'subscriptions.status',
                'subscriptions.starts_at',
                'subscriptions.ends_at',
                'subscriptions.trial_ends_at',
                'subscriptions.current_period_start',
                'subscriptions.current_period_end',
                'subscriptions.cancelled_at',
                'subscriptions.created_at',
                'subscriptions.updated_at',
                'tenants.name as tenant_name',
                DB::raw('COALESCE(subscription_users.name, tenant_owners.name) as user_name'),
                DB::raw('COALESCE(subscription_users.email, tenant_owners.email) as user_email'),
                'plans.name as plan_name',
                'plans.amount as plan_amount',
                'plans.currency as plan_currency',
            ])
            ->leftJoin('users as subscription_users', 'subscriptions.user_id', '=', 'subscription_users.id')
            ->leftJoin('tenants', 'subscriptions.tenant_id', '=', 'tenants.id')
            ->leftJoin('users as tenant_owners', 'tenants.owner_id', '=', 'tenant_owners.id')
            ->leftJoin('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->orderByDesc('subscriptions.created_at');

        if ($search !== '') {
            $query->where(function ($query) use ($search): void {
                $query
                    ->where('tenants.name', 'LIKE', "%{$search}%")
                    ->orWhere('subscription_users.name', 'LIKE', "%{$search}%")
                    ->orWhere('subscription_users.email', 'LIKE', "%{$search}%")
                    ->orWhere('tenant_owners.name', 'LIKE', "%{$search}%")
                    ->orWhere('tenant_owners.email', 'LIKE', "%{$search}%")
                    ->orWhere('plans.name', 'LIKE', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('subscriptions.status', $status);
        }

        if ($gateway) {
            $query->where('subscriptions.gateway', $gateway);
        }

        if ($planId) {
            $query->where('subscriptions.plan_id', $planId);
        }

        $subscriptions = $query->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'data' => $subscriptions->items(),
            'pagination' => [
                'current_page' => $subscriptions->currentPage(),
                'per_page' => $subscriptions->perPage(),
                'total' => $subscriptions->total(),
                'last_page' => $subscriptions->lastPage(),
            ],
            'counts' => [
                'total' => Subscription::query()->count(),
                'active' => Subscription::query()->where('status', 'active')->count(),
                'pending' => Subscription::query()->where('status', 'pending')->count(),
                'cancelled' => Subscription::query()->where('status', 'cancelled')->count(),
            ],
        ]);
    }

    public function show(Subscription $subscription): JsonResponse
    {
        $subscription->load(['user', 'tenant.owner', 'plan', 'payments.plan']);

        $user = $subscription->user ?? $subscription->tenant?->owner;

        return response()->json([
            'id' => $subscription->id,
            'tenant_id' => $subscription->tenant_id,
            'user_id' => $subscription->user_id,
            'plan_id' => $subscription->plan_id,
            'gateway' => $subscription->gateway,
            'gateway_subscription_id' => $subscription->gateway_subscription_id
                ?? $subscription->stripe_subscription_id,
            'status' => $subscription->status,
            'starts_at' => $subscription->starts_at?->toISOString(),
            'ends_at' => $subscription->ends_at?->toISOString(),
            'trial_ends_at' => $subscription->trial_ends_at?->toISOString(),
            'current_period_start' => $subscription->current_period_start?->toISOString(),
            'current_period_end' => $subscription->current_period_end?->toISOString(),
            'cancelled_at' => $subscription->cancelled_at?->toISOString(),
            'created_at' => $subscription->created_at->toISOString(),
            'updated_at' => $subscription->updated_at->toISOString(),
            'tenant' => $subscription->tenant ? [
                'id' => $subscription->tenant->id,
                'name' => $subscription->tenant->name,
            ] : null,
            'plan' => $subscription->plan ? [
                'id' => $subscription->plan->id,
                'name' => $subscription->plan->name,
                'description' => $subscription->plan->description,
                'price' => $subscription->plan->getFormattedPrice(),
                'amount' => $subscription->plan->amount,
                'currency' => $subscription->plan->currency,
                'interval' => $subscription->plan->interval ?? $subscription->plan->billing_interval,
                'features' => $subscription->plan->features,
            ] : null,
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'payment_history' => $subscription->payments->map(function (Payment $payment): array {
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
            }),
        ]);
    }

    public function getPayments(Request $request): JsonResponse
    {
        $page = (int) $request->input('page', 1);
        $limit = min((int) $request->input('limit', 15), 100);
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status');
        $gateway = $request->input('gateway');
        $userId = $request->input('user_id');

        $query = DB::table('payments')
            ->select([
                'payments.*',
                'users.name as user_name',
                'users.email as user_email',
                'plans.name as plan_name',
                'plans.amount as plan_amount',
            ])
            ->leftJoin('users', 'payments.user_id', '=', 'users.id')
            ->leftJoin('plans', 'payments.plan_id', '=', 'plans.id')
            ->orderByDesc('payments.created_at');

        if ($search !== '') {
            $query->where(function ($query) use ($search): void {
                $query
                    ->where('users.name', 'LIKE', "%{$search}%")
                    ->orWhere('users.email', 'LIKE', "%{$search}%")
                    ->orWhere('plans.name', 'LIKE', "%{$search}%")
                    ->orWhere('payments.reference', 'LIKE', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('payments.status', $status);
        }

        if ($gateway) {
            $query->where('payments.gateway', $gateway);
        }

        if ($userId) {
            $query->where('payments.user_id', $userId);
        }

        $payments = $query->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'data' => $payments->items(),
            'pagination' => [
                'current_page' => $payments->currentPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
                'last_page' => $payments->lastPage(),
            ],
        ]);
    }
}
