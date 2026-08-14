<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'email_enabled',
        'billing_enabled',
        'team_enabled',
        'security_enabled',
        'marketing_enabled',
        'timezone',
        'locale',
    ];

    protected $casts = [
        'email_enabled' => 'boolean',
        'billing_enabled' => 'boolean',
        'team_enabled' => 'boolean',
        'security_enabled' => 'boolean',
        'marketing_enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
