<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        Plan::query()
            ->whereIn('slug', [
                'free',
                'pro-yearly',
                'enterprise-monthly',
                'enterprise-yearly',
            ])
            ->update(['is_active' => false]);

        $plans = [
            [
                'name' => 'Starter Monthly',
                'slug' => 'starter-monthly',
                'description' => 'A focused starter plan for small teams getting launched.',
                'amount' => '9.99',
                'amount_minor' => 999,
                'currency' => 'USD',
                'billing_interval' => 'month',
                'features' => [
                    'Core dashboard access',
                    'Basic support',
                    'Starter usage limits',
                ],
                'metadata' => [
                    'tier' => 'starter',
                ],
                'sort_order' => 1,
            ],
            [
                'name' => 'Pro Monthly',
                'slug' => 'pro-monthly',
                'description' => 'A monthly plan for growing teams that need more capacity.',
                'amount' => '29.99',
                'amount_minor' => 2999,
                'currency' => 'USD',
                'billing_interval' => 'month',
                'features' => [
                    'Advanced dashboard access',
                    'Priority support',
                    'Higher usage limits',
                ],
                'metadata' => [
                    'tier' => 'pro',
                ],
                'sort_order' => 2,
            ],
            [
                'name' => 'Business Yearly',
                'slug' => 'business-yearly',
                'description' => 'A yearly plan for established teams that want predictable billing.',
                'amount' => '299.99',
                'amount_minor' => 29999,
                'currency' => 'USD',
                'billing_interval' => 'year',
                'features' => [
                    'Business dashboard access',
                    'Priority support',
                    'Annual billing savings',
                ],
                'metadata' => [
                    'tier' => 'business',
                ],
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            $existingPlan = Plan::query()
                ->where('slug', $plan['slug'])
                ->first();

            Plan::updateOrCreate(
                ['slug' => $plan['slug']],
                [
                    'name' => $plan['name'],
                    'description' => $plan['description'],
                    'amount' => $plan['amount'],
                    'amount_minor' => $plan['amount_minor'],
                    'currency' => $plan['currency'],
                    'billing_interval' => $plan['billing_interval'],
                    'stripe_price_id' => $existingPlan?->stripe_price_id,
                    'is_active' => true,
                    'features' => $plan['features'],
                    'metadata' => $plan['metadata'],
                    // Legacy fields are populated until the admin dashboard is migrated.
                    'stripe_plan_id' => 'manual_'.$plan['slug'],
                    'price' => $plan['amount'],
                    'interval' => $plan['billing_interval'],
                    'limits' => [],
                    'is_popular' => $plan['slug'] === 'pro-monthly',
                    'sort_order' => $plan['sort_order'],
                ],
            );
        }
    }
}
