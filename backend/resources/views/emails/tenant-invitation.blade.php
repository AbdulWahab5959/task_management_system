<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LaunchStack invitation</title>
</head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:36px;">
            <p style="color:#4f46e5;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">LaunchStack</p>
            <h1 style="font-size:28px;margin:16px 0 12px;">You're invited to join {{ $tenantName }}</h1>
            <p style="color:#475569;line-height:1.6;">{{ $inviterName }} invited you to join this organization as a {{ $role }}.</p>
            <p style="color:#475569;line-height:1.6;">This invitation expires on {{ $expiresAt->format('F j, Y \a\t g:i A T') }}.</p>
            <p style="margin:28px 0;"><a href="{{ $invitationUrl }}" style="display:inline-block;background:#4f46e5;color:#ffffff;border-radius:8px;padding:13px 20px;text-decoration:none;font-weight:700;">Accept invitation</a></p>
            <p style="color:#64748b;font-size:13px;line-height:1.6;">If you were not expecting this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
