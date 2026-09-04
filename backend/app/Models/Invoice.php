<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'subscription_id',
        'stripe_invoice_id',
        'amount',
        'currency',
        'status',
        'invoice_date',
        'billing_period_start',
        'billing_period_end',
        'invoice_url',
        'invoice_pdf',
        'payment_reference',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'invoice_date' => 'datetime',
        'billing_period_start' => 'datetime',
        'billing_period_end' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', 'paid');
    }

    public function scopeVisible(Builder $query): Builder
    {
        return $query->whereIn('status', ['paid', 'pending', 'failed']);
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }
}
