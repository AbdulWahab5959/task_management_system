<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class TenantInvitation extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_REVOKED = 'revoked';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'tenant_id',
        'email',
        'role',
        'token_hash',
        'invited_by',
        'status',
        'expires_at',
        'accepted_at',
        'rejected_at',
        'revoked_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function hasExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING && !$this->hasExpired();
    }

    public function effectiveStatus(): string
    {
        return $this->status === self::STATUS_PENDING && $this->hasExpired()
            ? self::STATUS_EXPIRED
            : $this->status;
    }
}
