<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogService
{
    public function log(
        string $action,
        ?string $description = null,
        ?array $properties = null,
        ?int $userId = null,
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?int $tenantId = null,
    ): ActivityLog {
        return ActivityLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action' => $action,
            'description' => $description,
            'properties' => $properties,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }

    public function logFromRequest(
        string $action,
        ?string $description = null,
        ?array $properties = null,
        ?Request $request = null,
    ): ActivityLog {
        $request ??= request();

        return $this->log(
            action: $action,
            description: $description,
            properties: $properties,
            userId: $request->user()?->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
            tenantId: $request->attributes->get('tenant')?->id,
        );
    }
}
