<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\TenantPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantAnalyticsController extends Controller
{
    public function __construct(private readonly TenantPermissionService $permissions) {}

    public function index(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant') ?? abort(404, 'Tenant not found.');
        $this->permissions->authorize($request->user(), 'analytics.view', $tenant);

        return app(TenantDashboardController::class)->summary($request);
    }
}
