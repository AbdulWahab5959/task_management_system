<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\TenantService;
use App\Models\Tenant;

class TenantController extends Controller
{
    protected TenantService $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function index(Request $request)
    {
        return response()->json($request->user()->tenants);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $tenant = $this->tenantService->create([
            'name' => $request->name,
        ], $request->user());

        return response()->json($tenant, 201);
    }

    public function show(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);

        if (!$request->user()->hasAccessToTenant($tenant)) {
            return response()->json(['message' => 'Unauthorized Access to Tenant'], 403);
        }

        return response()->json($tenant);
    }

    public function destroy(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);

        if (!$request->user()->isOwnerOfTenant($tenant)) {
            return response()->json(['message' => 'Only the owner can delete the tenant'], 403);
        }

        $this->tenantService->delete($tenant);

        return response()->json(['message' => 'Tenant successfully deleted']);
    }
}
