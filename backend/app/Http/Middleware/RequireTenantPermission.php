<?php

namespace App\Http\Middleware;

use App\Services\TenantPermissionService;
use Closure;
use Illuminate\Http\Request;

class RequireTenantPermission
{
    public function __construct(private readonly TenantPermissionService $permissions) {}

    public function handle(Request $request, Closure $next, string $permission)
    {
        $this->permissions->authorize($request->user(), $permission, $request->attributes->get('tenant'));
        return $next($request);
    }
}
