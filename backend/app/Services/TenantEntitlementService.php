<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Tenant;

class TenantEntitlementService
{
    public function __construct(private readonly TenantSubscriptionResolver $subscriptions)
    {
    }

    public function plan(?Tenant $tenant = null): ?Plan
    {
        $tenant ??= $this->subscriptions->currentTenant();

        return $tenant ? $this->subscriptions->forTenant($tenant)?->plan : null;
    }

    public function hasFeature(?Tenant $tenant, string $feature): bool
    {
        $plan = $this->plan($tenant);
        if (! $plan) {
            return false;
        }

        if ($plan->hasFeature($feature)) {
            return true;
        }

        return $this->booleanLimit($plan, $feature) === true;
    }

    public function limit(?Tenant $tenant, string $key, mixed $default = null): mixed
    {
        $plan = $this->plan($tenant);
        if (! $plan) {
            return $default;
        }

        return $plan->getLimit($key, $default);
    }

    public function allows(?Tenant $tenant, string $key): bool
    {
        $plan = $this->plan($tenant);
        if (! $plan || ! $this->subscriptions->isActive($tenant)) {
            return false;
        }

        $value = $plan->getLimit($key);
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return $value > 0;
        }

        return $value === 'unlimited';
    }

    public function booleanLimit(Plan $plan, string $key): ?bool
    {
        $limits = $plan->limits ?? [];
        if (! array_key_exists($key, $limits) || ! is_bool($limits[$key])) {
            return null;
        }

        return $limits[$key];
    }

    public function normalizedLimits(?Tenant $tenant = null): array
    {
        $limits = $this->plan($tenant)?->limits ?? [];

        return is_array($limits) ? $limits : [];
    }
}
