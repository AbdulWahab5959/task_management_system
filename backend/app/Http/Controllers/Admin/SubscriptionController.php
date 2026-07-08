<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Subscription;
use App\Services\StripeBackfillService;
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
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

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
                'subscriptions.stripe_subscription_id',
                'subscriptions.stripe_customer_id',
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

        if ($startDate) {
            $query->whereDate('subscriptions.created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('subscriptions.created_at', '<=', $endDate);
        }

        $subscriptions = $query->paginate($limit, ['*'], 'page', $page);

        // Calculate summary stats
        $totalSubscriptions = Subscription::query()->count();
        $activeSubscriptions = Subscription::query()->where('status', 'active')->count();
        $cancelledSubscriptions = Subscription::query()->where('status', 'cancelled')->count();
        
        // Get payment stats
        $pendingPayments = Payment::query()->where('status', 'pending')->count();
        $paidPayments = Payment::query()->where('status', 'paid')->count();
        $totalPaidAmount = Payment::query()->where('status', 'paid')->sum('amount');

        return response()->json([
            'data' => $subscriptions->items(),
            'pagination' => [
                'current_page' => $subscriptions->currentPage(),
                'per_page' => $subscriptions->perPage(),
                'total' => $subscriptions->total(),
                'last_page' => $subscriptions->lastPage(),
            ],
            'summary_stats' => [
                'total_subscriptions' => $totalSubscriptions,
                'active_subscriptions' => $activeSubscriptions,
                'cancelled_subscriptions' => $cancelledSubscriptions,
                'pending_payments' => $pendingPayments,
                'paid_payments' => $paidPayments,
                'total_paid_amount' => $totalPaidAmount,
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

    public function getPayments(Request $request, StripeBackfillService $stripeBackfillService): JsonResponse
    {
        $page = (int) $request->input('page', 1);
        $limit = min((int) $request->input('limit', 15), 100);
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status');
        $gateway = $request->input('gateway');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $userId = $request->input('user_id');

        $query = Payment::query()
            ->with(['user', 'plan', 'subscription', 'refunds.admin'])
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q
                    ->whereHas('user', fn($subQ) => $subQ
                        ->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('email', 'LIKE', "%{$search}%")
                    )
                    ->orWhereHas('plan', fn($subQ) => $subQ
                        ->where('name', 'LIKE', "%{$search}%")
                    )
                    ->orWhere('reference', 'LIKE', "%{$search}%");
            });
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($gateway) {
            $query->where('gateway', $gateway);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        $paginated = $query->paginate($limit, ['*'], 'page', $page);

        // Transform payments to include refund eligibility information
        $payments = $paginated->getCollection()->map(function (Payment $payment) use ($stripeBackfillService) {
            if ($payment->getRefundDisabledReason() === 'Refund unavailable: missing Stripe PaymentIntent or Charge ID.') {
                $stripeBackfillService->backfillStripePaymentReferences($payment);
                $payment->refresh();
            }

            $latestRefund = $payment->refunds
                ->sortByDesc(fn ($refund) => $refund->refunded_at ?? $refund->created_at)
                ->first();

            return [
                'id' => $payment->id,
                'user_id' => $payment->user_id,
                'subscription_id' => $payment->subscription_id,
                'plan_id' => $payment->plan_id,
                'gateway' => $payment->gateway,
                'reference' => $payment->reference,
                'amount' => (string) $payment->amount,
                'currency' => $payment->currency,
                'status' => $payment->status,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'created_at' => $payment->created_at?->toIso8601String(),
                'user_name' => $payment->user?->name,
                'user_email' => $payment->user?->email,
                'plan_name' => $payment->plan?->name,
                // Refund eligibility information
                'refunded_amount' => (string) $payment->refunded_amount,
                'refund_status' => $payment->refund_status,
                'refundable_amount' => (string) $payment->getRefundableAmount(),
                'can_refund' => $payment->canBeRefunded(),
                'refund_disabled_reason' => $payment->getRefundDisabledReason(),
                'provider_payment_intent_id' => $payment->provider_payment_intent_id,
                'provider_charge_id' => $payment->provider_charge_id,
                'provider_payment_id' => $payment->provider_payment_id,
                'provider_invoice_id' => $payment->provider_invoice_id,
                'gateway_subscription_id' => $payment->gateway_subscription_id,
                'latest_refund' => $latestRefund ? [
                    'id' => $latestRefund->id,
                    'amount' => (string) $latestRefund->amount,
                    'currency' => $latestRefund->currency,
                    'status' => $latestRefund->status,
                    'reason' => $latestRefund->reason,
                    'provider_refund_id' => $latestRefund->provider_refund_id,
                    'provider_payment_id' => $latestRefund->provider_payment_id,
                    'refunded_at' => $latestRefund->refunded_at?->toIso8601String(),
                    'admin_name' => $latestRefund->admin?->name,
                    'admin_email' => $latestRefund->admin?->email,
                ] : null,
                // Subscription status information
                'subscription_status' => $payment->subscription?->status,
                'subscription_cancel_at_period_end' => $payment->subscription?->cancel_at_period_end ?? false,
                'subscription_cancelled_at' => $payment->subscription?->cancelled_at?->toIso8601String(),
                'subscription_ends_at' => $payment->subscription?->ends_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $payments,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'last_page' => $paginated->lastPage(),
            ],
            'summary_stats' => [
                'total_payments' => Payment::query()->count(),
                'pending_payments' => Payment::query()->where('status', 'pending')->count(),
                'paid_payments' => Payment::query()->where('status', 'paid')->count(),
                'failed_payments' => Payment::query()->where('status', 'failed')->count(),
                'total_paid_amount' => Payment::query()->where('status', 'paid')->sum('amount'),
            ],
        ]);
    }
}
