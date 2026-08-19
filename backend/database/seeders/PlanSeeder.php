<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Starter Monthly',
                'slug' => 'starter-monthly',
                'description' => 'Launch one industry chatbot workspace with the essentials.',
                'amount' => '9.99',
                'amount_minor' => 999,
                'currency' => 'USD',
                'billing_interval' => 'month',
                'stripe_price_id' => 'price_1TmI2U1Oz8XVPHYWFE6vveyB',
                'stripe_product_id' => 'prod_UlphTeaK92H5er',
                'features' => [
                    'Basic chatbot',
                    '1 organization',
                    'Conversation history',
                    'Email support',
                ],
                'limits' => [
                    'organizations' => 1,
                    'projects' => 3,
                    'storage' => '5GB',
                ],
                'is_popular' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Pro Monthly',
                'slug' => 'pro-monthly',
                'description' => 'Build chatbot experiences across two industry workspaces.',
                'amount' => '29.99',
                'amount_minor' => 2999,
                'currency' => 'USD',
                'billing_interval' => 'month',
                'stripe_price_id' => 'price_1TmIPc1Oz8XVPHYW2vf5KFem',
                'stripe_product_id' => 'prod_Ulq5Rxe3Hpsn1k',
                'features' => [
                    'Chatbot automation',
                    '2 organizations',
                    'Conversation history',
                    'Priority support',
                ],
                'limits' => [
                    'organizations' => 1,
                    'projects' => 10,
                    'storage' => '25GB',
                ],
                'is_popular' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Pro Yearly',
                'slug' => 'pro-yearly',
                'description' => 'An annual plan for growing teams that need more capacity.',
                'amount' => '279.00',
                'amount_minor' => 27900,
                'currency' => 'USD',
                'billing_interval' => 'year',
                'stripe_price_id' => 'price_1TmIPd1Oz8XVPHYWV4w77fJg',
                'stripe_product_id' => 'prod_Ulq5Rxe3Hpsn1k',
                'features' => [
                    'Chatbot automation',
                    '2 organizations',
                    'Conversation history',
                    'Priority support',
                ],
                'limits' => [
                    'organizations' => 1,
                    'projects' => 10,
                    'storage' => '25GB',
                ],
                'is_popular' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Business Yearly',
                'slug' => 'business-yearly',
                'description' => 'Run advanced chatbot workflows for up to three organizations.',
                'amount' => '299.99',
                'amount_minor' => 29999,
                'currency' => 'USD',
                'billing_interval' => 'year',
                'stripe_price_id' => 'price_1TmIUi1Oz8XVPHYWrVJ52Bbh',
                'stripe_product_id' => 'prod_UlqB8s4DgeE0tf',
                'features' => [
                    'Advanced chatbot workflows',
                    '3 organizations',
                    'Chatbot analytics',
                    'Priority support',
                ],
                'limits' => [
                    'organizations' => 3,
                    'projects' => 50,
                    'storage' => '100GB',
                ],
                'is_popular' => false,
                'sort_order' => 4,
            ],
            [
                'name' => 'Enterprise Monthly',
                'slug' => 'enterprise-monthly',
                'description' => 'Create unlimited industry workspaces with custom chatbot capabilities.',
                'amount' => '99.00',
                'amount_minor' => 9900,
                'currency' => 'USD',
                'billing_interval' => 'month',
                'stripe_price_id' => 'price_1TmIda1Oz8XVPHYW7Teh4Uct',
                'stripe_product_id' => 'prod_UlqIShYZ8kR2mg',
                'features' => [
                    'Custom chatbot workflows',
                    'Unlimited organizations',
                    'Chatbot integrations',
                    'Dedicated support',
                ],
                'limits' => [
                    'organizations' => 'unlimited',
                    'projects' => 100,
                    'storage' => '250GB',
                ],
                'is_popular' => false,
                'sort_order' => 5,
            ],
            [
                'name' => 'Enterprise Yearly',
                'slug' => 'enterprise-yearly',
                'description' => 'An annual enterprise plan for organizations with larger workloads.',
                'amount' => '949.00',
                'amount_minor' => 94900,
                'currency' => 'USD',
                'billing_interval' => 'year',
                'stripe_price_id' => 'price_1TmIcD1Oz8XVPHYWNIUAJlsK',
                'stripe_product_id' => 'prod_UlqIShYZ8kR2mg',
                'features' => [
                    'Custom chatbot workflows',
                    'Unlimited organizations',
                    'Chatbot integrations',
                    'Dedicated support',
                ],
                'limits' => [
                    'organizations' => 'unlimited',
                    'projects' => 100,
                    'storage' => '250GB',
                ],
                'is_popular' => false,
                'sort_order' => 6,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(
                ['slug' => $plan['slug']],
                [
                    'name' => $plan['name'],
                    'description' => $plan['description'],
                    'amount' => $plan['amount'],
                    'amount_minor' => $plan['amount_minor'],
                    'currency' => $plan['currency'],
                    'billing_interval' => $plan['billing_interval'],
                    'stripe_price_id' => $plan['stripe_price_id'],
                    'is_active' => true,
                    'features' => $plan['features'],
                    'metadata' => [
                        'stripe_product_id' => $plan['stripe_product_id'],
                    ],
                    'stripe_plan_id' => null,
                    'price' => $plan['amount'],
                    'interval' => $plan['billing_interval'],
                    'limits' => $plan['limits'],
                    'is_popular' => $plan['is_popular'],
                    'sort_order' => $plan['sort_order'],
                ],
            );
        }
    }
}
