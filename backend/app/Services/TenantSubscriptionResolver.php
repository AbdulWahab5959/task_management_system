<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;

class TenantSubscriptionResolver
{
    public const ACTIVE_STATUSES = ['active', 'trialing'];

    public function currentTenant(): ?Tenant
    {
        return app(TenantService::class)->getCurrentTenant();
    }

    public function forTenant(Tenant $tenant): ?Subscription
    {
        $subscription = $tenant->owner_id
            ? $this->latestForUser(User::query()->find($tenant->owner_id))
            : null;

        return $subscription && in_array($subscription->status, self::ACTIVE_STATUSES, true)
            ? $subscription
            : null;
    }

    public function latestForTenant(Tenant $tenant): ?Subscription
    {
        return $tenant->owner_id
            ? $this->latestForUser(User::query()->find($tenant->owner_id))
            : null;
    }

    public function forUser(?User $user): ?Subscription
    {
        $subscription = $user ? $this->latestForUser($user) : null;

        return $subscription && in_array($subscription->status, self::ACTIVE_STATUSES, true)
            ? $subscription
            : null;
    }

    public function latestForUser(?User $user): ?Subscription
    {
        return $user
            ? Subscription::query()->where('user_id', $user->id)->with('plan')->latest()->first()
            : null;
    }

    public function currentSubscription(): ?Subscription
    {
        $tenant = $this->currentTenant();

        return $tenant ? $this->forTenant($tenant) : $this->forUser(auth()->user());
    }

    public function currentPlan(): ?Plan
    {
        return $this->currentSubscription()?->plan;
    }

    public function status(?Tenant $tenant = null): string
    {
        $tenant ??= $this->currentTenant();
        if (! $tenant) {
            return 'missing';
        }

        $subscription = $this->forTenant($tenant);
        if ($subscription) {
            return $subscription->status;
        }

        $latest = $this->latestForTenant($tenant);

        return match ($latest?->status) {
            'cancelled', 'canceled' => 'canceled',
            'expired' => 'expired',
            'past_due', 'unpaid', 'incomplete', 'incomplete_expired' => 'past_due',
            'pending' => 'pending',
            default => 'missing',
        };
    }

    public function isActive(?Tenant $tenant = null): bool
    {
        return in_array($this->status($tenant), self::ACTIVE_STATUSES, true);
    }

    public function isTrialing(?Tenant $tenant = null): bool
    {
        return $this->status($tenant) === 'trialing';
    }

    public function isPastDue(?Tenant $tenant = null): bool
    {
        return $this->status($tenant) === 'past_due';
    }

    public function requiresPayment(?Tenant $tenant = null): bool
    {
        return ! $this->isActive($tenant);
    }
}
