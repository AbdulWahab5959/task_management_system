<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->stripe_invoice_id,
            'plan' => $this->subscription?->plan?->name,
            'amount' => $this->amount,
            'currency' => strtoupper((string) $this->currency),
            'status' => $this->status,
            'invoice_date' => $this->invoice_date?->toISOString() ?? $this->created_at?->toISOString(),
            'billing_period_start' => $this->billing_period_start?->toISOString(),
            'billing_period_end' => $this->billing_period_end?->toISOString(),
            'paid_at' => $this->paid_at?->toISOString(),
            'payment_reference' => $this->payment_reference,
            'invoice_url' => $this->invoice_url,
            'invoice_pdf_available' => filled($this->invoice_pdf),
        ];
    }
}
