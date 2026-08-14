<?php

namespace App\Mail;

use App\Models\TenantInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TenantInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly TenantInvitation $invitation,
        public readonly string $token,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to join {$this->invitation->tenant->name} on LaunchStack",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tenant-invitation',
            with: [
                'invitationUrl' => rtrim((string) env('FRONTEND_URL', config('app.url')), '/')
                    .'/invite/accept?token='.urlencode($this->token),
                'tenantName' => $this->invitation->tenant->name,
                'inviterName' => $this->invitation->inviter?->name ?? 'A LaunchStack administrator',
                'role' => $this->invitation->role,
                'expiresAt' => $this->invitation->expires_at,
            ],
        );
    }
}
