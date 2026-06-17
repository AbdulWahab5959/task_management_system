<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Services\TenantService;

class IdentifyTenant
{
    protected TenantService $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->identifyTenant($request);

        if ($tenant) {
            $this->tenantService->switchTenant($tenant);
        }

        return $next($request);
    }

    protected function identifyTenant(Request $request): ?Tenant
    {
        // Method 1: From subdomain (e.g., acme.launchpad.com)
        if ($tenant = $this->identifyFromDomain($request)) {
            return $tenant;
        }

        // Method 2: From custom domain (e.g., app.acme.com)
        if ($tenant = $this->identifyFromCustomDomain($request)) {
            return $tenant;
        }

        // Method 3: From tenant_id in request or X-Tenant-ID header
        if ($tenantId = $request->input('tenant_id') ?? $request->header('X-Tenant-ID')) {
            return Tenant::find($tenantId);
        }

        // Method 4: From authenticated user's current tenant
        if ($request->user()) {
            return $request->user()->tenants()->first();
        }

        return null;
    }

    protected function identifyFromDomain(Request $request): ?Tenant
    {
        $host = $request->getHost();
        $baseDomain = config('app.domain', 'launchpad.com'); // e.g., launchpad.com

        if (str_ends_with($host, '.' . $baseDomain)) {
            $subdomain = str_replace('.' . $baseDomain, '', $host);
            return Tenant::where('slug', $subdomain)->first();
        }

        return null;
    }

    protected function identifyFromCustomDomain(Request $request): ?Tenant
    {
        $host = $request->getHost();
        $baseDomain = config('app.domain', 'launchpad.com');
        if ($host === $baseDomain || str_ends_with($host, '.' . $baseDomain) || $host === 'localhost' || $host === '127.0.0.1') {
            return null;
        }
        return Tenant::where('domain', $host)->first();
    }
}
