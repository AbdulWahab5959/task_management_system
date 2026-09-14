# Technical Specification

## Task metadata

- Task Level: Level 2
- Status: PROPOSED / NOT AUTHORIZED FOR IMPLEMENTATION
- Revision: 1
- Date: 2026-09-08

## Sources

- [00-requirement.md](00-requirement.md)
- [01-investigation.md](01-investigation.md)
- [Agentic workflow policy](../../README.md)
- Root, frontend, and backend `AGENTS.md` files

This specification converts the investigation into a safe proposed scope. It does not authorize implementation.

## Approved Behavior

### FACT

The only currently authorized behavior is a read-only performance investigation and creation of the task artifacts. No application optimization, API change, schema change, migration, or caching change is approved by the original request.

### REQUIRES APPROVAL

The behaviors below are proposals for a later implementation phase, not approved behavior:

- Reduce avoidable duplicate frontend requests while preserving existing response contracts.
- Defer non-critical support data work until the support UI requires it, subject to support freshness review.
- Measure and then optimize backend query shape or payload size.
- Add pagination, indexes, caching, or response-shape changes.

## User Flow

The intended later flow is:

1. User opens the application and receives the existing route shell and loading states.
2. Authenticated dashboard data loads through the existing authenticated client and tenant context.
3. Critical dashboard data is prioritized and non-critical support/notification work does not block dashboard usability.
4. Existing error, retry, empty, unauthorized, and expired-session outcomes remain visible and controlled.
5. Measurement records request count, request timing, payload size, and time-to-usable before and after each change.

Failure and recovery must preserve current behavior: failed requests remain retryable, duplicate actions remain guarded, and an expired or unauthorized session is handled by the existing auth flow.

## Frontend Design

### Proposed, pending approval

Use the existing Axios client, React contexts, typed service modules, and current loading-state patterns. Any Phase 1 frontend change should be limited to request coordination or scheduling in the existing dashboard shell and support widget.

Candidate files:

- `frontend/src/context/AuthContext.tsx`
- `frontend/src/context/TenantContext.tsx`
- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/layouts/DashboardLayout.tsx`
- `frontend/src/components/dashboard/DashboardNavbar.tsx`
- `frontend/src/components/support/SupportWidget.tsx`
- Existing service files only if a coordination seam cannot be kept in the caller.

Do not introduce a new state-management or data-fetching framework in Phase 1. Do not remove existing loading, empty, retry, unauthorized, or provider-error states.

## Backend Design

### Proposed, pending measurement

No backend implementation is part of Phase 1. Later backend work may consolidate repeated subscription/entitlement lookups or reduce dashboard query work, but must preserve trusted server-side ownership, organization checks, and controlled errors.

Potential later review targets:

- `backend/app/Http/Controllers/Api/TenantDashboardController.php`
- `backend/app/Http/Controllers/TenantController.php`
- `backend/app/Http/Controllers/Api/SupportController.php`
- `backend/app/Services/TenantPermissionService.php`
- `backend/app/Services/PlanEntitlementService.php`
- `backend/app/Services/SubscriptionResolver.php`
- `backend/app/Services/TenantSubscriptionResolver.php`

## API Design

### Phase 1

No API methods, routes, request shapes, response shapes, status codes, or validation rules change.

### REQUIRES APPROVAL — later phases

Pagination for support messages or tenants, reduced dashboard response shapes, new aggregation endpoints, and cache-aware responses are API contract changes. They require an updated specification, caller inventory, compatibility review, and explicit approval before implementation.

## Database Design

### Phase 1

No schema, index, query, connection, migration, or data changes.

### REQUIRES APPROVAL — later phases

Index additions, query rewrites, denormalized summaries, or database configuration changes require query-plan evidence, realistic data-volume testing, migration review, and a recovery strategy. No migration is authorized by this specification.

## Authentication

Use the existing authenticated Axios interceptor and server-authenticated identity. Do not change token handling, session behavior, or credential storage.

Any authentication or middleware change is out of Phase 1 and requires explicit approval; it may require Level 3 reclassification.

## Authorization

The backend remains the authority for ownership, billing, limits, roles, and permissions. Frontend timing or request coordination must not authorize or infer access.

Any change affecting authorization or billing ownership requires explicit approval and Level 3 review.

## Tenant Isolation

Preserve the current tenant-context header and server-side organization resolution. Tenant access, active status, membership, and role checks must occur before tenant-connection use.

Any tenant-list, tenant-payload, middleware, or tenant-isolation change requires explicit approval and a negative cross-organization test matrix.

## Validation

Phase 1 introduces no new user input. Existing request validation and server-owned identifiers remain unchanged.

Later pagination/filter parameters must have bounded, validated limits and safe defaults; that work requires API specification approval.

## Error Handling

- Preserve current loading, empty, retry, unauthorized, validation, rate-limit, and provider-error states.
- Do not expose secrets, prompts, raw provider responses, SQL, file paths, or stack traces.
- Request coordination must handle unmounts, cancellation, retries, and stale responses without overwriting newer state.
- A deferred non-critical request must not prevent a critical dashboard error from being shown.

## Security Requirements

- Preserve the permanent root, frontend, and backend security rules.
- Never authorize from client-supplied user, owner, tenant, subscription, payment, or organization identifiers.
- Do not move billing, entitlement, or tenant decisions into React.
- Do not add providers, chatbot runtime, RAG, automation, or metering.
- Verify that any request deduplication does not share data across authenticated users or organizations.

## Performance Requirements

The current repository has no measured baseline. Before implementation, record cold and warm authenticated dashboard measurements in an approved non-production or production-like environment:

- time to first byte and time to usable dashboard;
- request count and critical-path request count;
- transfer bytes and response sizes;
- p50/p95 latency for `/auth/me`, `/tenants`, `/tenant/dashboard/summary`, billing, and support requests;
- frontend entry and route chunk sizes;
- backend query count and database time for the leading endpoints.

Phase 1 must not regress existing functionality and should target fewer critical-path requests or lower dashboard time-to-usable without changing API contracts.

## Accessibility

Existing loading, retry, focus, labels, keyboard interaction, and live-region behavior must remain intact. Deferred support loading must retain a clear loading state and keyboard-accessible retry/open behavior.

## Backward Compatibility

Phase 1 keeps all existing routes, services, request/response contracts, auth behavior, tenant headers, and user-visible support semantics. API and database changes are deferred because their compatibility impact is not yet specified.

## Edge Cases

- No token, expired token, or unauthorized response.
- No active tenant, multiple tenants, inactive tenant, or changed active tenant.
- Slow, failed, cancelled, or out-of-order requests.
- Support widget opened while its deferred request is pending.
- Realtime unavailable while polling is active.
- Repeated navigation or React development StrictMode behavior.
- Billing data requested by dashboard and navbar at nearly the same time.

## Acceptance Criteria

| Requirement criterion | Specification and verification |
|---|---|
| AC-1 | Preserve the original request and Level 2 classification in `00-requirement.md`; inspect artifact content. |
| AC-2 | Preserve the documented frontend/API/backend/database flow in `01-investigation.md`; review source references. |
| AC-3 | Keep proposed changes separated by FACT, INFERENCE, RECOMMENDATION, and REQUIRES APPROVAL; inspect this spec and plan. |
| AC-4 | Make no application or database changes; inspect Git diff and task-folder contents. |
| AC-5 | Define the next phase, spec need, and classification in this spec and `03-plan.md`. |

No new requirement criteria are added.

## Explicit Non-Goals

- No implementation in this task.
- No React, API service, Laravel controller, query, migration, schema, route, middleware, configuration, cache, or infrastructure changes.
- No authentication, authorization, tenant-isolation, billing, subscription, or payment redesign.
- No tests/builds represented as passed results; planned checks are not execution evidence.
- No product AI-agent or chatbot functionality.

## Human Decisions / Approvals

### REQUIRES APPROVAL

1. Approve the measured Phase 1 implementation scope before code changes begin.
2. Explicitly approve any API contract, pagination, database migration/index, caching, infrastructure, auth, billing, subscription, or tenant-isolation change.
3. Reclassify to Level 3 if any selected implementation touches those high-risk areas.

No approval has been recorded yet.
