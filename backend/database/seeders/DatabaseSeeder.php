<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Plan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(SuperAdminSeeder::class);

        // Seed default User
        $user = User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password123'),
                'role' => User::ROLE_USER,
                'status' => User::STATUS_ACTIVE,
            ]
        );

        // Seed Plans
        Plan::updateOrCreate(
            ['slug' => 'free'],
            [
                'name' => 'Free',
                'description' => 'Perfect for getting started with basic features.',
                'stripe_plan_id' => 'price_free_monthly',
                'price' => 0.00,
                'interval' => 'month',
                'features' => [
                    '1 Team Member',
                    '3 Active Projects',
                    '5 GB Storage',
                    'Email Support',
                    'Basic Analytics',
                    'Community Access',
                ],
                'limits' => [
                    'users' => 1,
                    'projects' => 3,
                    'storage' => 5,
                    'support' => 'email',
                ],
                'is_popular' => false,
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'pro-monthly'],
            [
                'name' => 'Pro',
                'description' => 'Best for growing teams that need more power and control.',
                'stripe_plan_id' => 'price_pro_monthly',
                'price' => 29.00,
                'interval' => 'month',
                'features' => [
                    'Up to 10 Team Members',
                    '50 Active Projects',
                    '50 GB Storage',
                    'Priority Support',
                    'Advanced Analytics',
                    'API Access',
                    'Custom Integrations',
                    'Team Collaboration',
                ],
                'limits' => [
                    'users' => 10,
                    'projects' => 50,
                    'storage' => 50,
                    'support' => 'priority',
                ],
                'is_popular' => true,
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'pro-yearly'],
            [
                'name' => 'Pro',
                'description' => 'Best for growing teams that need more power and control. Save 20% with annual billing.',
                'stripe_plan_id' => 'price_pro_yearly',
                'price' => 279.00,
                'interval' => 'year',
                'features' => [
                    'Up to 10 Team Members',
                    '50 Active Projects',
                    '50 GB Storage',
                    'Priority Support',
                    'Advanced Analytics',
                    'API Access',
                    'Custom Integrations',
                    'Team Collaboration',
                    '20% Annual Discount',
                ],
                'limits' => [
                    'users' => 10,
                    'projects' => 50,
                    'storage' => 50,
                    'support' => 'priority',
                ],
                'is_popular' => true,
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'enterprise-monthly'],
            [
                'name' => 'Enterprise',
                'description' => 'For large organizations with advanced security and dedicated support.',
                'stripe_plan_id' => 'price_enterprise_monthly',
                'price' => 99.00,
                'interval' => 'month',
                'features' => [
                    'Unlimited Team Members',
                    'Unlimited Projects',
                    'Unlimited Storage',
                    'Dedicated Account Manager',
                    'Custom Integrations',
                    'Advanced Security',
                    'SLA Guarantee',
                    '24/7 Phone & Email Support',
                    'Onboarding Assistance',
                    'Custom Reporting',
                ],
                'limits' => [
                    'users' => -1,
                    'projects' => -1,
                    'storage' => -1,
                    'support' => 'dedicated',
                ],
                'is_popular' => false,
                'is_active' => true,
                'sort_order' => 4,
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'enterprise-yearly'],
            [
                'name' => 'Enterprise',
                'description' => 'For large organizations with advanced security and dedicated support. Save 20% with annual billing.',
                'stripe_plan_id' => 'price_enterprise_yearly',
                'price' => 949.00,
                'interval' => 'year',
                'features' => [
                    'Unlimited Team Members',
                    'Unlimited Projects',
                    'Unlimited Storage',
                    'Dedicated Account Manager',
                    'Custom Integrations',
                    'Advanced Security',
                    'SLA Guarantee',
                    '24/7 Phone & Email Support',
                    'Onboarding Assistance',
                    'Custom Reporting',
                    '20% Annual Discount',
                ],
                'limits' => [
                    'users' => -1,
                    'projects' => -1,
                    'storage' => -1,
                    'support' => 'dedicated',
                ],
                'is_popular' => false,
                'is_active' => true,
                'sort_order' => 5,
            ]
        );
    }
}