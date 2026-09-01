<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * Get notifications for the authenticated user.
     * GET /api/notifications
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'category' => ['nullable', 'string', Rule::in($this->notificationService->categories())],
        ]);
        $limit = (int) ($validated['limit'] ?? 20);

        $notifications = $this->notificationService->getForUser($user->id, $limit, $validated['category'] ?? null);
        $unreadCount = $this->notificationService->getUnreadCount($user->id);

        return response()->json([
            'data' => $notifications->map(fn ($notification) => $this->serialize($notification)),
            'unread_count' => $unreadCount,
            'categories' => $this->notificationService->categories(),
            'meta' => ['limit' => $limit, 'returned' => $notifications->count()],
        ]);
    }

    /**
     * Mark a notification as read.
     * POST /api/notifications/{id}/read
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $marked = $this->notificationService->markAsRead($id, $user->id);

        if (! $marked) {
            return response()->json(['message' => 'Notification not found.'], 404);
        }

        return response()->json(['message' => 'Notification marked as read.']);
    }

    /**
     * Mark all notifications as read for the authenticated user.
     * POST /api/notifications/read-all
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = $this->notificationService->markAllAsRead($user->id);

        return response()->json([
            'message' => "{$count} notification(s) marked as read.",
            'marked_count' => $count,
        ]);
    }

    /**
     * Get unread count for the authenticated user.
     * GET /api/notifications/unread-count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $count = $this->notificationService->getUnreadCount($user->id);

        return response()->json([
            'unread_count' => $count,
        ]);
    }

    private function serialize($notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'data' => $notification->data,
            'read_at' => $notification->read_at?->toISOString(),
            'created_at' => $notification->created_at->toISOString(),
            'is_read' => $notification->isRead(),
            'category' => $notification->category,
            'severity' => $notification->severity,
            'mandatory' => (bool) $notification->mandatory,
            'action_url' => is_string($notification->action_url) && str_starts_with($notification->action_url, '/dashboard/') ? $notification->action_url : null,
        ];
    }
}
