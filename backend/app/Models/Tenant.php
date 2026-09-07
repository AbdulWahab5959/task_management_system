<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'name',
        'slug',
        'domain',
        'database_name',
        'plan_id',
        'owner_id',
        'status',
        'trial_ends_at',
        'is_primary',
        'archived_at',
        'permanent_deletion_scheduled_at',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'is_primary' => 'boolean',
        'archived_at' => 'datetime',
        'permanent_deletion_scheduled_at' => 'datetime',
    ];

    // Relationships
    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'tenant_users')
            ->withPivot('role', 'joined_at')
            ->withTimestamps();
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function subscription()
    {
        return $this->hasOne(Subscription::class)->latest();
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    // Helper Methods
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isOnTrial(): bool
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->currentSubscription() !== null;
    }

    public function currentSubscription(): ?Subscription
    {
        $subscription = $this->subscriptions()->with('plan')->latest()->first();

        return $subscription && in_array($subscription->status, ['active', 'trialing'], true)
            ? $subscription
            : null;
    }

    public function configure()
    {
        $driver = config('database.connections.tenant.driver', 'sqlite');
        $dbName = $driver === 'sqlite'
            ? database_path($this->database_name . '.sqlite')
            : $this->database_name;

        config(['database.connections.tenant.database' => $dbName]);
        \DB::purge('tenant');
        \DB::reconnect('tenant');
    }

    public function run(callable $callback)
    {
        // Save original connection
        $originalTenant = app()->bound('currentTenant') ? app('currentTenant') : null;
        
        $this->configure();
        app()->instance('currentTenant', $this);
        
        try {
            $result = $callback();
        } finally {
            // Restore original tenant if existed
            if ($originalTenant) {
                $originalTenant->configure();
                app()->instance('currentTenant', $originalTenant);
            } else {
                app()->forgetInstance('currentTenant');
                \DB::purge('tenant');
            }
        }

        return $result;
    }
}
