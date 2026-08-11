<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Return the currently authenticated user's personal activity logs.
     *
     * This endpoint is intentionally scoped to the authenticated user only.
     * It never returns other users' or global logs. Admin-level log viewing
     * is handled by the dedicated admin activity-logs endpoints.
     */
    public function activity(Request $request): JsonResponse
    {
        $user = $request->user();

        $logs = ActivityLog::query()
            ->where('user_id', $user->id)
            ->with('user:id,name,email')
            ->latest()
            ->limit(10)
            ->get();

        $serialized = $logs->map(function (ActivityLog $log) {
            $properties = $log->properties ?? [];

            return [
                'id' => $log->id,
                'user_id' => $log->user_id,
                'action' => $log->action,
                'description' => $log->description,
                'properties' => $properties,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at ? $log->created_at->toISOString() : null,
                'updated_at' => $log->updated_at ? $log->updated_at->toISOString() : null,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                ] : null,
                // Surface the contact sender email so the dashboard/activity UI can display it clearly
                'contact_email' => is_array($properties)
                    ? ($properties['email'] ?? null)
                    : null,
            ];
        });

        return response()->json([
            'data' => $serialized,
        ]);
    }
}