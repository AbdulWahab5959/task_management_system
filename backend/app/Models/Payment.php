<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_VERIFICATION_FAILED = 'verification_failed';
    public const STATUS_REFUNDED = 'refunded';
    public const STATUS_PARTIALLY_REFUNDED = 'partially_refunded';

    protected $fillable = [
        'user_id',
        'subscription_id',
        'plan_id',
        'gateway',
        'reference',
        'provider_session_id',
        'provider_payment_id',
        'provider_payment_intent_id',
        'provider_charge_id',
        'provider_invoice_id',
        'amount',
        'currency',
        'status',
        'checkout_url',
        'failure_reason',
        'raw_provider_status',
        'refunded_amount',
        'refund_status',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function refunds(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Refund::class);
    }

    public function isFullyRefunded(): bool
    {
        return $this->refund_status === 'refunded' || $this->status === self::STATUS_REFUNDED;
    }

    public function isPartiallyRefunded(): bool
    {
        return $this->refund_status === 'partially_refunded' || $this->status === self::STATUS_PARTIALLY_REFUNDED;
    }

    public function getRefundableAmount(): float
    {
        return max(0, (float) $this->amount - (float) $this->refunded_amount);
    }
}
