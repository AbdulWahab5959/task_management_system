<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'amount',
        'amount_minor',
        'currency',
        'billing_interval',
        'stripe_price_id',
        'is_active',
        'features',
        'metadata',
        // Legacy admin fields retained while the dashboard is migrated.
        'stripe_plan_id',
        'price',
        'interval',
        'limits',
        'is_popular',
        'sort_order',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'amount_minor' => 'integer',
        'price' => 'decimal:2',
        'currency' => 'string',
        'billing_interval' => 'string',
        'features' => 'array',
        'metadata' => 'array',
        'limits' => 'array',
        'is_popular' => 'boolean',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function tenants()
    {
        return $this->hasMany(Tenant::class);
    }

    // Helper Methods
    public function getFormattedPrice(): string
    {
        return '$' . number_format((float) $this->amount, 2);
    }

    public function isFree(): bool
    {
        return (float) $this->amount === 0.0;
    }

    public function getLimit(string $key, $default = null)
    {
        return $this->limits[$key] ?? $default;
    }

    public function hasFeature(string $feature): bool
    {
        return is_array($this->features) && in_array($feature, $this->features);
    }
}
