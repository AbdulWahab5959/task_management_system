<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Subscription;
use Illuminate\Support\Carbon;

class InvoiceService
{
    public function upsertFromStripe(array $data, ?Subscription $subscription = null, ?string $statusOverride = null): ?Invoice
    {
        $stripeInvoiceId = $this->string($data['id'] ?? null);
        if (! $stripeInvoiceId || ! $subscription) {
            return null;
        }

        $status = $statusOverride ?: match ($this->string($data['status'] ?? null)) {
            'paid' => 'paid',
            'uncollectible', 'void' => 'failed',
            default => 'pending',
        };
        $paidAt = $this->date($data['status_transitions']['paid_at'] ?? null);
        $amountMinor = $status === 'paid'
            ? ($data['amount_paid'] ?? $data['total'] ?? 0)
            : ($data['amount_due'] ?? $data['total'] ?? 0);

        $attributes = [
            'subscription_id' => $subscription->id,
            'amount' => ((float) $amountMinor) / 100,
            'currency' => strtoupper($this->string($data['currency'] ?? null) ?: 'USD'),
            'status' => $status,
            'invoice_date' => $this->date($data['created'] ?? null) ?? now(),
            'billing_period_start' => $this->date($data['lines']['data'][0]['period']['start'] ?? $data['period_start'] ?? null),
            'billing_period_end' => $this->date($data['lines']['data'][0]['period']['end'] ?? $data['period_end'] ?? null),
            'payment_reference' => $this->safePaymentReference($data),
        ];

        foreach (['hosted_invoice_url' => 'invoice_url', 'invoice_pdf' => 'invoice_pdf'] as $source => $target) {
            if ($value = $this->string($data[$source] ?? null)) {
                $attributes[$target] = $value;
            }
        }
        if ($status === 'paid') {
            $attributes['paid_at'] = $paidAt ?? now();
        }

        $invoice = Invoice::query()->firstOrNew(['stripe_invoice_id' => $stripeInvoiceId]);
        $existingUrls = [
            'invoice_url' => $invoice->invoice_url,
            'invoice_pdf' => $invoice->invoice_pdf,
        ];
        $invoice->fill($attributes);
        foreach ($existingUrls as $key => $value) {
            if (! array_key_exists($key, $attributes) && $value) {
                $invoice->{$key} = $value;
            }
        }
        $invoice->save();

        return $invoice->fresh();
    }

    private function safePaymentReference(array $data): ?string
    {
        $value = $data['payment_intent'] ?? null;
        if (is_array($value)) {
            $value = $value['id'] ?? null;
        }
        return is_string($value) && preg_match('/^pi_[A-Za-z0-9_]+$/', $value) ? $value : null;
    }

    private function string(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }

    private function date(mixed $value): ?Carbon
    {
        return is_numeric($value) ? Carbon::createFromTimestamp((int) $value) : null;
    }
}
