<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Create a notification for a user.
     */
    public function create(
        int $userId,
        string $type,
        string $title,
        string $message,
        ?array $data = null,
        ?int $tenantId = null,
        ?string $dedupeKey = null,
    ): Notification {
        $definition = config("notifications.types.{$type}", [
            'category' => $this->categoryFor($type),
            'severity' => 'info',
            'mandatory' => false,
            'action_url' => null,
        ]);
        $mandatory = (bool) ($definition['mandatory'] ?? false);

        if (! $mandatory && ! $this->shouldNotify($userId, $type)) {
            return new Notification([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => $data,
                'category' => $definition['category'],
                'severity' => $definition['severity'],
                'mandatory' => false,
            ]);
        }

        $attributes = [
            'user_id' => $userId,
            'tenant_id' => $tenantId,
            'type' => $type,
            'category' => $definition['category'],
            'severity' => $definition['severity'],
            'title' => $title,
            'message' => $message,
            'action_url' => $definition['action_url'] ?? null,
            'data' => $data,
            'mandatory' => $mandatory,
            'dedupe_key' => $dedupeKey,
            'delivered_at' => now(),
        ];
        try {
            $notification = $dedupeKey
                ? Notification::firstOrCreate(['user_id' => $userId, 'dedupe_key' => $dedupeKey], $attributes)
                : Notification::create($attributes);
        } catch (\Throwable $exception) {
            Log::warning('Notification persistence failed; continuing the primary operation.', [
                'user_id' => $userId,
                'type' => $type,
                'tenant_id' => $tenantId,
                'error_class' => get_class($exception),
            ]);

            return new Notification($attributes);
        }

        Log::info('Notification created.', [
            'notification_id' => $notification->id,
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
        ]);

        return $notification;
    }

    private function shouldNotify(int $userId, string $type): bool
    {
        $settings = User::query()->find($userId)?->settings;
        if (! $settings) {
            return true;
        }

        if (str_starts_with($type, 'refund_') || str_contains($type, 'billing') || str_contains($type, 'payment')) {
            return true;
        }

        if (str_contains($type, 'team') || str_contains($type, 'invitation')) {
            return (bool) $settings->team_enabled;
        }

        if (str_contains($type, 'marketing') || str_contains($type, 'product')) {
            return (bool) $settings->marketing_enabled;
        }

        return (bool) $settings->email_enabled;
    }

    private function categoryFor(string $type): string
    {
        return str_contains($type, 'refund') || str_contains($type, 'payment') || str_contains($type, 'billing') || str_contains($type, 'subscription')
            ? 'billing'
            : (str_contains($type, 'team') || str_contains($type, 'invitation') ? 'team' : 'product');
    }

    /**
     * Create a refund initiated notification.
     */
    public function refundInitiated(int $userId, float $amount, string $currency, int $paymentId, ?int $refundId = null): Notification
    {
        $formattedAmount = number_format($amount, 2) . ' ' . strtoupper($currency);

        return $this->create(
            $userId,
            'refund_initiated',
            'Refund initiated',
            "Your refund of {$formattedAmount} has been initiated.",
            [
                'payment_id' => $paymentId,
                'refund_id' => $refundId,
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'initiated',
            ],
        );
    }

    public function teamInvitation(int $userId, int $tenantId, string $organizationName, int $invitationId): Notification
    {
        return $this->create($userId, 'team_invitation', 'New team invitation', "You have been invited to join {$organizationName}.", ['invitation_id' => $invitationId], $tenantId, "team-invitation:{$invitationId}:{$userId}");
    }

    public function teamMembershipChanged(int $userId, int $tenantId, string $message, string $eventKey): Notification
    {
        return $this->create($userId, 'team_membership_changed', 'Team access updated', $message, ['event' => $eventKey], $tenantId, "team-membership:{$eventKey}:{$userId}");
    }

    /**
     * Create a refund completed notification.
     */
    public function refundCompleted(int $userId, float $amount, string $currency, int $paymentId, int $refundId): Notification
    {
        $formattedAmount = number_format($amount, 2) . ' ' . strtoupper($currency);

        return $this->create(
            $userId,
            'refund_completed',
            'Refund completed',
            "Your refund of {$formattedAmount} has been completed.",
            [
                'payment_id' => $paymentId,
                'refund_id' => $refundId,
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'completed',
            ],
        );
    }

    /**
     * Create a refund failed notification.
     */
    public function refundFailed(int $userId, float $amount, string $currency, int $paymentId, ?int $refundId = null): Notification
    {
        $formattedAmount = number_format($amount, 2) . ' ' . strtoupper($currency);

        return $this->create(
            $userId,
            'refund_failed',
            'Refund failed',
            "Your refund of {$formattedAmount} could not be completed. Please contact support.",
            [
                'payment_id' => $paymentId,
                'refund_id' => $refundId,
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'failed',
            ],
        );
    }

    /**
     * Get unread notifications for a user.
     */
    public function getUnreadForUser(int $userId, int $limit = 10)
    {
        return Notification::forUser($userId)
            ->unread()
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->latest()
            ->limit($limit)
            ->get();
    }

    /**
     * Get recent notifications for a user.
     */
    public function getForUser(int $userId, int $limit = 20, ?string $category = null)
    {
        return Notification::forUser($userId)->when($category, fn ($query) => $query->byCategory($category))
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->latest()
            ->limit($limit)
            ->get();
    }

    public function categories(): array
    {
        return config('notifications.categories', []);
    }

    /**
     * Get unread count for a user.
     */
    public function getUnreadCount(int $userId): int
    {
        return Notification::forUser($userId)
            ->unread()
            ->count();
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        $notification = Notification::forUser($userId)
            ->whereKey($notificationId)
            ->first();

        if (! $notification) {
            return false;
        }

        $notification->markAsRead();

        return true;
    }

    /**
     * Mark all notifications as read for a user.
     */
    public function markAllAsRead(int $userId): int
    {
        return Notification::forUser($userId)
            ->unread()
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->update(['read_at' => now()]);
    }
}
