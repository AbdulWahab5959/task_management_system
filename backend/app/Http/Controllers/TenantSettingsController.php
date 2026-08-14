<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TenantSettingsController extends Controller
{
    private const INDUSTRIES = [
        'healthcare',
        'logistics',
        'ecommerce',
        'real-estate',
        'education',
        'hospitality',
        'professional-services',
        'other',
    ];

    private const SETTING_KEYS = [
        'website',
        'industry',
        'description',
        'contact_email',
        'phone',
        'country',
        'timezone',
        'currency',
    ];

    public function __construct(private readonly ActivityLogService $activityLogService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $settings = TenantSetting::query()
            ->whereIn('key', array_merge(['site_name'], self::SETTING_KEYS))
            ->get()
            ->keyBy('key');

        return response()->json([
            'data' => [
                'tenant_id' => $tenant->id,
                'name' => $tenant->name,
                'website' => $settings->get('website')?->value,
                'industry' => $settings->get('industry')?->value,
                'description' => $settings->get('description')?->value,
                'contact_email' => $settings->get('contact_email')?->value,
                'phone' => $settings->get('phone')?->value,
                'country' => $settings->get('country')?->value,
                'timezone' => $settings->get('timezone')?->value ?? 'UTC',
                'currency' => strtoupper((string) ($settings->get('currency')?->value ?? 'USD')),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $this->resolvedTenant($request);
        $role = $request->user()->getRoleInTenant($tenant);

        if (!in_array($role, ['owner', 'admin'], true)) {
            return response()->json(['message' => 'Only tenant owners and admins can update organization settings.'], 403);
        }

        $request->merge([
            'currency' => $request->input('currency') !== null
                ? strtoupper((string) $request->input('currency'))
                : null,
        ]);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'website' => ['nullable', 'url', 'max:2048'],
            'industry' => ['nullable', 'string', Rule::in(self::INDUSTRIES)],
            'description' => ['nullable', 'string', 'max:2000'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'country' => ['nullable', 'string', 'max:100'],
            'timezone' => ['nullable', 'timezone'],
            'currency' => ['nullable', 'regex:/^[A-Z]{3}$/'],
        ]);

        $changedFields = [];

        if (array_key_exists('name', $validated) && $tenant->name !== $validated['name']) {
            $tenant->update(['name' => $validated['name']]);
            $this->upsertSetting('site_name', $validated['name']);
            $changedFields[] = 'name';
        }

        foreach (self::SETTING_KEYS as $key) {
            if (array_key_exists($key, $validated)) {
                $this->upsertSetting($key, $validated[$key]);
                $changedFields[] = $key;
            }
        }

        if ($changedFields) {
            $this->activityLogService->logFromRequest(
                action: 'tenant.settings.updated',
                description: 'Tenant organization settings updated.',
                properties: [
                    'tenant_id' => $tenant->id,
                    'changed_fields' => array_values(array_unique($changedFields)),
                ],
                request: $request,
            );
        }

        return $this->show($request);
    }

    private function resolvedTenant(Request $request): Tenant
    {
        return $request->attributes->get('tenant') ?? abort(404, 'Tenant not found.');
    }

    private function upsertSetting(string $key, mixed $value): void
    {
        $type = is_bool($value) ? 'boolean' : (is_int($value) ? 'integer' : 'string');

        TenantSetting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'type' => $type],
        );
    }
}
