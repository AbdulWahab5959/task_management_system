# Baseline Performance Measurement

## Sources

- 00-requirement.md
- 01-investigation.md
- 02-spec.md
- 03-plan.md
- AGENTS.md
- frontend/AGENTS.md
- backend/AGENTS.md
- docs/agentic/README.md

This artifact records Phase 1 Step 1 only: measurement and inspection. No performance fix was implemented.

## Date

2026-09-08, Asia/Karachi.

## Git State

### FACT

Before measurement, Git reported only the four intentional task artifacts as untracked. The branch was master, base revision was 0203ed5 Merge branch 'Chat-and-Support', and no staged or unstaged application diff was present.

## Commands Executed

| Command | Result | Notes |
|---|---|---|
| git status --short --untracked-files=all | PASS | Confirmed the four existing task artifacts before measurement. |
| git branch --show-current | PASS | Returned master. |
| git log -1 --oneline | PASS | Returned 0203ed5 Merge branch 'Chat-and-Support'. |
| cd frontend; npm.cmd run lint | PASS | ESLint exit code 0 with no reported violations. |
| cd frontend; npm.cmd run build | PASS | TypeScript and Vite production build exit code 0; 1,897 modules transformed; built in 7.42 seconds. |
| cd backend; php artisan route:list | PASS | Listed 111 routes with exit code 0. |
| cd backend; php artisan test | PASS | 151 tests passed, 741 assertions, duration 28.63 seconds. |
| cd frontend; inspect dist assets | PASS | Production output inventory: 76 files and 895,107 bytes, about 0.85 MB uncompressed. |
| cd backend; focused route-list attempt | PARTIAL | An auxiliary multi-filter attempt returned only the final notifications filter. The complete route-list result above is authoritative. |

No migrations, seeders, database resets, destructive commands, commits, or pushes were run.

## Frontend Build Output

### FACT

The production build succeeded with Vite 8.0.16. It transformed 1,897 modules and completed in 7.42 seconds.

Reported output:

- JavaScript entry: 413.14 kB, 126.45 kB gzip.
- CSS entry: 85.15 kB, 14.85 kB gzip.
- BillingPage route chunk: 48.45 kB, 9.69 kB gzip.
- AdminPaymentsPage route chunk: 25.14 kB, 6.24 kB gzip.
- DashboardPage route chunk: 19.33 kB, 5.02 kB gzip.
- AdminSubscriptionsPage route chunk: 18.66 kB, 4.23 kB gzip.
- UserSettingsPage route chunk: 16.98 kB, 4.63 kB gzip.
- TeamPage route chunk: 16.92 kB, 4.74 kB gzip.
- PlansPage route chunk: 16.56 kB, 4.49 kB gzip.

The build reported plugin timing proportions of vite:css-post 41%, vite:css 26%, and vite:build-html 25%.

## Bundle / Chunk Observations

### FACT

Route-level chunks are present, confirming existing code splitting. The shared JavaScript entry is larger than individual route chunks, while BillingPage is the largest route-specific JavaScript chunk.

### INFERENCE

The shared entry and CSS are the most important first-load bundle candidates. BillingPage and AdminPaymentsPage are route-specific review candidates, but size alone does not prove user-visible slowness.

### NOT MEASURED

No browser download/parse/evaluation timing, source-map composition, dependency contribution report, deployed transfer compression, or Core Web Vitals measurement was captured.

## Backend Route Inventory

### FACT

The complete route command listed 111 routes. Relevant groups are:

- Authentication: api/auth/me, login, logout, registration, verification, password, and 2FA.
- Tenant discovery: api/tenants and api/tenants/{tenant}.
- Dashboard: api/tenant/dashboard/summary and api/dashboard/activity.
- Billing: api/billing/current, plans, payments, invoices, checkout, and Stripe.
- Support: api/support/conversation, messages, FAQs, read/status, and admin support.
- Notifications: api/notifications, unread-count, read, and read-all.
- Administration: analytics, subscriptions, payments, users, support, activity logs, plans, and contact messages.

## Critical Path Endpoints

### FACT

The authenticated dashboard flow can involve:

1. GET /api/auth/me when a stored token exists.
2. GET /api/tenants after the user is available.
3. Dashboard route chunk loading.
4. GET /api/tenant/dashboard/summary when an active tenant exists.
5. Support conversation, FAQ, and message requests from the persistent support widget.

Billing current/plans and notifications are interaction-dependent in the inspected source.

### INFERENCE

Dashboard summary and tenant discovery remain the highest-priority endpoint candidates. Support requests are more likely background contention than required dashboard data.

## Dashboard Runtime Measurements

### NOT MEASURED

Codex could not perform an authenticated browser session against the local application. No browser automation, DevTools trace, HAR, server timing trace, database query log, query plan, or production-like request profile was available.

The following values are therefore not claimed: authenticated request count, cold/warm time-to-usable, slowest request, largest response, request waterfall, Core Web Vitals, endpoint p50/p95, or database query count/time.

## Duplicate Request Findings

### FACT — source-level

Auth context requests auth/me when a token exists. Tenant context requests tenants after user resolution. Dashboard summary loads from the dashboard page. The support widget loads conversation, FAQs, and messages from the shared layout and refreshes/polls according to state. Dashboard navbar billing interaction can request current billing and plans. Notifications load only when opened.

### INFERENCE

Potential duplicate or competing requests include billing data requested by more than one dashboard surface and support traffic occurring while dashboard data loads. Development StrictMode can also make effect behavior appear duplicated. These are not runtime-confirmed duplicates.

### NOT MEASURED

No runtime URL-count comparison was possible.

## Slow Request Findings

### FACT — source-level candidates

- GET /api/tenant/dashboard/summary combines settings, role counts, invitations, subscription/plan, organization counts, entitlements, usage, and setup data.
- GET /api/tenants returns all active visible tenants and serializes permissions.
- GET /api/support/conversation/messages retrieves complete conversation history.
- GET /api/admin/analytics performs multiple aggregates and application-side distribution work.
- GET /api/admin/subscriptions combines pagination with totals and wildcard search joins.

### INFERENCE

These endpoints are likely to become slow as data volume grows, but this baseline does not establish their latency ranking.

## Large Response Findings

### FACT

The frontend output contains a 413.14 kB uncompressed JavaScript entry and 85.15 kB CSS entry. The dashboard route chunk is 19.33 kB and BillingPage is 48.45 kB.

The source also shows unpaginated tenant data and complete support message history responses.

### NOT MEASURED

Actual API response sizes, compressed transfer sizes, and payload contents were not captured.

## Source-Level Performance Findings

### FACT

- Existing route-based lazy loading works in the production build.
- Frontend lint and production build pass.
- Backend route registration succeeds.
- Backend functional tests pass, including dashboard, tenant authorization, billing/subscription, support, notification, and authentication coverage.
- Tenant discovery is unpaginated and permission serialization performs repeated membership/direct-permission checks.
- Support message retrieval is unpaginated.

### INFERENCE

The strongest risks are request fan-out and data-query/payload growth, not absence of SPA code splitting. The large shared entry and CSS are the main frontend bundle candidates; API/database severity remains unmeasured.

## What Could Not Be Measured

### NOT MEASURED

- Authenticated cold and warm dashboard load.
- Request count, duplicate URLs, slowest request, and largest response.
- Browser waterfall, TTFB, LCP, FCP, INP, CLS, and TBT.
- Server endpoint p50/p95 and Laravel middleware/controller/service timing.
- Database query count, duration, index usage, and EXPLAIN plans.
- Production compression, cache headers, CDN behavior, and network transfer size.
- Performance under multiple organizations, large teams, long support histories, or large admin datasets.

## Manual DevTools Steps Required

1. Start the backend in the approved local or staging environment.
2. Start the frontend in the approved local or staging environment.
3. Open Chrome DevTools and select the Network tab.
4. Enable Disable cache and Preserve log.
5. Log in as a normal user with a representative active organization.
6. Load the dashboard from a cold page load.
7. Record or export a HAR with total requests, duplicate URLs, initiators, slowest requests, largest responses, transferred bytes, dashboard time-to-usable, and chunk sizes.
8. Repeat once as a warm load without clearing browser storage/cache.
9. Compare cold versus warm request count, timing, bytes, and time-to-usable.
10. Repeat with the support widget closed and opened.
11. Repeat tenant switching and billing/navbar interaction.
12. Capture a Lighthouse or Performance panel trace for Core Web Vitals.
13. Correlate timestamps with approved non-production Laravel/query instrumentation if available.

Do not place tokens, secrets, customer data, raw SQL, raw provider responses, or stack traces in task artifacts.

## Baseline Summary

### FACT

- Frontend lint: PASS.
- Frontend production build: PASS.
- Backend route inventory: PASS, 111 routes.
- Backend tests: PASS, 151 tests and 741 assertions.
- Build: 1,897 modules transformed; 413.14 kB JavaScript entry; 85.15 kB CSS entry; 48.45 kB largest route chunk.
- No application or database files changed.

### INFERENCE

The automated baseline is healthy and identifies frontend bundle candidates, but it does not yet prove the reported slowness or identify whether frontend, API, backend, or database work dominates.

## Recommended Next Action

### RECOMMENDATION

Complete the authenticated DevTools capture and approved backend request/query profiling. If duplicate frontend requests are confirmed without contract changes, proceed with Step 2 from 03-plan.md: narrowly scoped frontend request coordination.

Do not implement backend query changes, pagination, caching, API changes, database changes, infrastructure changes, or auth/billing/tenant-isolation changes from this baseline alone.

## Is Implementation Now Justified?

PARTIAL

The automated checks are healthy and support investigating a low-risk frontend coordination change. Runtime evidence is still missing, so implementation should wait for the authenticated dashboard waterfall unless the developer explicitly accepts a source-only Phase 1 change.

## If YES/PARTIAL, Which Step From 03-plan.md Should Be Implemented First?

Step 2 — Coordinate duplicate critical frontend requests, but only after confirming duplication or contention in DevTools. It is the safest proposed implementation because it can preserve existing API contracts and avoid database/schema changes.

## Risk Classification After Measurement

Level 2 for this baseline and a bounded client-only Step 2 implementation.

Level 3 is required if later work touches authentication, authorization, tenant isolation, billing/subscriptions/payments, database migrations/indexes, API compatibility-sensitive contracts, production infrastructure/cache policy, or future AI providers/tools.

