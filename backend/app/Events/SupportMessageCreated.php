<?php

namespace App\Events;

use App\Models\SupportMessage;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportMessageCreated implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public SupportMessage $message) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('support.conversation.'.$this->message->conversation_id)];
    }

    public function broadcastAs(): string { return 'support.message.created'; }

    public function broadcastWith(): array
    {
        return ['message' => $this->message->load('sender')->toArray()];
    }
}
