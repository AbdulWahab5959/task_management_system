<?php

namespace App\Http\Controllers;

use App\Models\UserSetting;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserSettingsController extends Controller
{
    private const LOCALES = ['en'];

    public function __construct(private readonly ActivityLogService $activityLogService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->serialize($this->settingsFor($request->user()))]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_notifications_enabled' => ['sometimes', 'boolean'],
            'billing_notifications_enabled' => ['sometimes', 'boolean'],
            'team_notifications_enabled' => ['sometimes', 'boolean'],
            'security_notifications_enabled' => ['sometimes', 'boolean'],
            'marketing_emails_enabled' => ['sometimes', 'boolean'],
            // Keep accepting the original API names for existing clients.
            'email_enabled' => ['sometimes', 'boolean'],
            'billing_enabled' => ['sometimes', 'boolean'],
            'team_enabled' => ['sometimes', 'boolean'],
            'security_enabled' => ['sometimes', 'boolean'],
            'marketing_enabled' => ['sometimes', 'boolean'],
            'timezone' => ['sometimes', 'required', 'timezone'],
            'locale' => ['sometimes', 'required', Rule::in(self::LOCALES)],
        ]);

        $fieldMap = [
            'email_notifications_enabled' => 'email_enabled',
            'billing_notifications_enabled' => 'billing_enabled',
            'team_notifications_enabled' => 'team_enabled',
            'security_notifications_enabled' => 'security_enabled',
            'marketing_emails_enabled' => 'marketing_enabled',
        ];

        foreach ($fieldMap as $canonical => $legacy) {
            if (array_key_exists($canonical, $validated)) {
                $validated[$legacy] = $validated[$canonical];
                unset($validated[$canonical]);
            }
        }

        foreach (['billing_enabled', 'security_enabled'] as $criticalPreference) {
            if (array_key_exists($criticalPreference, $validated) && $validated[$criticalPreference] === false) {
                return response()->json([
                    'message' => 'Critical billing and security alerts cannot be disabled.',
                    'errors' => [$criticalPreference => ['This notification is required for account safety.']],
                ], 422);
            }
        }

        $settings = $this->settingsFor($request->user());
        $changedKeys = [];
        foreach ($validated as $key => $value) {
            if ($settings->getAttribute($key) !== $value) {
                $changedKeys[] = $key;
            }
        }
        $settings->fill($validated)->save();

        if ($changedKeys) {
            $this->activityLogService->logFromRequest(
                action: 'user.settings.updated',
                description: 'User account settings updated.',
                properties: ['changed_keys' => array_values($changedKeys)],
                request: $request,
            );

            if (array_intersect($changedKeys, ['email_enabled', 'team_enabled', 'marketing_enabled'])) {
                $this->activityLogService->logFromRequest(
                    action: 'user.notification_preferences.updated',
                    description: 'User notification preferences updated.',
                    properties: ['changed_keys' => array_values(array_intersect($changedKeys, ['email_enabled', 'team_enabled', 'marketing_enabled']))],
                    request: $request,
                );
            }

            if (array_intersect($changedKeys, ['timezone', 'locale'])) {
                $this->activityLogService->logFromRequest(
                    action: 'user.security_preferences.updated',
                    description: 'User account preferences updated.',
                    properties: ['changed_keys' => array_values(array_intersect($changedKeys, ['timezone', 'locale']))],
                    request: $request,
                );
            }
        }

        return response()->json([
            'data' => $this->serialize($settings->fresh()),
            'message' => 'Account settings saved.',
        ]);
    }

    private function settingsFor($user): UserSetting
    {
        return UserSetting::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'email_enabled' => true,
                'billing_enabled' => true,
                'team_enabled' => true,
                'security_enabled' => true,
                'marketing_enabled' => false,
                'timezone' => 'UTC',
                'locale' => 'en',
            ],
        );
    }

    private function serialize(UserSetting $settings): array
    {
        return [
            'notifications' => [
                'email_notifications_enabled' => (bool) $settings->email_enabled,
                'billing_notifications_enabled' => true,
                'team_notifications_enabled' => (bool) $settings->team_enabled,
                'security_notifications_enabled' => true,
                'marketing_emails_enabled' => (bool) $settings->marketing_enabled,
                // Legacy aliases retained for existing frontend clients.
                'email_enabled' => (bool) $settings->email_enabled,
                'billing_enabled' => true,
                'team_enabled' => (bool) $settings->team_enabled,
                'security_enabled' => true,
                'marketing_enabled' => (bool) $settings->marketing_enabled,
            ],
            'preferences' => [
                'timezone' => $settings->timezone,
                'locale' => $settings->locale,
            ],
            'security' => [
                'two_factor_enabled' => false,
                'two_factor_status' => 'coming_soon',
            ],
        ];
    }
}
