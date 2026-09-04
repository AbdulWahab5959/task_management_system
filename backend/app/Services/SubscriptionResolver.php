<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;

final class SubscriptionResolver
{
    public static function resolve(User $user): ?Plan
    {
        return Subscription::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'trialing'])
            ->with('plan')
            ->latest()
            ->first()?->plan;
    }
}
