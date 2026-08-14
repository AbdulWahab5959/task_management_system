<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Tenant;
use App\Services\TenantService;
use App\Services\ActivityLogService;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    protected TenantService $tenantService;
    protected ActivityLogService $activityLogService;

    public function __construct(TenantService $tenantService, ActivityLogService $activityLogService)
    {
        $this->tenantService = $tenantService;
        $this->activityLogService = $activityLogService;
    }

    public function handle(Request $request, Closure $next)
    {
        if (!$request->user()) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        $tenant = $this->identifyTenant($request);

        if (!$request->user()->hasAccessToTenant($tenant)) {
            $this->logAccessDenied($request, $tenant);
            abort(Response::HTTP_FORBIDDEN, 'You do not have access to this tenant.');
        }

        if (!$tenant->isActive()) {
            abort(Response::HTTP_FORBIDDEN, 'This tenant is not available.');
        }

        // Authorization must complete before the tenant connection is configured.
        $this->tenantService->switchTenant($tenant);
        $request->attributes->set('tenant', $tenant);

        return $next($request);
    }

    protected function identifyTenant(Request $request): Tenant
    {
        $identifiers = $this->identifiersFromRequest($request);

        if (count($identifiers) > 1) {
            $resolved = collect($identifiers)->map(fn (string $identifier) => $this->resolveIdentifier($identifier))->unique('id');

            if ($resolved->count() > 1) {
                abort(Response::HTTP_UNPROCESSABLE_ENTITY, 'Conflicting tenant identifiers were supplied.');
            }

            return $resolved->first();
        }

        if ($identifiers) {
            return $this->resolveIdentifier(reset($identifiers));
        }

        $tenant = $request->user()->tenants()->first();

        if (!$tenant) {
            abort(Response::HTTP_NOT_FOUND, 'Tenant not found.');
        }

        return $tenant;
    }

    /**
     * Return explicit identifiers in deterministic priority order.
     * Domain > custom domain > route > request > header.
     */
    protected function identifiersFromRequest(Request $request): array
    {
        $identifiers = [];
        $host = $request->getHost();
        $baseDomain = config('app.domain', 'launchstack.com');

        if (str_ends_with($host, '.' . $baseDomain)) {
            $identifiers['domain'] = str_replace('.' . $baseDomain, '', $host);
        } elseif (
            $host !== $baseDomain
            && $host !== 'localhost'
            && $host !== '127.0.0.1'
        ) {
            $identifiers['custom_domain'] = $host;
        }

        $routeTenant = $request->route('tenant_id') ?? $request->route('tenant');
        if ($routeTenant !== null && $routeTenant !== '') {
            $identifiers['route'] = (string) ($routeTenant instanceof Tenant ? $routeTenant->getKey() : $routeTenant);
        }

        $requestTenant = $request->input('tenant_id');
        if ($requestTenant !== null && $requestTenant !== '') {
            $identifiers['request'] = (string) $requestTenant;
        }

        $headerTenant = $request->header('X-Tenant-ID');
        if ($headerTenant !== null && $headerTenant !== '') {
            $identifiers['header'] = (string) $headerTenant;
        }

        return $identifiers;
    }

    protected function resolveIdentifier(string $identifier): Tenant
    {
        $tenant = ctype_digit($identifier)
            ? Tenant::find($identifier)
            : Tenant::where('slug', $identifier)->orWhere('domain', $identifier)->first();

        if (!$tenant) {
            abort(Response::HTTP_NOT_FOUND, 'Tenant not found.');
        }

        return $tenant;
    }

    protected function logAccessDenied(Request $request, Tenant $tenant): void
    {
        try {
            $this->activityLogService->logFromRequest(
                action: 'tenant.access_denied',
                description: 'Tenant access denied.',
                properties: ['attempted_tenant_id' => $tenant->id],
                request: $request,
            );
        } catch (\Throwable) {
            // A security log failure must not expose the tenant or change the 403 response.
        }
    }
}
