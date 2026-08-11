<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'action' => ['nullable', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $perPage = $validated['per_page'] ?? 10;

        $logs = ActivityLog::query()
            ->with('user:id,name,email')
            ->when($validated['action'] ?? null, function ($query, string $action) {
                $query->where('action', $action);
            })
            ->when($validated['user_id'] ?? null, function ($query, int $userId) {
                $query->where('user_id', $userId);
            })
            ->when($validated['date_from'] ?? null, function ($query, string $dateFrom) {
                $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($validated['date_to'] ?? null, function ($query, string $dateTo) {
                $query->whereDate('created_at', '<=', $dateTo);
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        // Enrich each log with a contact_email field so the UI can display
        // the sender email clearly for contact form submissions.
        $logs->getCollection()->transform(function (ActivityLog $log) {
            $properties = $log->properties ?? [];

            $log->setAttribute('contact_email', is_array($properties)
                ? ($properties['email'] ?? null)
                : null);

            return $log;
        });

        return response()->json($logs);
    }

    public function actions()
    {
        $actions = ActivityLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return response()->json($actions);
    }
}