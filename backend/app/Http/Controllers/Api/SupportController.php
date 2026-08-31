<?php

namespace App\Http\Controllers\Api;

use App\Events\SupportMessageCreated;
use App\Http\Controllers\Controller;
use App\Http\Requests\SupportMessageRequest;
use App\Models\SupportConversation;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SupportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class SupportController extends Controller
{
    public function __construct(private readonly SupportService $support) {}

    public function faqs(): array { return ['data' => $this->support->faqs()]; }

    public function faqAnswer(Request $request, string $slug): array
    {
        return ['data' => $this->support->faqAnswer($slug, $request->user())];
    }

    public function faqInteraction(Request $request, string $slug): array
    {
        $conversation = $this->ownedConversation($request);
        $question = $this->support->faqQuestion($slug);
        $faq = $this->support->faqAnswer($slug, $request->user());
        $message = $this->support->createFaqMessage($conversation, $request->user(), $question, $faq['answer'], $slug, $faq['type']);

        return ['data' => $message->load('sender')];
    }

    public function show(Request $request): array
    {
        $conversation = $this->support->conversationFor($request->user(), $this->organizationFromRequest($request));
        return ['data' => $this->conversationPayload($conversation, $request->user())];
    }

    public function messages(Request $request): array
    {
        $conversation = $this->ownedConversation($request);
        return ['data' => $this->support->messages($conversation)->get()->reverse()->values()];
    }

    public function send(SupportMessageRequest $request): array
    {
        $conversation = $this->ownedConversation($request);
        $message = $this->support->createMessage($conversation, $request->user(), $request->validated('message'));
        $this->broadcastSafely($message);
        return ['data' => $message->load('sender')];
    }

    public function markRead(Request $request): array
    {
        $conversation = $this->ownedConversation($request);
        $this->support->markRead($conversation, $request->user());
        return ['message' => 'Support messages marked as read.'];
    }

    public function updateStatus(Request $request, string $status): array
    {
        $conversation = $this->ownedConversation($request);

        return ['data' => $this->support->updateStatus($conversation, $status)];
    }

    public function adminIndex(Request $request): array
    {
        return ['data' => $this->support->adminConversations(
            $request->user(),
            $request->input('status'),
            $request->input('search')
        )];
    }

    public function adminShow(Request $request, SupportConversation $conversation): array
    {
        return ['data' => $this->conversationPayload($conversation, $request->user())];
    }

    public function adminMessages(Request $request, SupportConversation $conversation): array
    {
        return ['data' => $this->support->messages($conversation)->get()->reverse()->values()];
    }

    public function adminSend(SupportMessageRequest $request, SupportConversation $conversation): array
    {
        $message = $this->support->createMessage($conversation, $request->user(), $request->validated('message'));
        $this->broadcastSafely($message);
        return ['data' => $message->load('sender')];
    }

    public function adminMarkRead(Request $request, SupportConversation $conversation): array
    {
        $this->support->markRead($conversation, $request->user());
        return ['message' => 'Support messages marked as read.'];
    }

    public function adminStatus(Request $request, SupportConversation $conversation, string $status): array
    {
        return ['data' => $this->support->updateStatus($conversation, $status)];
    }

    private function ownedConversation(Request $request): SupportConversation
    {
        $user = $request->user();
        $query = SupportConversation::query()
            ->where('user_id', $user->id)
            ->whereHas('organization', static function ($organizations) use ($user): void {
                $organizations->where('status', Tenant::STATUS_ACTIVE)
                    ->whereHas('users', static fn ($users) => $users->whereKey($user->id));
            });
        $organization = $this->organizationFromRequest($request);

        if ($organization) {
            $query->where('organization_id', $organization->id);
        }

        return $query->firstOrFail();
    }

    private function organizationFromRequest(Request $request): ?Tenant
    {
        $organizationId = $request->header('X-Tenant-ID');
        if ($organizationId === null || $organizationId === '') {
            return null;
        }

        $organization = Tenant::query()->find($organizationId);
        if (! $organization) {
            abort(404, 'Organization not found.');
        }

        if (! $organization->isActive()) {
            abort(403, 'This organization is not available.');
        }

        if (! $request->user()->hasAccessToTenant($organization)) {
            abort(403, 'You do not have access to this organization.');
        }

        return $organization;
    }

    private function conversationPayload(SupportConversation $conversation, User $viewer): array
    {
        return $conversation->load(['user:id,name,email', 'organization:id,name'])->toArray();
    }

    private function broadcastSafely($message): void
    {
        try {
            broadcast(new SupportMessageCreated($message));
        } catch (Throwable $exception) {
            // Realtime is best-effort: a WebSocket or Reverb failure must never
            // lose a persisted message or surface internals. Log safe metadata only.
            Log::warning('Support message realtime broadcast failed.', [
                'message_id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'reason' => $exception::class,
            ]);
        }
    }
}
