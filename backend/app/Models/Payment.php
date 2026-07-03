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
        'gateway_subscription_id',
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

    /**
     * Determine if this payment can be refunded.
     * This checks all conditions for refund eligibility.
     */
    public function canBeRefunded(): bool
    {
        return $this->getRefundDisabledReason() === null;
    }

    /**
     * Get the reason why a payment cannot be refunded, or null if it can be refunded.
     * This follows the business rules for refund eligibility.
     */
    public function getRefundDisabledReason(): ?string
    {
        // Check 1: Payment status must be paid or partially_refunded
        if (!in_array($this->status, [self::STATUS_PAID, self::STATUS_PARTIALLY_REFUNDED], true)) {
            return "Refund unavailable because this payment status is '{$this->status}'.";
        }

        // Check 2: Payment gateway must be stripe
        if ($this->gateway !== 'stripe') {
            return "Refund unavailable for {$this->gateway} payments. Only Stripe payments can be refunded.";
        }

        // Check 3: Payment must have valid Stripe reference (pi_ or ch_)
        $hasValidRefundSource = false;
        if ($this->provider_payment_intent_id && str_starts_with($this->provider_payment_intent_id, 'pi_')) {
            $hasValidRefundSource = true;
        } elseif ($this->provider_charge_id && str_starts_with($this->provider_charge_id, 'ch_')) {
            $hasValidRefundSource = true;
        }

        if (!$hasValidRefundSource) {
            return 'Refund unavailable: missing Stripe PaymentIntent or Charge ID.';
        }

        // Check 4: Remaining refundable amount must be greater than 0
        if ($this->getRefundableAmount() <= 0) {
            return 'Refund unavailable because there is no remaining refundable amount.';
        }

        // Check 5: Related subscription must be cancelled
        if ($this->subscription_id) {
            $subscription = $this->subscription;
            if ($subscription) {
                // Only allow refunds for cancelled subscriptions
                if ($subscription->status !== 'cancelled') {
                    return 'Refund available only for cancelled subscriptions. Please cancel the subscription first.';
                }
            }
        }

        // All checks passed
        return null;
    }
}
