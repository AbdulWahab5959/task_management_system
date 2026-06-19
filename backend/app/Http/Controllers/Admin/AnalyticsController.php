<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\ContactMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Get admin analytics dashboard data.
     *
     * Returns real database metrics only — no fake or static numbers.
     */
    public function index(): JsonResponse
    {
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