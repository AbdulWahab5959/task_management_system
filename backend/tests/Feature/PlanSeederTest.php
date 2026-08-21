<?php

namespace Tests\Feature;

use App\Models\Plan;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_plan_seeder_is_idempotent_and_uses_the_expected_stripe_data(): void
    {
        $this->seed(PlanSeeder::class);
        $this->seed(PlanSeeder::class);

        $expectedPlans = [
            'starter-monthly' => ['9.99', 999, 'month', 'price_1TmI2U1Oz8XVPHYWFE6vveyB', 'prod_UlphTeaK92H5er'],
            'pro-monthly' => ['29.99', 2999, 'month', 'price_1TmIPc1Oz8XVPHYW2vf5KFem', 'prod_Ulq5Rxe3Hpsn1k'],
            'pro-yearly' => ['279.00', 27900, 'year', 'price_1TmIPd1Oz8XVPHYWV4w77fJg', 'prod_Ulq5Rxe3Hpsn1k'],
            'business-yearly' => ['299.99', 29999, 'year', 'price_1TmIUi1Oz8XVPHYWrVJ52Bbh', 'prod_UlqB8s4DgeE0tf'],
            'enterprise-monthly' => ['99.00', 9900, 'month', 'price_1TmIda1Oz8XVPHYW7Teh4Uct', 'prod_UlqIShYZ8kR2mg'],
            'enterprise-yearly' => ['949.00', 94900, 'year', 'price_1TmIcD1Oz8XVPHYWNIUAJlsK', 'prod_UlqIShYZ8kR2mg'],
        ];

        $this->assertDatabaseCount('plans', count($expectedPlans));

        foreach ($expectedPlans as $slug => [$amount, $amountMinor, $interval, $priceId, $productId]) {
            $plan = Plan::query()->where('slug', $slug)->firstOrFail();

            $this->assertSame($amount, $plan->amount);
            $this->assertSame($amount, $plan->price);
            $this->assertSame($amountMinor, $plan->amount_minor);
            $this->assertSame($interval, $plan->billing_interval);
            $this->assertSame($interval, $plan->interval);
            $this->assertSame($priceId, $plan->stripe_price_id);
            $this->assertNull($plan->stripe_plan_id);
            $this->assertSame('USD', $plan->currency);
            $this->assertSame($productId, $plan->metadata['stripe_product_id']);
            $this->assertIsArray($plan->features);
            $this->assertIsArray($plan->limits);
            $this->assertIsArray($plan->entitlements());
            $this->assertTrue($plan->is_active);
        }

        $this->assertSame(6, Plan::query()->distinct()->count('slug'));
        $this->assertSame(6, Plan::query()->distinct()->count('stripe_price_id'));
        $this->assertSame(1, Plan::query()->where('slug', 'starter-monthly')->firstOrFail()->getLimit('organizations'));
        $this->assertSame(2, Plan::query()->whereIn('slug', ['pro-monthly', 'pro-yearly'])->pluck('limits')->map(fn ($limits) => $limits['organizations'])->unique()->first());
        $this->assertSame(3, Plan::query()->where('slug', 'business-yearly')->firstOrFail()->getLimit('organizations'));
        $this->assertSame('unlimited', Plan::query()->where('slug', 'enterprise-monthly')->firstOrFail()->getLimit('organizations'));
    }
}
