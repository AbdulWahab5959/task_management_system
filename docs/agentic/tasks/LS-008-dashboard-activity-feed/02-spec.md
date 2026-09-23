# Technical Specification

## Sources

- `00-requirement.md`
- `01-investigation.md`
- Root, backend, and frontend agent instructions
- Existing `ActivityLogsPage` and page-number API response conventions

## Approved Behavior

- The dashboard displays recent actions from users in the active organization.
- Activity is tenant-scoped, bounded, and paginated with previous/next controls.
- Existing personal and admin activity contracts remain unchanged.

## User Flow

1. The active organization dashboard loads the summary and the first activity page.
2. While activity is loading, the card shows a compact skeleton state.
3. When records exist, each row shows the actor, formatted action, description, and timestamp.
4. Previous/Next controls show the current range and total, disable at page boundaries, and disable during loading.
5. If loading fails, the card shows a safe error and retry action.
6. If no tenant-keyed records exist, the card shows an honest empty state.

## Frontend Design

- Add a typed `tenantDashboardService.getActivity({ page, per_page })` call using the existing `tenantScoped` Axios option.
- Keep activity page state separate from summary state so pagination does not re-request summary data.
- Use the existing dashboard `Card`, `EmptyState`, and button styles; use accessible labels and `aria-busy` on the activity region.
- Use responsive rows that wrap actor/description content and keep controls reachable on narrow screens.

## Backend Design

- Add `TenantDashboardController::activity()` using the tenant set by `IdentifyTenant`.
- Query central `ActivityLog` by the resolved tenant id, eager-load `user:id,name`, order newest first with a deterministic id tie-breaker, and paginate. The dashboard only needs the actor id and display name.
- Serialize a safe dashboard DTO without IP address, user agent, or raw properties.

## API Design

`GET /api/tenant/dashboard/activity?page=1&per_page=8`

Middleware: `auth:sanctum`, `tenant.identify`, `permission:organization.view`.

Validation:

- `page`: nullable integer, minimum 1.
- `per_page`: nullable integer, minimum 1, maximum 50; default 8.

Success response:

```json
{
  "data": [
    {
      "id": 1,
      "action": "tenant.organization.created",
      "description": "Organization created: Example",
      "created_at": "2026-09-22T10:00:00.000000Z",
      "user": { "id": 7, "name": "Abdul Wahab" }
    }
  ],
  "current_page": 1,
  "from": 1,
  "last_page": 2,
  "per_page": 8,
  "to": 8,
  "total": 12
}
```

The response shape is additive and follows existing Laravel page metadata. Invalid values return the existing controlled 422 validation response. Unauthorized, cross-tenant, and inactive-tenant requests retain existing 401/403 behavior.

## Database Design

No migration or schema change. Use the indexed nullable `activity_logs.tenant_id` field and existing `user_id` relationship.

## Authentication

Resolve identity from Sanctum’s authenticated request user. Do not accept a user id as a query or authorization input.

## Authorization

Require `organization.view` through the existing tenant route middleware. The resolved tenant must be accessible and active before querying activity.

## Tenant Isolation

Filter by `$request->attributes->get('tenant')->id`. Ignore any client-supplied tenant identifier except the existing tenant middleware’s approved header resolution. Logs for another tenant and null-tenant logs must not appear.

## Validation

Use Laravel request validation for `page` and `per_page`; enforce `per_page` max 50 and use default 8.

## Error Handling

- Backend uses controlled validation/auth responses and does not expose exceptions.
- Frontend shows loading, empty, error/retry, and disabled boundary states.
- A repeated page request is safe because it is a read-only GET and the controls are disabled during loading.

## Security Requirements

- Preserve organization access checks before tenant connection use.
- Return only the actor id/name required by the dashboard; do not expose network or browser metadata.
- Keep the personal `/api/dashboard/activity` and admin `/api/admin/activity-logs` authorization boundaries unchanged.

## Performance Requirements

- Server page size is bounded at 50; dashboard requests use 8.
- Query uses the existing `tenant_id` index and eager-loads actors to avoid N+1 queries.
- No production latency budget is measured in this task.

## Accessibility

- Pagination controls have accessible previous/next labels and disabled states.
- Activity region exposes `aria-busy` during loading.
- Actor/action/timestamp remain text content and do not rely on color alone.

## Backward Compatibility

- Existing summary, personal activity, admin activity, and activity-log storage remain compatible.
- The new route is additive; only the dashboard page consumes it.

## Edge Cases

- Empty tenant activity.
- One-page activity where both controls are disabled.
- Last page containing fewer than 8 records.
- A log with a deleted user, rendered as System activity.
- Null-tenant historical logs excluded.
- Cross-tenant and inactive-tenant requests rejected by existing middleware.

## Acceptance Criteria

- AC-1: Covered by tenant-scoped endpoint test and dashboard rendering implementation.
- AC-2: Covered by page metadata, page-boundary, and tenant-isolation tests plus frontend controls.
- AC-3: Covered by frontend state branches and source/build verification.
- AC-4: Covered by preserving existing activity tests and route contracts.
- AC-5: Covered by backend tests, frontend lint/build, and diff check.

## Explicit Non-Goals

- No activity filtering/search/export.
- No change to activity creation or event taxonomy.
- No migration, cache, or index change.
- No change to admin or personal activity-log pages.

## Human Decisions / Approvals

No pending decision. This is Level 2 work within the user-requested dashboard and pagination scope.
