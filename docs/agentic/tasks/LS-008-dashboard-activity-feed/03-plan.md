# Implementation Plan

## Sources

- `00-requirement.md`
- `01-investigation.md`
- `02-spec.md`
- Root, backend, and frontend agent instructions

## Task Risk Level

Level 2 - Standard engineering. The work adds a normal tenant-scoped read API and dashboard pagination without changing authentication, billing, schema, or existing activity contracts.

## Summary

Plan revision LS-008-P1 (2026-09-22): add a bounded tenant activity endpoint, consume it from the dashboard, add pagination/error/empty states, and cover tenant isolation and pagination with backend tests.

## Files To Modify

- `backend/app/Http/Controllers/Api/TenantDashboardController.php` - add the paginated activity method.
- `backend/routes/api.php` - add the tenant activity route.
- `backend/tests/Feature/TenantDashboardTest.php` - add activity scope/pagination tests.
- `frontend/src/services/tenant-dashboard.service.ts` - add typed activity request.
- `frontend/src/types/tenant-dashboard.types.ts` - add activity page types.
- `frontend/src/pages/Dashboard/DashboardPage.tsx` - replace the unavailable-state-only activity card with the live paginated feed.

## Files To Create

None. The existing controller, service, types, page, and feature test are sufficient.

## Files Explicitly Not To Modify

- `backend/app/Http/Controllers/Api/DashboardController.php` and `backend/tests/Feature/DashboardActivityTest.php` - preserve the personal activity contract.
- `backend/app/Http/Controllers/Admin/ActivityLogController.php` and admin activity UI - outside scope.
- Activity migrations, logging services, auth, billing, and tenant middleware - no change required.
- Existing unrelated dirty-worktree files and task artifacts.

## Implementation Steps

### Step 1

Add the tenant-scoped route/controller query and safe paginated response. Verify it filters by resolved tenant id, eager-loads the actor, validates page size, and does not expose metadata fields.

### Step 2

Add typed frontend service/types and load activity independently from the dashboard summary. Render responsive activity rows with actor names, action labels, timestamps, range metadata, page controls, loading, empty, and retry states.

### Step 3

Add backend feature coverage for tenant isolation, pagination, page boundaries, and authorization preservation. Run backend targeted tests, frontend lint/build, and diff checks.

## Database Changes

None. Existing indexed `activity_logs.tenant_id` is used.

## API Changes

Add `GET /api/tenant/dashboard/activity` with page-number pagination and a server maximum of 50 records per page. The endpoint is tenant middleware and `organization.view` protected.

## Frontend Changes

Dashboard activity state is independent from summary state. Activity controls use 8 records per page, disable while loading or at boundaries, and remain usable on small screens.

## Backend Changes

Validate pagination, query the central activity log by resolved tenant, eager-load the actor, serialize a minimal dashboard-safe response, and preserve existing middleware.

## Security Considerations

The tenant middleware performs identity/access/status checks before the query. The query never trusts client tenant ownership. Null/other-tenant logs are excluded, and IP/user-agent/raw properties are omitted.

## Performance Considerations

The dashboard makes one bounded activity request per page. The indexed tenant filter and eager-loaded actor avoid unbounded payloads and N+1 actor queries.

## Testing Plan

- Backend working directory `backend`: targeted `php artisan test --filter=TenantDashboardTest`.
- Frontend working directory `frontend`: `npm.cmd run lint` and `npm.cmd run build`.
- Root: `git diff --check` for touched files.
- Inspect the final diff to confirm unrelated work remains untouched.

## Manual Verification

When a browser session is available, open `/dashboard`, confirm actors from the active organization appear, navigate to Next and Previous, confirm page totals and disabled boundaries, switch organizations, verify activity changes, and test empty/error/retry states at a narrow viewport.

## Rollback Strategy

Revert only the six task files listed above or remove the additive route and dashboard consumer while preserving all unrelated working-tree changes. No data rollback is needed because no schema or write behavior changes.

## Known Risks

- Manual visual verification may remain unavailable in the current environment.
- Legacy logs without tenant ids will intentionally remain absent.

## Approval Required

Approval Required: NO

## Approval Status

Approval Status: PENDING

## Approved By

Not applicable for Level 2 work with no outstanding decision.

## Approval Notes

No human approval gate applies. The implementation is authorized by the user’s explicit dashboard activity and pagination request.
