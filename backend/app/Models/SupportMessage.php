<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    use HasFactory;

    protected $fillable = ['conversation_id', 'sender_id', 'sender_role', 'message', 'read_at', 'meta'];

    protected $casts = ['read_at' => 'datetime', 'meta' => 'array'];

    public function conversation(): BelongsTo { return $this->belongsTo(SupportConversation::class, 'conversation_id'); }

    public function sender(): BelongsTo { return $this->belongsTo(User::class, 'sender_id'); }
}
