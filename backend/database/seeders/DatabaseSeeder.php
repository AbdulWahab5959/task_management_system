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
                'name' => 'Free Plan',
                'stripe_plan_id' => 'price_free_monthly',
                'price' => 0.00,
                'interval' => 'month',
                'features' => ['1 Team Member', '3 Active Projects', 'Basic Support'],
                'limits' => ['users' => 1, 'projects' => 3],
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'pro-monthly'],
            [
                'name' => 'Pro Monthly',
                'stripe_plan_id' => 'price_pro_monthly',
                'price' => 19.00,
                'interval' => 'month',
                'features' => ['10 Team Members', '50 Active Projects', 'Priority Support', 'API Access'],
                'limits' => ['users' => 10, 'projects' => 50],
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'pro-yearly'],
            [
                'name' => 'Pro Yearly',
                'stripe_plan_id' => 'price_pro_yearly',
                'price' => 180.00,
                'interval' => 'year',
                'features' => ['10 Team Members', '50 Active Projects', 'Priority Support', 'API Access', '20% Discount'],
                'limits' => ['users' => 10, 'projects' => 50],
                'is_active' => true,
                'sort_order' => 3,
            ]
        );

        Plan::updateOrCreate(
            ['slug' => 'enterprise-monthly'],
            [
                'name' => 'Enterprise Monthly',
                'stripe_plan_id' => 'price_enterprise_monthly',
                'price' => 99.00,
                'interval' => 'month',
                'features' => ['Unlimited Team Members', 'Unlimited Projects', 'Dedicated Account Manager', 'Custom Integrations'],
                'limits' => ['users' => -1, 'projects' => -1],
                'is_active' => true,
                'sort_order' => 4,
            ]
        );
    }
}
