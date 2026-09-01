<?php

return [
    'types' => [
        'refund_initiated' => ['category' => 'billing', 'severity' => 'info', 'mandatory' => true, 'action_url' => '/dashboard/billing#payment-history'],
        'refund_completed' => ['category' => 'billing', 'severity' => 'success', 'mandatory' => true, 'action_url' => '/dashboard/billing#payment-history'],
        'refund_failed' => ['category' => 'billing', 'severity' => 'error', 'mandatory' => true, 'action_url' => '/dashboard/billing#payment-history'],
        'payment_failed' => ['category' => 'billing', 'severity' => 'error', 'mandatory' => true, 'action_url' => '/dashboard/billing'],
        'subscription_updated' => ['category' => 'billing', 'severity' => 'info', 'mandatory' => true, 'action_url' => '/dashboard/billing'],
        'security_alert' => ['category' => 'security', 'severity' => 'warning', 'mandatory' => true, 'action_url' => '/dashboard/settings'],
        'team_invitation' => ['category' => 'team', 'severity' => 'info', 'mandatory' => false, 'action_url' => '/dashboard/team'],
        'team_membership_changed' => ['category' => 'team', 'severity' => 'info', 'mandatory' => false, 'action_url' => '/dashboard/team'],
        'support_reply' => ['category' => 'support', 'severity' => 'info', 'mandatory' => false, 'action_url' => '/dashboard'],
    ],
    'categories' => ['security', 'billing', 'team', 'organization', 'support', 'product'],
];
