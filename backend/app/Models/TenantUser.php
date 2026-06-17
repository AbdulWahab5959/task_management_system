<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class TenantUser extends Pivot
{
    protected $table = 'tenant_users';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'role',
        'invited_by',
        'invited_at',
        'joined_at',
    ];

    protected $casts = [
        'invited_at' => 'datetime',
        'joined_at' => 'datetime',
    ];
}
