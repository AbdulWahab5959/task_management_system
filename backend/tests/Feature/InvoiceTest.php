<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_owner_can_paginate_and_filter_invoices(): void
    {
        [$user, $plan, $subscription] = $this->fixture();
        Invoice::create($this->invoiceData($subscription, ['stripe_invoice_id' => 'in_paid', 'status' => 'paid', 'invoice_date' => now()->subDay()]));
        Invoice::create($this->invoiceData($subscription, ['stripe_invoice_id' => 'in_failed', 'status' => 'failed', 'invoice_date' => now()->subDays(4)]));

        $this->actingAs($user)->getJson('/api/billing/invoices?status=paid&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.invoice_number', 'in_paid');
    }

    public function test_invoice_access_is_scoped_to_the_authenticated_user(): void
    {
        [$owner, $plan, $subscription] = $this->fixture();
        $invoice = Invoice::create($this->invoiceData($subscription));
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)->getJson('/api/billing/invoices/'.$invoice->id)->assertNotFound();
        $this->actingAs($otherUser)->getJson('/api/billing/invoices/'.$invoice->id.'/download')->assertNotFound();
    }

    public function test_unauthenticated_users_cannot_list_invoices(): void
    {
        $this->getJson('/api/billing/invoices')->assertUnauthorized();
    }

    public function test_missing_pdf_returns_a_safe_not_found_response(): void
    {
        [$user, $plan, $subscription] = $this->fixture();
        $invoice = Invoice::create($this->invoiceData($subscription, ['invoice_pdf' => null]));

        $this->actingAs($user)->getJson('/api/billing/invoices/'.$invoice->id.'/download')
            ->assertNotFound()
            ->assertJson(['message' => 'This invoice PDF is not available yet.']);
    }

    private function fixture(): array
    {
        $user = User::factory()->create();
        $plan = Plan::create([
            'name' => 'Invoice Test Plan', 'slug' => 'invoice-test-plan', 'amount' => 29.99, 'amount_minor' => 2999,
            'currency' => 'USD', 'billing_interval' => 'month', 'interval' => 'month', 'price' => 29.99,
            'features' => [], 'metadata' => [], 'limits' => [], 'is_active' => true,
        ]);
        $subscription = Subscription::create(['user_id' => $user->id, 'plan_id' => $plan->id, 'gateway' => 'stripe', 'status' => 'active', 'stripe_subscription_id' => 'sub_invoice_test_'.uniqid()]);
        return [$user, $plan, $subscription];
    }

    private function invoiceData(Subscription $subscription, array $overrides = []): array
    {
        return array_merge(['subscription_id' => $subscription->id, 'stripe_invoice_id' => 'in_invoice_test_'.uniqid(), 'amount' => 29.99, 'currency' => 'USD', 'status' => 'pending'], $overrides);
    }
}
