<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'gateway',
        'provider_event_id',
        'event_type',
        'payload',
        'processed_at',
        'failed_at',
        'failure_reason',
    ];

    protected $casts = [
        'payload' => 'array',
        'processed_at' => 'datetime',
        'failed_at' => 'datetime',
    ];
}
