<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContactMessageController extends Controller
{
    public function __construct(
        private readonly ActivityLogService $activityLogService,
    ) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $search = $validated['search'] ?? null;
        $perPage = $validated['per_page'] ?? 10;

        $messages = ContactMessage::query()
            ->when($search, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json($messages);
    }

    public function show(ContactMessage $contactMessage)
    {
        return response()->json($contactMessage);
    }

    public function updateStatus(Request $request, ContactMessage $contactMessage)
    {
        $admin = $request->user();

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(ContactMessage::STATUSES)],
        ]);

        $oldStatus = $contactMessage->status;
        $contactMessage->update([
            'status' => $validated['status'],
        ]);

        $this->activityLogService->log(
            action: 'contact_message_status_update',
            description: "Admin updated contact message status: {$contactMessage->email} ({$oldStatus} \u2192 {$validated['status']})",
            properties: [
                'admin_id' => $admin->id,
                'admin_email' => $admin->email,
                'contact_message_id' => $contactMessage->id,
                'contact_email' => $contactMessage->email,
                'subject' => $contactMessage->subject,
                'changes' => ['status' => ['old' => $oldStatus, 'new' => $validated['status']]],
            ],
            userId: $admin->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json($contactMessage);
    }

    public function destroy(ContactMessage $contactMessage)
    {
        $admin = request()->user();

        $this->activityLogService->log(
            action: 'contact_message_status_update',
            description: "Admin deleted contact message from: {$contactMessage->email}",
            properties: [
                'admin_id' => $admin->id,
                'admin_email' => $admin->email,
                'contact_message_id' => $contactMessage->id,
                'contact_email' => $contactMessage->email,
                'subject' => $contactMessage->subject,
            ],
            userId: $admin->id,
            ipAddress: request()->ip(),
            userAgent: request()->userAgent(),
        );

        $contactMessage->delete();

        return response()->noContent();
    }
}