# Requirement

## Title

Show tenant user activity on the dashboard with pagination.

## Task ID

LS-008-dashboard-activity-feed

## Task Level

Level 2 - Standard engineering. This changes a tenant-scoped API contract and a dashboard data flow, including pagination and authorization-sensitive activity visibility.

## Original User Request

Date: 2026-09-22

Source: User request in conversation: “on the dashboard page show the recent activities of the of the users and also added the pagination”.

## Business Objective

Give organization members a useful, bounded view of recent work performed by users in their active organization.

## User Objective

On `/dashboard`, see recent activity from users in the active organization and move through additional activity pages.

## Expected Behavior

- The dashboard shows recent tenant activity with the actor, action, description, and timestamp.
- Activity is paginated with previous/next controls and a visible range/total.
- Loading, empty, error, retry, and disabled pagination states are handled.
- Only activity belonging to the active organization is returned.

## Current Behavior

Verified in `DashboardPage.tsx` and `TenantDashboardController.php`: the dashboard renders an empty-state message because the summary returns `activity: []` and `activity_available: false`, while the existing `/api/dashboard/activity` endpoint is intentionally limited to the authenticated user and is not paginated.

## Scope

- Add a tenant-scoped paginated activity endpoint for the dashboard.
- Add typed frontend service/state/UI for the dashboard activity feed.
- Add backend authorization, tenant-isolation, pagination, and response tests.

## Out of Scope

- Changing the existing personal `/api/dashboard/activity` contract.
- Changing platform-admin activity logs or the admin activity-log page.
- Adding filters, exports, search, new activity event types, or database migrations.
- Changing activity creation behavior beyond consuming existing tenant-keyed records.

## Constraints

- Preserve server-owned tenant authorization and existing API client/tenant header behavior.
- Keep the UI responsive and keyboard accessible.
- Preserve unrelated existing work in the dirty worktree.

## Acceptance Criteria

- AC-1: An authorized member viewing `/dashboard` can see recent activity records from users in the active organization.
- AC-2: The activity endpoint returns bounded page metadata and previous/next dashboard controls change pages without exposing another organization’s logs.
- AC-3: Empty, loading, error/retry, first-page, and last-page states are rendered safely.
- AC-4: Existing personal activity and admin activity-log behavior remains unchanged.
- AC-5: Relevant backend tests, frontend lint, frontend build, and diff checks pass.

## Known Risks

- Existing historical logs may have a null `tenant_id`; they must not be inferred into an organization.
- Activity descriptions may be long and must not break the responsive dashboard layout.

## Human Decisions

None outstanding for the requested bounded tenant activity feed. No new event taxonomy or migration is authorized.

## Status

COMPLETED - 2026-09-22. Tenant-scoped activity, pagination, responsive states, tests, and verification are complete.

## Requirement Amendment

None.
