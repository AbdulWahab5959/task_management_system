<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantInvitation;
use App\Models\TenantSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class TenantDashboardController extends Controller
{
    private const PROFILE_FIELDS = [
        'name',
        'industry',
        'website',
        'contact_email',
        'timezone',
        'currency',
    ];

    public function summary(Request $request): JsonResponse
    {
        /** @var Tenant $tenant */
        $tenant = $request->attributes->get('tenant') ?? abort(404, 'Tenant not found.');
        $user = $request->user();
        // Older central tenant records can exist without a provisioned tenant
        // database. Keep the central dashboard usable while that record is
        // repaired instead of returning a generic 500 response.
        try {
            $settings = TenantSetting::query()
                ->whereIn('key', ['industry', 'website', 'description', 'contact_email', 'phone', 'country', 'timezone', 'currency'])
                ->get()
                ->keyBy('key');

            $roleCounts = DB::table('tenant_users')
                ->where('tenant_id', $tenant->id)
                ->select('role', DB::raw('COUNT(*) as aggregate'))
                ->groupBy('role')
                ->pluck('aggregate', 'role');
            $pendingInvitations = TenantInvitation::query()
                ->where('tenant_id', $tenant->id)
                ->where('status', TenantInvitation::STATUS_PENDING)
                ->count();
        } catch (Throwable) {
            $settings = collect();
            $roleCounts = collect();
            $pendingInvitations = 0;
        }

        $profile = [
            'industry' => $settings->get('industry')?->value,
            'website' => $settings->get('website')?->value,
            'description' => $settings->get('description')?->value,
            'contact_email' => $settings->get('contact_email')?->value,
            'phone' => $settings->get('phone')?->value,
            'country' => $settings->get('country')?->value,
            'timezone' => $settings->get('timezone')?->value ?? 'UTC',
            'currency' => strtoupper((string) ($settings->get('currency')?->value ?? 'USD')),
        ];
        $completedFields = array_values(array_filter(
            self::PROFILE_FIELDS,
            fn (string $field) => filled($field === 'name' ? $tenant->name : $profile[$field] ?? null),
        ));
        $missingFields = array_values(array_diff(self::PROFILE_FIELDS, $completedFields));

        $subscription = Subscription::query()
            ->where('user_id', $tenant->owner_id)
            ->whereIn('status', ['active', 'trialing'])
            ->with('plan')
            ->latest()
            ->first();

        $organizationsUsed = Tenant::query()
            ->where('owner_id', $tenant->owner_id)
            ->where('status', Tenant::STATUS_ACTIVE)
            ->count();
        $organizationLimit = $subscription?->plan?->getLimit('organizations', 0);

        $billing = [
            'subscription_scope' => 'user',
            'organizations_used' => $organizationsUsed,
            'organization_limit' => $organizationLimit,
            'organizations_remaining' => $organizationLimit === 'unlimited'
                ? 'unlimited'
                : max(0, (int) $organizationLimit - $organizationsUsed),
            'plan_features' => $subscription?->plan?->features ?? [],
            'current_subscription' => $subscription ? [
                'id' => $subscription->id,
                'plan_name' => $subscription->plan?->name,
                'status' => $subscription->status,
                'billing_interval' => $subscription->plan?->billing_interval ?? $subscription->plan?->interval,
                'current_period_end' => $subscription->current_period_end?->toISOString(),
                'cancel_at_period_end' => (bool) $subscription->cancel_at_period_end,
                'amount' => $subscription->plan?->amount,
                'currency' => $subscription->plan?->currency,
            ] : null,
        ];

        $profileComplete = count($missingFields) === 0;
        $billingActive = in_array($subscription?->status, ['active', 'trialing'], true);

        return response()->json([
            'data' => [
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'status' => $tenant->status,
                    'current_user_role' => $user->getRoleInTenant($tenant),
                    'created_at' => $tenant->created_at?->toISOString(),
                ],
                'organization_profile' => [
                    ...$profile,
                    'completion_percent' => (int) round((count($completedFields) / count(self::PROFILE_FIELDS)) * 100),
                    'completed_fields' => $completedFields,
                    'missing_fields' => $missingFields,
                ],
                'team' => [
                    'members_total' => (int) $roleCounts->sum(),
                    'owners' => (int) ($roleCounts['owner'] ?? 0),
                    'admins' => (int) ($roleCounts['admin'] ?? 0),
                    'members' => (int) ($roleCounts['member'] ?? 0),
                    'pending_invitations' => $pendingInvitations,
                ],
                'billing' => $billing,
                'activity' => [],
                'activity_available' => false,
                'activity_note' => 'Tenant activity is not yet reliably tenant-keyed.',
                'setup_checklist' => [
                    ['key' => 'organization_profile', 'label' => 'Complete organization profile', 'completed' => $profileComplete],
                    ['key' => 'team_member', 'label' => 'Invite a team member', 'completed' => $roleCounts->sum() > 1 || $pendingInvitations > 0],
                    ['key' => 'billing', 'label' => 'Review billing', 'completed' => $billingActive],
                    ['key' => 'settings', 'label' => 'Configure organization settings', 'completed' => count($completedFields) > 1],
                ],
            ],
        ]);
    }
}
