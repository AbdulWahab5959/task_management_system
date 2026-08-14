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
    ): Notification {
        if (! $this->shouldNotify($userId, $type)) {
            return new Notification([
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => $data,
            ]);
        }

        $notification = Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);

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
            ->latest()
            ->limit($limit)
            ->get();
    }

    /**
     * Get recent notifications for a user.
     */
    public function getForUser(int $userId, int $limit = 20)
    {
        return Notification::forUser($userId)
            ->latest()
            ->limit($limit)
            ->get();
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
            ->update(['read_at' => now()]);
    }
}
