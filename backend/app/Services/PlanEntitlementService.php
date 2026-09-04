<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Tenant;
use App\Models\UsageRecord;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class PlanEntitlementService
{
    public const METRICS = [
        'storage_bytes',
        'chatbot_messages_monthly',
        'api_requests_monthly',
    ];

    public function planFor(User $user): ?Plan
    {
        return SubscriptionResolver::resolve($user);
    }

    public function limitsFor(User $user): array
    {
        $limits = $this->planFor($user)?->limits;

        return is_array($limits) ? $limits : [];
    }

    public function entitlementsFor(User $user): array
    {
        return $this->planFor($user)?->entitlements() ?? [];
    }

    public function organizationSummary(User $user): array
    {
        $limit = $this->limitsFor($user)['organizations'] ?? 0;
        $used = Tenant::query()->where('owner_id', $user->id)->where('status', Tenant::STATUS_ACTIVE)->count();

        return [
            'used' => $used,
            'limit' => $limit,
            'over_limit' => $limit !== 'unlimited' && $used > (int) $limit,
            'remaining' => $limit === 'unlimited' ? 'unlimited' : max(0, (int) $limit - $used),
        ];
    }

    public function usageSummary(User $user, ?Tenant $tenant = null): array
    {
        $periodStart = CarbonImmutable::now('UTC')->startOfMonth()->toDateString();
        $query = UsageRecord::query()->where('user_id', $user->id)->where('period_start', $periodStart);
        if ($tenant) {
            $query->where('tenant_id', $tenant->id);
        } else {
            $query->whereNull('tenant_id');
        }

        $usage = $query->pluck('quantity', 'metric');
        $limits = $this->limitsFor($user);
        $hasPlan = $this->planFor($user) !== null;

        return collect(self::METRICS)->mapWithKeys(function (string $metric) use ($usage, $limits, $hasPlan): array {
            $value = (int) ($usage[$metric] ?? 0);
            $limit = $hasPlan ? ($limits[$metric] ?? null) : 0;
            return [$metric => [
                'used' => $value,
                'limit' => $limit,
                'remaining' => $limit === 'unlimited' ? 'unlimited' : max(0, (int) $limit - $value),
            ]];
        })->all();
    }

    public function consume(User $user, string $metric, int $quantity = 1, ?Tenant $tenant = null): UsageRecord
    {
        abort_unless(in_array($metric, self::METRICS, true), 422, 'Unsupported usage metric.');
        abort_if($quantity < 1, 422, 'Usage quantity must be positive.');

        $limit = $this->limitsFor($user)[$metric] ?? null;
        $periodStart = CarbonImmutable::now('UTC')->startOfMonth()->toDateString();

        return DB::transaction(function () use ($user, $tenant, $metric, $quantity, $limit, $periodStart): UsageRecord {
            $recordQuery = UsageRecord::query()
                ->where('user_id', $user->id)
                ->where('metric', $metric)
                ->whereDate('period_start', $periodStart);
            $tenant ? $recordQuery->where('tenant_id', $tenant->id) : $recordQuery->whereNull('tenant_id');
            $record = $recordQuery->lockForUpdate()->first();
            if (! $record) {
                $record = UsageRecord::create([
                    'user_id' => $user->id,
                    'tenant_id' => $tenant?->id,
                    'metric' => $metric,
                    'period_start' => $periodStart,
                    'quantity' => 0,
                ]);
            }

            if ($limit !== 'unlimited' && $limit !== null && $record->quantity + $quantity > (int) $limit) {
                throw new \Symfony\Component\HttpKernel\Exception\HttpException(429, 'This plan usage limit has been reached.');
            }

            $record->increment('quantity', $quantity);
            return $record->fresh();
        });
    }
}
