# Investigation

## Sources

- `00-requirement.md`
- `AGENTS.md`, `backend/AGENTS.md`, and `frontend/AGENTS.md`
- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/TenantDashboardController.php`
- `backend/app/Http/Controllers/Api/DashboardController.php`
- `backend/app/Http/Middleware/IdentifyTenant.php`
- `backend/app/Models/ActivityLog.php` and `backend/app/Models/Tenant.php`
- `backend/database/migrations/2026_06_12_000006_create_activity_logs_table.php`
- `backend/database/migrations/2026_08_20_000001_backfill_organization_activity_logs.php`
- `backend/tests/Feature/TenantDashboardTest.php` and `backend/tests/Feature/DashboardActivityTest.php`
- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/services/tenant-dashboard.service.ts`, `frontend/src/services/dashboard-activity.service.ts`, and `frontend/src/types/activity-log.types.ts`
- `frontend/src/types/tenant-dashboard.types.ts`
- Existing `frontend/src/pages/Dashboard/ActivityLogsPage.tsx` pagination pattern

## Requirement Summary

The dashboard must show recent activity from users in the active organization and provide bounded pagination while preserving tenant isolation and existing activity-log contracts.

## Repository State

- Investigation date: 2026-09-22.
- Working tree is dirty with pre-existing frontend, backend, task-artifact, and untracked changes, including prior dashboard/theme work. Those changes are outside this task and must be preserved.
- No commit, reset, or destructive operation is authorized.

## Current Execution Flow

- FACT: `DashboardPage` loads `/api/tenant/dashboard/summary` through `tenantDashboardService.getSummary()` with `tenantScoped: true`.
- FACT: `TenantDashboardController::summary()` resolves the tenant from the request attributes and currently returns an empty activity array with `activity_available: false`.
- FACT: `/api/tenant/dashboard/summary` is inside the authenticated `tenant.identify` route group and requires `permission:organization.view`.
- FACT: `IdentifyTenant` resolves the active tenant, verifies authenticated-user access and active status before tenant connection switching, and stores the tenant on request attributes.
- FACT: `/api/dashboard/activity` only returns the authenticated user’s activity and currently limits the result to 10 records without pagination.

## Current Architecture

- Central `activity_logs` records have nullable `tenant_id` and `user_id`, with relationships to `Tenant` and `User`.
- `ActivityLogService::logFromRequest()` takes the tenant from request attributes, so tenant-keyed events already exist for flows that use the service.
- The frontend has typed Axios services and an existing page-number pagination pattern in `ActivityLogsPage`.

## Root Cause / Functional Gap

- FACT: The dashboard does not query tenant activity; it deliberately renders the unavailable state.
- FACT: The available personal dashboard activity endpoint cannot satisfy “activities of the users” because it filters by the authenticated user id.
- INFERENCE: A separate tenant-scoped endpoint is the smallest compatible change because it adds pagination without changing the existing summary or personal activity response contracts.

## Affected Files

- `backend/app/Http/Controllers/Api/TenantDashboardController.php` - add a tenant-scoped paginated activity response.
- `backend/routes/api.php` - expose the activity route inside the existing tenant middleware group.
- `backend/tests/Feature/TenantDashboardTest.php` - verify tenant scope and pagination.
- `frontend/src/services/tenant-dashboard.service.ts` - call the new endpoint.
- `frontend/src/types/tenant-dashboard.types.ts` - type the paginated tenant activity response.
- `frontend/src/pages/Dashboard/DashboardPage.tsx` - load, render, and paginate activity.

## Affected Components

- Dashboard page’s existing Recent activity card.
- Existing auth, tenant context, and Axios tenant-scoped request interceptor.
- Existing `Card`, `EmptyState`, and dashboard button patterns.

## Database Findings

- FACT: `activity_logs.tenant_id` is nullable and indexed; no schema change is needed.
- FACT: A backfill migration adds organization-created events for existing tenants.
- Constraint: Null-tenant records must remain excluded from the tenant feed.

## API Findings

- Existing tenant route convention is `/api/tenant/...` with `X-Tenant-ID` added by `tenantScoped: true`.
- Existing page-number APIs return `data`, `current_page`, `from`, `last_page`, `per_page`, `to`, and `total`.
- Proposed additive route: `GET /api/tenant/dashboard/activity?page=&per_page=`.

## Authentication / Authorization Findings

- FACT: The route can reuse `auth:sanctum`, `tenant.identify`, and `permission:organization.view`.
- FACT: Tenant access is checked before tenant-connection use by `IdentifyTenant`.
- The endpoint must filter by the resolved request tenant, never by a client-supplied tenant id in the query.

## Frontend Findings

- `DashboardPage` already owns active-tenant summary loading and has error/retry state for the summary.
- The current activity card has no loading/pagination controls and uses the summary’s unavailable flag.
- The page should keep activity loading independent from the larger summary request so pagination does not reload organization metrics.

## Backend Findings

- A controller method can query central `ActivityLog` records with `where('tenant_id', $tenant->id)`, eager-load a safe user projection, order newest first, and use bounded Laravel pagination.
- Response serialization should expose only activity fields needed by the dashboard: id, action, description, created_at, and actor id/name. IP address, user agent, and raw properties are not needed.

## Security Findings

- Do not reuse the personal activity endpoint or the platform-admin endpoint for this feature.
- Do not return logs with null or another tenant id.
- Do not expose IP addresses, user agents, or raw properties in the dashboard feed.

## Performance Findings

- The current summary is already bounded for most recent project/task lists, but activity is not queried there.
- A bounded `per_page` value with an indexed `tenant_id` filter and eager-loaded actor prevents unbounded dashboard payloads.
- No measured production latency is available in this environment.

## Existing Tests

- `DashboardActivityTest` covers unauthenticated access and personal-user isolation for `/api/dashboard/activity`; it must remain unchanged.
- `TenantDashboardTest` covers tenant summary access and cross-tenant/inactive-tenant denial; it is the appropriate place for the new tenant activity cases.
- `ActivityLogsPage` demonstrates frontend page metadata and previous/next interaction, but no dashboard activity component test exists.

## Risks

- Some older activity rows may not be tenant-keyed and will not appear; this is safer than guessing ownership.
- A dashboard member with `organization.view` will see actor names and descriptions from the active organization; the permission is already the organization overview permission and this feed is limited to that tenant.

## Recommendations

- RECOMMENDATION: Add an additive tenant activity endpoint with a default page size of 8 and a server maximum of 50, matching existing page-number APIs.
- RECOMMENDATION: Keep the summary’s legacy activity fields for compatibility while the dashboard uses the new endpoint.

## Alternatives Considered

- RECOMMENDATION: Expanding `/api/dashboard/activity` to all tenant users was rejected because existing tests and its documented contract intentionally make it personal.
- RECOMMENDATION: Returning all activity in the summary was rejected because pagination would be ineffective and summary payloads would grow with history.

## Requires Human Decision

None. The user explicitly requested the dashboard feature and pagination; the additive tenant-scoped contract is within that scope and does not require a Level 3 approval gate.

## Unknown / Unverified Items

- Manual browser verification is unavailable in the current tool session; source/build checks can verify compilation but not visual scrolling.

## Confidence

9/10. The route, middleware, model, storage, existing pagination conventions, and dashboard consumer are directly present in the repository. Only production data coverage and manual visual behavior remain unverified.
