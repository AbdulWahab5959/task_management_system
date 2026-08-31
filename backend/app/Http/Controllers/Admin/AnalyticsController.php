<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ContactMessage;
use App\Models\Payment;
use App\Models\Subscription;
use App\Models\SupportConversation;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    /**
     * Get admin analytics dashboard data.
     *
     * Returns real database metrics only — no fake or static numbers.
     */
    public function index(): JsonResponse
    {
        $now = now();
        $sixMonthsAgo = $now->copy()->startOfMonth()->subMonths(5);
        $thirtyDaysAgo = $now->copy()->subDays(30);

        // User stats
        $totalUsers = User::count();
        $verifiedUsers = User::whereNotNull('email_verified_at')->count();
        $unverifiedUsers = User::whereNull('email_verified_at')->count();
        $newUsersThisMonth = User::whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        // Recent users — safe fields only
        $recentUsers = User::latest()
            ->take(5)
            ->get(['id', 'name', 'email', 'role', 'email_verified_at', 'created_at']);

        // Contact message stats (if table exists)
        $contactMessagesTotal = ContactMessage::count();
        $contactMessagesNew = ContactMessage::where('status', ContactMessage::STATUS_NEW)->count();
        $contactMessagesRead = ContactMessage::where('status', ContactMessage::STATUS_READ)->count();
        $contactMessagesReplied = ContactMessage::where('status', ContactMessage::STATUS_REPLIED)->count();

        // Activity log count
        $activityLogsCount = ActivityLog::count();

        // Platform health and billing metrics. Keep these aggregate-only; no
        // provider payloads or payment identifiers are returned to the UI.
        $tenantCounts = Tenant::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $subscriptionCounts = Subscription::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $paidPayments = Payment::query()->where('status', Payment::STATUS_PAID);
        $revenueTotal = (float) $paidPayments->sum('amount');
        $revenueLast30Days = (float) Payment::query()
            ->where('status', Payment::STATUS_PAID)
            ->where(function ($query) use ($thirtyDaysAgo) {
                $query->where('paid_at', '>=', $thirtyDaysAgo)
                    ->orWhere(function ($fallback) use ($thirtyDaysAgo) {
                        $fallback->whereNull('paid_at')->where('created_at', '>=', $thirtyDaysAgo);
                    });
            })
            ->sum('amount');

        $monthKeys = [];
        for ($offset = 0; $offset < 6; $offset++) {
            $month = $sixMonthsAgo->copy()->addMonths($offset);
            $monthKeys[$month->format('Y-m')] = [
                'label' => $month->format('M Y'),
                'signups' => 0,
                'revenue' => 0.0,
            ];
        }
        User::query()->where('created_at', '>=', $sixMonthsAgo)->pluck('created_at')->each(function ($createdAt) use (&$monthKeys) {
            $key = Carbon::parse($createdAt)->format('Y-m');
            if (isset($monthKeys[$key])) $monthKeys[$key]['signups']++;
        });
        Payment::query()->where('status', Payment::STATUS_PAID)->where(function ($query) use ($sixMonthsAgo) {
            $query->where('paid_at', '>=', $sixMonthsAgo)
                ->orWhere(function ($fallback) use ($sixMonthsAgo) {
                    $fallback->whereNull('paid_at')->where('created_at', '>=', $sixMonthsAgo);
                });
        })->get(['amount', 'paid_at', 'created_at'])->each(function ($payment) use (&$monthKeys) {
            $date = $payment->paid_at ?? $payment->created_at;
            $key = Carbon::parse($date)->format('Y-m');
            if (isset($monthKeys[$key])) $monthKeys[$key]['revenue'] += (float) $payment->amount;
        });

        $planDistribution = Subscription::query()
            ->with('plan:id,name')
            ->whereIn('status', ['active', 'trialing'])
            ->get()
            ->groupBy(fn ($subscription) => $subscription->plan?->name ?? 'Unknown plan')
            ->map(fn ($subscriptions, $name) => ['name' => $name, 'subscriptions' => $subscriptions->count()])
            ->sortByDesc('subscriptions')
            ->values();
        $supportCounts = SupportConversation::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        // Recent activity — latest 10 with user info
        $recentActivity = ActivityLog::with('user:id,name,email')
            ->latest()
            ->take(10)
            ->get(['id', 'user_id', 'action', 'description', 'ip_address', 'user_agent', 'created_at']);

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'verified_users' => $verifiedUsers,
                'unverified_users' => $unverifiedUsers,
                'new_users_this_month' => $newUsersThisMonth,
                'contact_messages_total' => $contactMessagesTotal,
                'new_contact_messages' => $contactMessagesNew,
                'activity_logs_count' => $activityLogsCount,
                'organizations_total' => Tenant::count(),
                'organizations_active' => (int) ($tenantCounts['active'] ?? 0),
                'organizations_suspended' => (int) ($tenantCounts['suspended'] ?? 0),
                'subscriptions_active' => (int) ($subscriptionCounts['active'] ?? 0),
                'subscriptions_trialing' => (int) ($subscriptionCounts['trialing'] ?? 0),
                'subscriptions_past_due' => (int) ($subscriptionCounts['past_due'] ?? 0),
                'revenue_total' => round($revenueTotal, 2),
                'revenue_last_30_days' => round($revenueLast30Days, 2),
                'paid_transactions' => (int) $paidPayments->count(),
            ],
            'trends' => array_values($monthKeys),
            'plan_distribution' => $planDistribution,
            'support_summary' => [
                'open' => (int) ($supportCounts['open'] ?? 0),
                'pending' => (int) ($supportCounts['pending'] ?? 0),
                'closed' => (int) ($supportCounts['closed'] ?? 0),
            ],
            'recent_users' => $recentUsers,
            'recent_activity' => $recentActivity->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $log->description,
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                ];
            }),
            'contact_summary' => [
                'new' => $contactMessagesNew,
                'read' => $contactMessagesRead,
                'replied' => $contactMessagesReplied,
            ],
        ]);
    }
}
