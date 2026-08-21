<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Stripe\StripeClient;

class ReconcileDuplicateSubscriptions extends Command
{
    protected $signature = 'subscriptions:reconcile-duplicates
        {--user= : Limit the scan to one user id}
        {--execute : Mark duplicate local subscriptions as cancelled}
        {--cancel-stripe : Immediately cancel duplicate Stripe subscriptions too; requires --execute}
        {--dry-run : Explicitly perform a read-only scan}';

    protected $description = 'Find duplicate active user subscriptions and optionally cancel duplicate local records.';

    public function handle(): int
    {
        $query = Subscription::query()
            ->whereNotNull('user_id')
            ->whereIn('status', ['active', 'trialing'])
            ->with(['user:id,name,email', 'plan:id,name']);

        if ($userId = $this->option('user')) {
            $query->where('user_id', (int) $userId);
        }

        $subscriptions = $query->orderByDesc('created_at')->orderByDesc('id')->get();
        $groups = $subscriptions->groupBy('user_id')->filter(fn (Collection $items): bool => $items->count() > 1);

        if ($groups->isEmpty()) {
            $this->info('No duplicate active user subscriptions found.');

            return self::SUCCESS;
        }

        $execute = (bool) $this->option('execute');
        $cancelStripe = (bool) $this->option('cancel-stripe');
        if ($cancelStripe && ! $execute) {
            $this->error('--cancel-stripe requires --execute.');

            return self::FAILURE;
        }

        $stripe = null;
        if ($cancelStripe) {
            $secret = config('services.stripe.secret');
            if (! is_string($secret) || trim($secret) === '') {
                $this->error('Stripe is not configured. No records were changed.');

                return self::FAILURE;
            }
            $stripe = new StripeClient($secret);
        }

        $cancelled = 0;

        foreach ($groups as $userId => $items) {
            $keeper = $this->keeper($items);
            $duplicates = $items->reject(fn (Subscription $subscription): bool => $subscription->is($keeper));
            $user = $keeper->user;

            $this->line(sprintf(
                'User #%s (%s) - keep subscription #%s (%s); duplicate(s): %s',
                $userId,
                $user?->email ?? 'unknown',
                $keeper->id,
                $keeper->plan?->name ?? 'unknown plan',
                $duplicates->pluck('id')->implode(', '),
            ));

            foreach ($duplicates as $duplicate) {
                $this->line(sprintf(
                    '  #%s | %s | %s | Stripe: %s | created: %s',
                    $duplicate->id,
                    $duplicate->status,
                    $duplicate->plan?->name ?? 'unknown plan',
                    $duplicate->stripe_subscription_id ?: 'none',
                    $duplicate->created_at?->toISOString() ?? 'unknown',
                ));

                if ($execute) {
                    if ($stripe && str_starts_with((string) $duplicate->stripe_subscription_id, 'sub_')) {
                        try {
                            $stripe->subscriptions->cancel($duplicate->stripe_subscription_id);
                        } catch (\Throwable $exception) {
                            $this->error("  Stripe cancellation failed for #{$duplicate->id}; local record was not changed.");
                            $this->error($exception->getMessage());

                            return self::FAILURE;
                        }
                    }

                    $duplicate->forceFill([
                        'status' => 'cancelled',
                        'cancelled_at' => now(),
                        'cancel_at_period_end' => false,
                    ])->save();
                    $cancelled++;
                }
            }
        }

        if (! $execute) {
            $this->warn('Read-only scan complete. Re-run with --execute to change local records.');
            $this->warn('Stripe subscriptions are not cancelled by this command; reconcile them in Stripe separately.');
        } else {
            $this->info("Cancelled {$cancelled} duplicate local subscription(s).");
            if (! $cancelStripe) {
                $this->warn('Stripe subscriptions remain unchanged. Cancel duplicate Stripe subscriptions separately.');
            } else {
                $this->info('Duplicate Stripe subscriptions were cancelled immediately.');
            }
        }

        return self::SUCCESS;
    }

    private function keeper(Collection $subscriptions): Subscription
    {
        return $subscriptions
            ->sortByDesc(fn (Subscription $subscription): array => [
                $subscription->status === 'active' ? 1 : 0,
                filled($subscription->stripe_subscription_id) ? 1 : 0,
                $subscription->created_at?->getTimestamp() ?? 0,
                $subscription->id,
            ])
            ->firstOrFail();
    }
}
