<?php

return [
    'roles' => [
        'admin' => ['organization.view', 'organization.settings.view', 'organization.settings.update', 'members.view', 'members.invite', 'members.update_role', 'members.remove', 'invitations.view', 'invitations.create', 'invitations.resend', 'invitations.revoke', 'support.view'],
        'member' => ['organization.view', 'organization.settings.view', 'members.view', 'support.view'],
    ],
    'registry' => [
    'organization.view' => ['name' => 'View organization', 'description' => 'View the organization workspace.', 'group' => 'Organization'],
    'organization.update' => ['name' => 'Update organization', 'description' => 'Edit organization profile information.', 'group' => 'Organization'],
    'organization.settings.view' => ['name' => 'View organization settings', 'description' => 'View organization settings.', 'group' => 'Organization'],
    'organization.settings.update' => ['name' => 'Edit organization settings', 'description' => 'Edit organization settings.', 'group' => 'Organization'],
    'members.view' => ['name' => 'View team members', 'description' => 'View active organization members.', 'group' => 'Team and invitations'],
    'members.invite' => ['name' => 'Invite team members', 'description' => 'Invite people to join the organization.', 'group' => 'Team and invitations'],
    'members.update_role' => ['name' => 'Manage team roles', 'description' => 'Change supported member roles.', 'group' => 'Team and invitations'],
    'members.remove' => ['name' => 'Remove team members', 'description' => 'Remove non-owner members from the organization.', 'group' => 'Team and invitations'],
    'invitations.view' => ['name' => 'View invitations', 'description' => 'View pending organization invitations.', 'group' => 'Team and invitations'],
    'invitations.create' => ['name' => 'Create invitations', 'description' => 'Create organization invitations.', 'group' => 'Team and invitations'],
    'invitations.resend' => ['name' => 'Resend invitations', 'description' => 'Resend pending organization invitations.', 'group' => 'Team and invitations'],
    'invitations.revoke' => ['name' => 'Revoke invitations', 'description' => 'Revoke pending organization invitations.', 'group' => 'Team and invitations'],
    'support.view' => ['name' => 'View support', 'description' => 'View organization support conversations.', 'group' => 'Support'],
    'support.manage' => ['name' => 'Manage support', 'description' => 'Send and manage organization support conversations.', 'group' => 'Support'],
    'analytics.view' => ['name' => 'View analytics', 'description' => 'View organization analytics where available.', 'group' => 'Analytics'],
    ],
];
