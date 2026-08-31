<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SupportConversation extends Model
{
    use HasFactory;

    public const STATUSES = ['open', 'pending', 'closed'];

    protected $fillable = ['user_id', 'organization_id', 'status', 'last_message_at'];

    protected $casts = ['last_message_at' => 'datetime'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function organization(): BelongsTo { return $this->belongsTo(Tenant::class, 'organization_id'); }

    public function messages(): HasMany { return $this->hasMany(SupportMessage::class, 'conversation_id'); }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(SupportMessage::class, 'conversation_id')->latestOfMany();
    }
}
