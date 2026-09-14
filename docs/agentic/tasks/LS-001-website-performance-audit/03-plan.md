# Implementation Plan

## Sources

- [00-requirement.md](00-requirement.md)
- [01-investigation.md](01-investigation.md)
- [02-spec.md](02-spec.md)
- [Agentic workflow policy](../../README.md)
- Root, frontend, and backend `AGENTS.md` files

This is Plan Revision 1, dated 2026-09-08. It is a proposal only. No implementation is included in this task.

## Task Risk Level

Task Level: Level 2.

The current task is a standard performance investigation/specification/plan with no code or data changes. Any later work involving authentication, authorization, tenant isolation, billing/subscriptions/payments, database migrations, production infrastructure, or future AI tools/providers must be reclassified to Level 3 and explicitly approved before implementation.

## Summary

The plan prioritizes measurement and the smallest reversible frontend request-coordination improvements before backend, API, database, cache, or infrastructure work. Existing server authorization, billing ownership, tenant isolation, response contracts, and user-visible error states remain unchanged.

## Files To Modify

None in this task. The following are later review targets only:

- `frontend/src/context/AuthContext.tsx`
- `frontend/src/context/TenantContext.tsx`
- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/layouts/DashboardLayout.tsx`
- `frontend/src/components/dashboard/DashboardNavbar.tsx`
- `frontend/src/components/support/SupportWidget.tsx`
- Potentially existing frontend service modules if coordination cannot remain local.

No pre-existing user changes were present in the baseline recorded by `01-investigation.md`.

## Files To Create

None for implementation. The only files created by this continuation are `02-spec.md` and `03-plan.md`.

## Files Explicitly Not To Modify

- All Laravel controllers, services, routes, middleware, models, migrations, and database configuration.
- API request/response contracts.
- Authentication, authorization, tenant resolution, billing, subscriptions, payments, entitlements, and support ownership logic.
- Vite configuration, deployment/infrastructure configuration, cache headers, and database indexes.
- Product AI-agent/chatbot/provider/RAG/automation/metering code.
- Unrelated existing work.

## Implementation Steps

### Step 1 — Establish a repeatable baseline

Classification: Quick Win.

Before code changes, run the approved production-like frontend build and collect bundle output, then capture cold/warm dashboard browser waterfalls and Core Web Vitals. Profile the leading API endpoints with approved non-production data, recording p50/p95 latency, response bytes, query count, and database time.

Affected files: None; measurement configuration or temporary tooling must remain outside the application diff unless separately approved.

Expected benefit: Identifies the actual critical path and prevents optimizing an unmeasured suspicion.

Risk level: Low, provided data and observability access are approved and no production data is modified.

Testing required: Planned commands include `cd frontend; npm.cmd run lint`, `cd frontend; npm.cmd run build`, and `cd backend; php artisan test`; browser and query profiling are additional planned checks. Results must be recorded as actual results later.

Rollback strategy: Remove or discard temporary measurement output outside the application change. No application rollback is needed.

### Step 2 — Coordinate duplicate critical frontend requests

Classification: Quick Win.

After Step 1 confirms duplication, adjust only existing frontend context/page coordination so simultaneous requests for the same authenticated tenant/billing data are shared, sequenced, or avoided without changing API contracts. Preserve cancellation, stale-response protection, retry behavior, and auth/tenant headers.

Affected files: Most likely `frontend/src/context/TenantContext.tsx`, `frontend/src/pages/Dashboard/DashboardPage.tsx`, and `frontend/src/components/dashboard/DashboardNavbar.tsx`; exact files depend on baseline evidence.

Expected benefit: Fewer duplicate requests, less contention during dashboard startup, and lower time-to-usable dashboard.

Risk level: Low to medium. It is client-only but can cause stale data or state-race regressions if implemented carelessly.

Testing required: Existing frontend lint/build; backend tests are not expected to be needed unless backend behavior changes. Manually test login, refresh, tenant switching, navbar billing load, no-tenant state, expired session, retry, and repeated navigation. Add focused frontend tests only if the existing project test setup is expanded by approval.

Rollback strategy: Revert only the narrowly changed frontend files or disable the coordination branch while preserving unrelated work. Do not reset the repository.

### Step 3 — Defer non-critical support work only if measured

Classification: Medium Change.

If Step 1 confirms support traffic competes with dashboard readiness, change the existing support widget scheduling so non-critical message/FAQ work begins on user intent or after critical dashboard readiness. Keep support ownership, realtime/polling semantics, read state, loading, retry, and human support separation intact.

Affected files: `frontend/src/components/support/SupportWidget.tsx` and, if necessary, `frontend/src/services/support.service.ts`.

Expected benefit: Lower initial request fan-out and less bandwidth/CPU contention on the authenticated dashboard.

Risk level: Medium because it changes timing and freshness behavior visible to support users.

Testing required: Frontend lint/build; manual tests for closed/open widget, slow network, failed requests, retry, realtime online/offline, polling, unread/read state, FAQ selection, send, reopen, and navigation/unmount. Existing support backend tests should be run if any service contract is touched.

Rollback strategy: Restore the prior scheduling behavior in the affected component/service while retaining the same API contract. Do not remove support data or alter backend state.

### Step 4 — Analyze and reduce measured route chunk cost

Classification: Medium Change.

Use the production build output to identify oversized shared or route chunks. Only then consider narrowly isolating imports or splitting a component using the existing React.lazy/Suspense pattern. Preserve route loading and error behavior.

Affected files: The measured page/component and possibly `frontend/vite.config.ts`; no change should be made without bundle evidence.

Expected benefit: Lower initial JavaScript transfer and parse/evaluation cost, especially on slower devices.

Risk level: Medium due to route-boundary, loading-state, and dependency changes.

Testing required: `cd frontend; npm.cmd run lint`; `cd frontend; npm.cmd run build`; cold/warm navigation for public, dashboard, support, and admin routes; keyboard/accessibility and error-boundary checks.

Rollback strategy: Revert only the import/chunk-boundary change and retain the previous lazy route behavior.

### Step 5 — Investigate backend query and payload improvements

Classification: Medium Change.

Only after profiling, prepare a separate implementation slice for the measured backend bottleneck. Candidate areas are dashboard summary aggregation, repeated subscription/entitlement resolution, tenant serialization, admin analytics, and support message retrieval. Preserve server-side authorization and controlled errors.

Affected files: Candidate files are listed in `02-spec.md`; exact scope is intentionally unselected until measurements exist.

Expected benefit: Lower endpoint latency, query count, database time, or response size.

Risk level: Medium to High depending on contract and authorization impact.

Testing required: Targeted backend feature tests, query-count/timing verification, tenant-negative authorization tests, billing/entitlement regression tests where relevant, and `cd backend; php artisan test`.

Rollback strategy: Revert the isolated controller/service/query change. If a migration is later required, it needs its own approved recovery plan and is not covered by this rollback.

### Step 6 — Consider API, database, cache, or infrastructure changes only as separate approved work

Classification: High-Risk Change.

Do not include pagination, API response redesign, new caching, database indexes/migrations, middleware/auth changes, billing/subscription changes, tenant-isolation changes, or production asset/cache configuration in Phase 1. Prepare a new or amended specification and plan only after evidence and explicit approval.

Affected files: Potentially routes/controllers/services, migrations, models, frontend callers, deployment configuration, and documentation.

Expected benefit: Potentially substantial at scale, but unproven and contract-sensitive.

Risk level: High.

Testing required: Contract tests, authorization/tenant-negative tests, billing/subscription regression tests where applicable, migration rehearsal and rollback validation for schema work, load testing, and production rollout verification.

Rollback strategy: Must be designed and approved per change. No destructive rollback, database reset, Git reset, or emergency production change is authorized by this plan.

## Database Changes

None in Phase 1. No schema changes, migrations, indexes, query changes, or database reset commands are planned for this task.

Any later database work is a High-Risk Change requiring explicit approval, query-plan evidence, migration compatibility analysis, recovery steps, and likely Level 3 classification.

## API Changes

None in Phase 1. Existing routes, request shapes, response shapes, status codes, and pagination behavior remain unchanged.

Pagination, response reduction, aggregation endpoints, cache validators, or new parameters are deferred High-Risk/contract-sensitive work requiring explicit approval.

## Frontend Changes

No frontend changes are being made now. The proposed implementation order is request coordination, measured support scheduling, and measured route chunk work. Preserve all existing loading, empty, retry, unauthorized, rate-limit, and provider-error states.

## Backend Changes

No backend changes are being made now. Later backend work must keep authentication, authorization, tenant checks, billing ownership, entitlement enforcement, safe logging, and transaction boundaries unchanged unless a separately approved Level 3 plan says otherwise.

## Security Considerations

- Do not change bearer-token handling, tenant headers, server authorization, or ownership checks.
- Do not trust client-selected user, owner, tenant, subscription, payment, or organization identifiers.
- Do not expose secrets, raw provider responses, prompts, SQL, paths, or stack traces.
- Request sharing must be scoped to the authenticated user and active tenant; never share data across identities or organizations.
- Any auth, authorization, tenant isolation, billing, subscription, payment, migration, infrastructure, or future AI-provider change requires explicit approval and Level 3 review.

## Performance Considerations

The plan deliberately measures before changing. Success is defined by an observed improvement in agreed metrics without regression in critical user flows. Compare cold and warm sessions, slow-network behavior, multiple-tenant users, long support histories, and admin routes where applicable.

## Testing Plan

- Requirement/artifact integrity: inspect that only the requested task files are created at each phase.
- Phase 1 frontend checks: `cd frontend; npm.cmd run lint` and `cd frontend; npm.cmd run build`.
- Backend checks when backend code is later changed: `cd backend; php artisan test`.
- Backend build only if backend frontend assets are changed: `cd backend; npm.cmd run build`.
- Manual critical path: login/session restore → tenant discovery → dashboard readiness → tenant switching → billing/navbar interaction → support open/retry → notifications open.
- Regression focus: auth expiry, cross-tenant access, billing ownership, support separation, loading/error states, repeated navigation, and realtime offline fallback.

These are planned commands, not executed results.

## Manual Verification

Use an approved production-like environment with representative users, organizations, subscriptions, team memberships, support histories, and admin data. Capture baseline and post-change request waterfalls, timings, bytes, and query metrics. Verify no unauthorized or cross-organization data is exposed and no support message is lost or duplicated.

## Rollback Strategy

For Phase 1 client-only changes, revert only the isolated frontend files in the implementation diff, preserving unrelated user work. Do not use `git reset --hard`, broad checkout, destructive database commands, or deletion of unrelated artifacts.

Any backend, API, database, cache, infrastructure, auth, billing, or tenant-isolation change requires a separate rollback design before approval.

## Known Risks

- No runtime baseline exists yet; suspected bottleneck ranking may change after measurement.
- Development StrictMode can make effects appear duplicated; production-like measurements are required.
- Deferring support work may affect freshness expectations.
- Client request coordination can introduce stale-response or cancellation bugs.
- API pagination, caching, and database changes can affect compatibility and authorization.
- Existing plan artifacts were created with a clean baseline; the two prior task artifacts remain intentional untracked work.

## Approval Required

NO for the current documentation-only task and the proposed Phase 1 measurement/client-only scope, provided no API, backend, database, auth, billing, tenant-isolation, or infrastructure behavior is added.

YES for any recommendation classified as High-Risk Change, and for any scope expansion affecting authentication, authorization, tenant isolation, billing, subscriptions, payments, database migrations/indexes, caching policy, production infrastructure, or future AI providers/tools.

## Approval Status

Approval Status: PENDING

For the current Level 2 documentation task, this field does not create an implementation gate. No implementation is authorized by this document alone.

## Approved By

Not yet recorded. Codex cannot approve its own plan.

## Approval Notes

No approval has been recorded. Before implementation, confirm the measured Phase 1 scope and create any required amendment or revised plan. High-risk scope requires explicit developer approval and Level 3 handling.

## Recommended Phase 1 Implementation

1. Run the approved baseline measurements.
2. Implement only confirmed, client-side duplicate-request coordination.
3. Re-run frontend checks and critical-path manual verification.
4. Consider support scheduling or chunk-boundary changes only if the measurements justify them.

## Items Intentionally Deferred

- Backend query rewrites and dashboard aggregation changes.
- Tenant permission serialization changes.
- Support message pagination.
- API response-shape or route changes.
- Database indexes, migrations, and schema changes.
- Caching and production infrastructure/cache-header changes.
- Authentication, authorization, tenant-isolation, billing, subscription, and payment changes.
- New AI providers, chatbot runtime, RAG, automation, or metering.

## Approval Required: YES or NO

NO for the current documentation task and bounded Phase 1 measurement/client-only scope.

YES for any deferred High-Risk Change or any implementation that touches authentication, authorization, tenant isolation, billing, subscriptions, payments, database migrations/indexes, API contracts, caching policy, production infrastructure, or future AI tools/providers.

