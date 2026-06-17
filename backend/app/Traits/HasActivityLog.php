<?php

namespace App\Traits;

use Illuminate\Support\Facades\Request;

trait HasActivityLog
{
    public function logActivity(string $action, ?string $description = null, array $properties = [])
    {
        $tenantId = app()->bound('currentTenant') ? app('currentTenant')?->id : null;

        // Use database connection to resolve the main DB activity logs
        \App\Models\ActivityLog::create([
            'tenant_id' => $tenantId,
            'user_id' => auth()->id() ?? ($this instanceof \App\Models\User ? $this->id : null),
            'action' => $action,
            'description' => $description,
            'properties' => json_encode($properties),
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}
