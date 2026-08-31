<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('support.conversation.{conversationId}', function ($user, $conversationId) {
    $conversation = \App\Models\SupportConversation::query()->find($conversationId);

    if (! $conversation) {
        return false;
    }

    if ($user->role === \App\Models\User::ROLE_SUPER_ADMIN) {
        return true;
    }

    // Only the conversation owner may join, and only while their
    // organization stays active for support.
    $isOwner = (int) $conversation->user_id === (int) $user->id;

    return $isOwner
        && $conversation->organization?->isActive()
        && $conversation->organization->users()->whereKey($user->id)->exists();
});
