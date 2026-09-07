<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UsageRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'tenant_id',
        'metric',
        'period_start',
        'quantity',
    ];

    protected $casts = [
        'period_start' => 'date',
        'quantity' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
