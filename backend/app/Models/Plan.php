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
        'stripe_plan_id',
        'price',
        'interval',
        'features',
        'limits',
        'is_popular',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'features' => 'array',
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
        return '$' . number_format($this->price, 2);
    }

    public function isFree(): bool
    {
        return $this->price == 0;
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
