<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class SupportService
{
    public const SUPPORT_MESSAGES_PAGE_SIZE = 50;

    public function conversationFor(User $user, ?Tenant $organization = null): SupportConversation
    {
        $organization ??= $user->tenants()
            ->where('tenants.status', Tenant::STATUS_ACTIVE)
            ->orderBy('tenants.id')
            ->first();

        if (! $organization || ! $organization->isActive() || ! $user->hasAccessToTenant($organization)) {
            abort(403, 'You do not have access to this organization.');
        }

        $conversation = SupportConversation::query()
            ->where('user_id', $user->id)
            ->where('organization_id', $organization->id)
            ->first();
        if ($conversation) {
            return $conversation;
        }

        return SupportConversation::query()->create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'status' => 'open',
        ]);
    }

    public function messages(SupportConversation $conversation): HasMany
    {
        return $conversation->messages()->with('sender')->latest('id');
    }

    /**
     * Return a bounded, chronological page of messages older than the cursor.
     * The cursor is opaque to callers and scoped by the conversation query.
     */
    public function messagePage(SupportConversation $conversation, ?string $cursor, int $limit = self::SUPPORT_MESSAGES_PAGE_SIZE): array
    {
        $beforeId = $cursor === null ? null : $this->decodeMessageCursor($cursor);
        $limit = min(max($limit, 1), self::SUPPORT_MESSAGES_PAGE_SIZE);

        $messages = $this->messages($conversation)
            ->when($beforeId !== null, static fn ($query) => $query->where('support_messages.id', '<', $beforeId))
            ->limit($limit + 1)
            ->get();

        $hasMore = $messages->count() > $limit;
        $messages = $messages->take($limit)->reverse()->values();

        return [
            'data' => $messages,
            'next_cursor' => $hasMore && $messages->isNotEmpty()
                ? $this->encodeMessageCursor((int) $messages->first()->id)
                : null,
            'has_more' => $hasMore,
        ];
    }

    private function encodeMessageCursor(int $messageId): string
    {
        return rtrim(strtr(base64_encode(json_encode(['id' => $messageId], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    private function decodeMessageCursor(string $cursor): int
    {
        $normalized = strtr($cursor, '-_', '+/');
        $normalized .= str_repeat('=', (4 - strlen($normalized) % 4) % 4);
        $decoded = base64_decode($normalized, true);
        if ($decoded === false) {
            abort(422, 'Invalid support message cursor.');
        }

        $payload = json_decode($decoded, true);
        $messageId = is_array($payload) ? ($payload['id'] ?? null) : null;
        if (! is_int($messageId) && ! (is_string($messageId) && ctype_digit($messageId))) {
            abort(422, 'Invalid support message cursor.');
        }

        return (int) $messageId;
    }

    public function senderRole(User $user, SupportConversation $conversation): string
    {
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return User::ROLE_SUPER_ADMIN;
        }

        return (string) ($user->tenants()->where('tenants.id', $conversation->organization_id)->first()?->pivot?->role ?? $user->role);
    }

    private function applyConversationStatus(SupportConversation $conversation, User $sender): void
    {
        $isCustomer = (int) $conversation->user_id === (int) $sender->id;

        // A support reply moves the conversation back to open; anything a
        // customer sends (even on a closed chat) means support is needed.
        $conversation->update(['status' => $isCustomer ? 'pending' : 'open']);
    }

    public function createMessage(SupportConversation $conversation, User $sender, string $message): SupportMessage
    {
        return DB::transaction(function () use ($conversation, $sender, $message) {
            // A customer message means support is needed again; any support
            // reply marks the conversation as actively handled.
            $this->applyConversationStatus($conversation, $sender);

            $supportMessage = $conversation->messages()->create([
                'sender_id' => $sender->id,
                'sender_role' => $this->senderRole($sender, $conversation),
                'message' => $message,
            ]);
            $conversation->update(['last_message_at' => $supportMessage->created_at]);

            return $supportMessage;
        });
    }

    public function createFaqMessage(SupportConversation $conversation, User $user, string $question, string $answer, string $slug, string $type = 'faq'): SupportMessage
    {
        return DB::transaction(function () use ($conversation, $user, $question, $answer, $slug, $type) {
            // Selecting the same FAQ repeatedly must not create duplicate rows.
            $latest = $conversation->messages()->orderByDesc('id')->first();
            $isDuplicate = $latest !== null
                && $latest->sender_role === 'system'
                && ($latest->meta['slug'] ?? null) === $slug
                && ($latest->meta['type'] ?? null) === $type;

            if ($isDuplicate) {
                return $latest;
            }

            if ($conversation->status === 'closed' || $type === 'handoff') {
                // Reopening a closed chat, or requesting a human handoff, means
                // the customer is waiting for the support team.
                $conversation->update(['status' => 'pending']);
            }

            $message = $conversation->messages()->create([
                'sender_id' => $user->id,
                'sender_role' => 'system',
                'message' => "Question: {$question}\n\nAnswer: {$answer}",
                'meta' => ['type' => $type, 'slug' => $slug, 'question' => $question],
            ]);
            $conversation->update(['last_message_at' => $message->created_at]);

            return $message;
        });
    }

    public function adminConversations(User $viewer, ?string $status, ?string $search): LengthAwarePaginator
    {
        return SupportConversation::query()
            ->with(['user:id,name,email', 'organization:id,name', 'latestMessage.sender:id,name'])
            ->withCount(['messages as unread_count' => static fn ($messages) => $messages->whereNull('read_at')->where('sender_id', '!=', $viewer->id)])
            ->when($status, static fn ($query, $status) => $query->where('status', $status))
            ->when($search, static function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->whereHas('user', static fn ($users) => $users->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('organization', static fn ($organizations) => $organizations->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate(30);
    }

    public function updateStatus(SupportConversation $conversation, string $status): SupportConversation
    {
        abort_unless(in_array($status, ['open', 'closed'], true), 422, 'Invalid support conversation status.');

        $conversation->update(['status' => $status]);

        return $conversation->fresh();
    }

    public function markRead(SupportConversation $conversation, User $reader): int
    {
        return $conversation->messages()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $reader->id)
            ->update(['read_at' => now()]);
    }

    public function faqs(): array
    {
        return [
            ['category' => 'Plans and pricing', 'questions' => [
                ['slug' => 'plans-available', 'question' => 'What plans are available?'],
                ['slug' => 'upgrade-plan', 'question' => 'How can I upgrade my plan?'],
            ]],
            ['category' => 'Organizations', 'questions' => [
                ['slug' => 'organization-limit', 'question' => 'What is my organization limit?'],
            ]],
            ['category' => 'Team members', 'questions' => [
                ['slug' => 'invite-team-member', 'question' => 'How do I invite a team member?'],
            ]],
            ['category' => 'Billing', 'questions' => [
                ['slug' => 'cancel-subscription', 'question' => 'How can I cancel my subscription?'],
            ]],
            ['category' => 'Account settings', 'questions' => [],
            ],
            ['category' => 'Technical support', 'questions' => [
                ['slug' => 'talk-to-support', 'question' => 'Talk to support'],
            ]],
        ];
    }

    public function faqAnswer(string $slug, User $user): array
    {
        return match ($slug) {
            'plans-available' => ['type' => 'faq', 'answer' => $this->plansAnswer()],
            'organization-limit' => ['type' => 'faq', 'answer' => $this->organizationLimitAnswer($user)],
            'upgrade-plan' => ['type' => 'faq', 'answer' => 'Open Billing from the dashboard, choose an available plan, and complete checkout. Your plan and payment status are confirmed by the backend.'],
            'cancel-subscription' => ['type' => 'faq', 'answer' => 'Open Billing from the dashboard to review your subscription and use the cancellation controls. Your access and billing status remain governed by the current subscription record.'],
            'invite-team-member' => ['type' => 'faq', 'answer' => 'Open Team from the dashboard, enter the teammate’s email, choose their role, and send the invitation.'],
            'talk-to-support' => ['type' => 'handoff', 'answer' => 'I’ve opened your private support conversation. Send a message below and a LaunchStack support admin will reply.'],
            default => abort(404, 'FAQ question not found.'),
        };
    }

    public function faqQuestion(string $slug): string
    {
        foreach ($this->faqs() as $category) {
            foreach ($category['questions'] as $question) {
                if ($question['slug'] === $slug) {
                    return $question['question'];
                }
            }
        }

        abort(404, 'FAQ question not found.');
    }

    private function plansAnswer(): string
    {
        $plans = Plan::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();
        if ($plans->isEmpty()) {
            return 'There are no active plans available right now. Select Talk to support and we’ll help you.';
        }

        return 'Available plans: '.$plans->map(fn (Plan $plan) => $plan->name.' ('.$plan->getFormattedPrice().' / '.($plan->billing_interval ?? $plan->interval ?? 'period').')')->implode(', ').'.';
    }

    private function organizationLimitAnswer(User $user): string
    {
        $subscription = app(TenantSubscriptionResolver::class)->forUser($user);
        $plan = $subscription?->plan;
        $limit = $plan?->getLimit('organizations', $plan?->getLimit('organization_limit'));
        $used = $user->ownedTenants()->where('status', Tenant::STATUS_ACTIVE)->count();
        $formattedLimit = $limit === 'unlimited' ? 'unlimited' : (string) ($limit ?? 'not available');
        $planName = $plan?->name ?? 'No active plan';

        return "Your current {$planName} plan allows {$formattedLimit} organizations. You currently use {$used} organization".($used === 1 ? '' : 's').'.';
    }
}
