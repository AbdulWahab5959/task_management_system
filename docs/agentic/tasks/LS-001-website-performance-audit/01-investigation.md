# LS-001 — Investigation

## Investigation status

- Task Level: Level 2
- Investigation mode: Read-only static audit
- Date: 2026-09-07
- Confidence: Moderate. The flow and code risks are clear; runtime severity and ranking still require measurement.

## Scope and evidence rules

This investigation follows [docs/agentic/README.md](../../README.md), plus the repository, frontend, and backend `AGENTS.md` instructions. It separates observed code behavior from interpretation and from work that needs approval.

No secrets, credentials, raw provider responses, SQL dumps, or runtime stack traces are included here.

## Current AI/Codex workflow flow

### FACT

The repository now documents a progressive agentic workflow under `docs/agentic/`. For a standard Level 2 task, the documented sequence is:

```text
00 requirement
      ↓
01 investigation
      ↓
02 spec (only when needed)
      ↓
03 plan
      ↓
implementation
      ↓
04 review → 05 QA → 06 evidence
```

This task is the first real workflow test and intentionally stops after the two requested artifacts. No implementation, plan, review, QA, or evidence artifact is being created.

### FACT

The product instructions describe LaunchStack as SaaS infrastructure with organizations, billing, support, administration, and entitlement foundations. They do not authorize adding product AI/chatbot runtime work as part of this performance audit. The phrase “test the current AI workflow” is therefore treated here as testing the Codex/agentic engineering workflow, not as authorization to add an AI product feature.

### RECOMMENDATION

Review these two artifacts as the human checkpoint. If optimization work is approved, create the next artifact progressively after choosing the measured bottleneck and its risk class.

## Repository state at investigation start

### FACT

- `git status --short --untracked-files=all` was clean before artifact creation.
- The checked-out branch was `master`.
- The last observed commit was `0203ed5` (`Merge branch 'Chat-and-Support'`).
- The staged and unstaged diff summaries were empty before artifact creation.
- No application files were edited during this investigation.

The final status will necessarily include the two new documentation files created by this task.

## Current end-to-end loading flow

### FACT

The primary browser path is:

```text
main.tsx
  → React StrictMode + BrowserRouter
  → App.tsx
  → AuthProvider
  → TenantProvider
  → lazy route import + Suspense fallback
  → DashboardLayout
  → DashboardNavbar / Sidebar / Outlet / SupportWidget
  → dashboard page data requests
```

Observed request sequence for an authenticated dashboard session:

```text
Browser
  → GET /auth/me                 AuthProvider, when a local token exists
  → GET /tenants                  TenantProvider, when a user exists
  → GET /me/invitations           TenantProvider fallback when no tenant is returned
  → load dashboard route chunk    React.lazy/Suspense
  → GET /tenant/dashboard/summary DashboardPage, when a tenant is active
```

The exact sequence can vary with authentication state, route, stored active tenant, and component interactions.

### FACT

`frontend/src/services/api.ts` creates one Axios client. It reads `VITE_API_BASE_URL`, falls back to a localhost API URL, adds the stored bearer token, and adds `X-Tenant-ID` when a tenant-scoped request asks for it. This means most application data requests depend on the same authenticated API client and tenant-header behavior.

### FACT

`frontend/src/context/AuthContext.tsx` calls `authService.me()` on mount when a token is present. `frontend/src/context/TenantContext.tsx` then calls `tenantService.list()` after a user is available. If the list is empty, it requests user invitations. Tenant creation calls the create endpoint and then refreshes the complete tenant list.

### FACT

`frontend/src/App.tsx` uses `React.lazy` for most routes and wraps the route outlet in `Suspense`. Route-level splitting is therefore present. The authenticated layout remains shared across dashboard routes, so its persistent components remain part of the active dashboard shell.

### INFERENCE

The initial authenticated experience has a request fan-out before the user sees a fully useful dashboard: authentication, tenant discovery, route chunk loading, dashboard summary, and layout-level requests can overlap or serialize depending on state. The source does not provide timings, so the contribution of each request is not yet quantified.

## Frontend findings

### FACT — dashboard and shared layout

- `frontend/src/pages/Dashboard/DashboardPage.tsx` requests `tenantDashboardService.getSummary()` when a tenant is active.
- When there is no active tenant, the dashboard page requests current billing information.
- The dashboard has explicit loading, error, and empty-state branches.
- `frontend/src/layouts/DashboardLayout.tsx` mounts `DashboardNavbar`, `Sidebar`, the route outlet, and `SupportWidget` for non-super-admin users.
- `frontend/src/components/dashboard/DashboardNavbar.tsx` can request current billing and billing plans when the organization control is opened and billing data is not already present.
- `frontend/src/components/dashboard/NotificationDropdown.tsx` fetches 10 notifications only when the dropdown is opened, and supports retry and read-state actions.

### FACT — support widget

`frontend/src/components/support/SupportWidget.tsx` is mounted in the shared layout. On tenant availability it requests the support conversation and FAQs in parallel, then requests conversation messages separately. It also refreshes messages when opened and uses polling intervals when the widget is open or closed; the intervals are shorter when realtime is offline. Realtime subscription, read-state, FAQ selection, send, and reopen actions add further API activity.

### INFERENCE

The support widget can add background traffic to every ordinary dashboard session even when the user is not actively using support. The initial support conversation, FAQ, and message requests are especially likely to compete with dashboard requests on slower connections.

### FACT — component and asset size signals

- `frontend/src` contains 121 files and approximately 740,786 bytes in the checked-out source tree.
- The largest source files observed include `BillingPage.tsx` (about 51.9 KB), `AdminPaymentsPage.tsx` (about 40.7 KB), `AdminSubscriptionsPage.tsx` (about 28.0 KB), `DashboardNavbar.tsx` (about 27.5 KB), `PlansPage.tsx` (about 27.0 KB), and `SupportWidget.tsx` (about 20.7 KB).
- `frontend/public` contains one asset of approximately 9.5 KB in the checked-out tree.
- The source includes route-level lazy imports, but no documented bundle-size budget, Lighthouse budget, or Core Web Vitals check was found in the inspected project files.

File size is not bundle size. These values identify review candidates only; a production build and bundle report are required before ranking them.

### INFERENCE

Large page modules can increase route chunk download/parse cost, especially if their imports are not isolated. The shared navbar and support widget can also keep relatively complex code in the authenticated shell. React `StrictMode` is enabled; in development, effect behavior can make duplicate-looking requests appear in the browser network panel, so development observations must be separated from production measurements.

### RECOMMENDATION

Measure the production build’s entry and route chunks, transfer sizes, parse/evaluation time, and request waterfall before splitting additional components or changing imports. Use a real production-like deployment and compare cold and warm navigation.

## Current dashboard and API behavior

### FACT — tenant discovery

`backend/app/Http/Controllers/TenantController.php@index` returns all active tenants visible to the authenticated user in one response. It does not paginate. Each tenant is serialized with role and permissions.

`TenantPermissionService::permissionsFor()` first checks membership and then evaluates every registered permission through `userCan()`. `userCan()` performs a membership lookup for each permission and may perform a direct-permission lookup. Therefore tenant-list serialization can perform repeated database work per tenant and per registered permission.

### INFERENCE

`GET /tenants` is a likely startup bottleneck for users with multiple organizations or a large permissions registry. It is also a response-growth risk because the request is unbounded and includes permissions for every returned tenant.

### FACT — dashboard summary

`backend/app/Http/Controllers/Api/TenantDashboardController.php@summary` gathers tenant settings, grouped tenant-user role counts, pending invitations, the owner’s latest relevant subscription with its plan, active organization count, entitlement organization summary, and usage summary. It returns profile, team, billing, usage, subscription, feature, and setup-checklist data in one response.

### INFERENCE

`GET /tenant/dashboard/summary` is a leading candidate for slow dashboard data. The endpoint is convenient for the SPA, but it combines multiple concerns and several related service calls. The organization count is obtained in the controller and again through entitlement summary; subscription/plan resolution can also be repeated by entitlement helpers. The source supports a query-count risk, but not a measured latency or N+1 conclusion.

### FACT — support and notifications

- `backend/app/Http/Controllers/Api/SupportController.php@messages` calls the support message relation with `get()` and reverses the complete result. There is no page-size or cursor in this customer-facing history endpoint.
- `backend/app/Services/SupportService.php@messages` orders messages by newest ID and eager-loads the sender, which avoids a sender lookup per message but does not bound the history.
- `backend/app/Http/Controllers/Api/NotificationController.php` delegates list and unread-count work to `NotificationService`; the list service performs separate list and unread-count query work for a notification request.
- `frontend/src/components/dashboard/NotificationDropdown.tsx` only starts notification loading after explicit user interaction, limiting its initial-load impact.

### INFERENCE

Support history is a data-growth bottleneck that can become both a database and payload bottleneck as conversations grow. Notification loading is less likely to delay the first dashboard paint because it is interaction-triggered, but its list/unread query behavior should still be measured.

## Backend/API structure and likely slow endpoints

### FACT

The central API surface is defined in `backend/routes/api.php`. It includes authentication, tenant discovery and tenant-scoped routes, dashboard summary, billing and payments, invitations, notifications, support conversations/messages, activity, and super-admin routes for support, analytics, activity logs, users, plans, subscriptions, payments, and contact messages.

### Likely candidates

| Endpoint or flow | Evidence | Assessment |
|---|---|---|
| `GET /tenant/dashboard/summary` | Aggregates settings, team counts, invitations, subscription/plan, organization counts, entitlements, usage, and setup data | **INFERENCE:** highest-priority authenticated dashboard candidate; measure query count, p50/p95 latency, and payload size |
| `GET /tenants` | Unpaginated list plus permission serialization with repeated membership/direct-permission checks | **INFERENCE:** likely startup cost grows with tenant count and permission count |
| `GET /support/conversation/messages` | Complete message history returned with `get()` | **FACT:** unbounded; **INFERENCE:** grows with conversation history and payload size |
| `GET /billing/current` | Subscription, latest payments, organization count, entitlement summary, and usage-related work | **INFERENCE:** potentially expensive and overlaps with dashboard/navbar billing loads |
| `GET /admin/analytics` | Multiple counts/aggregates, subscription-plan processing, and recent activity work | **INFERENCE:** likely admin-only query-heavy endpoint at scale |
| `GET /admin/subscriptions` | Paginated list plus separate totals/counts and search joins with wildcard matching | **INFERENCE:** likely sensitive to table size and search selectivity |
| `GET /support/conversation` | Ownership and active-organization checks using relationship constraints | **INFERENCE:** measure with realistic membership/conversation data; authorization must remain unchanged |

### FACT — bounded or healthier patterns

- `DashboardController@activity` eager-loads the user relationship and limits the activity list to 10 records.
- Payment history has a 10-item limit in the current billing summary and a paginated payments endpoint.
- Admin support, users, contact messages, and subscriptions use pagination in their list flows, although their aggregate/search behavior still needs measurement.

## Database findings

### FACT

The migrations show useful indexes for many access paths, including tenant membership, activity logs, notifications, support conversations/messages, and usage-record uniqueness/access patterns. Support messages have conversation/time-oriented indexes, and tenant users have tenant/user membership indexes.

### FACT

The code still contains unbounded or potentially repeated work:

- Tenant discovery retrieves all active tenants and serializes permissions for each.
- Customer support messages retrieve an entire conversation history.
- Dashboard and billing summaries each count active organizations and resolve subscription/entitlement data through overlapping paths.
- Admin analytics performs several independent aggregate queries and maps subscription-plan distributions in application memory.
- Some admin searches use wildcard `LIKE` predicates across joined user/plan fields; index usefulness depends on the predicate and database engine.

### INFERENCE

Potential database bottlenecks include repeated subscription lookups, repeated tenant counts, permission-loop queries, growing support history, and missing composite indexes for the exact filter/order combinations used by subscription and tenant summaries. These are candidates only. No query plan or production-like cardinality was available, so no index should be added based on this document alone.

### REQUIRES APPROVAL

Any new index, query rewrite, denormalized summary, cache, pagination contract, or database configuration change requires a measured proposal and review. Migration work must not begin as part of this investigation.

## Build, tests, and measurement commands

### FACT — available commands

- Frontend lint: `cd frontend; npm.cmd run lint`
- Frontend production build: `cd frontend; npm.cmd run build` (`tsc -b && vite build`)
- Frontend preview: `cd frontend; npm.cmd run preview`
- Backend tests: `cd backend; php artisan test`
- Backend build: `cd backend; npm.cmd run build`
- Backend route inspection: `cd backend; php artisan route:list`

The frontend package has no dedicated test script or browser performance test script in `frontend/package.json`. Backend PHPUnit configuration uses an in-memory SQLite test environment for the configured test suite. Existing backend tests cover functional areas, but no performance benchmark or load-test suite was identified.

### FACT — commands not run

The frontend build, frontend lint, backend test suite, backend route list, backend build, browser trace, Lighthouse run, database `EXPLAIN`, and production request profiling were not run during this artifact-only audit. They were intentionally not run because the user required only the two documentation artifacts and no implementation; build/test tooling may generate caches, build output, logs, or other files that would violate the strict “create only” boundary. No runtime performance claim is made from those unrun checks.

### RECOMMENDATION

The next phase should run the narrowest safe checks in a controlled environment, starting with the production frontend build and route/build output inspection, then browser waterfall/CWV measurements and backend query/timing instrumentation in non-production. Capture request count, transfer size, TTFB, endpoint p50/p95, database query count/time, and dashboard time-to-usable.

## Affected files and review targets

### Frontend

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/context/TenantContext.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/layouts/DashboardLayout.tsx`
- `frontend/src/components/dashboard/DashboardNavbar.tsx`
- `frontend/src/components/dashboard/NotificationDropdown.tsx`
- `frontend/src/components/support/SupportWidget.tsx`
- `frontend/src/services/tenant.service.ts`
- `frontend/src/services/tenant-dashboard.service.ts`
- `frontend/src/services/support.service.ts`
- `frontend/src/services/billing.service.ts`
- `frontend/src/services/notifications.service.ts`
- `frontend/vite.config.ts`
- `frontend/package.json`

### Backend/API

- `backend/routes/api.php`
- `backend/app/Http/Controllers/TenantController.php`
- `backend/app/Http/Controllers/Api/TenantDashboardController.php`
- `backend/app/Http/Controllers/Api/SupportController.php`
- `backend/app/Http/Controllers/Api/BillingController.php`
- `backend/app/Http/Controllers/Api/NotificationController.php`
- `backend/app/Services/TenantPermissionService.php`
- `backend/app/Services/PlanEntitlementService.php`
- `backend/app/Services/SubscriptionResolver.php`
- `backend/app/Services/TenantSubscriptionResolver.php`
- `backend/app/Services/NotificationService.php`
- `backend/app/Services/SupportService.php`
- `backend/app/Http/Controllers/Admin/AnalyticsController.php`
- `backend/app/Http/Controllers/Admin/SubscriptionController.php`

### Database and verification

- `backend/database/migrations/2026_06_12_000001_create_plans_table.php`
- `backend/database/migrations/2026_06_12_000002_create_tenants_table.php`
- `backend/database/migrations/2026_06_12_000003_create_subscriptions_table.php`
- `backend/database/migrations/2026_06_12_000005_create_tenant_users_table.php`
- `backend/database/migrations/2026_07_03_000002_create_notifications_table.php`
- `backend/database/migrations/2026_08_24_000001_create_support_conversations_table.php`
- `backend/database/migrations/2026_08_24_000002_create_support_messages_table.php`
- `backend/database/migrations/2026_09_02_000001_enhance_notifications_table.php`
- `backend/database/migrations/2026_09_04_000002_create_usage_records_table.php`
- `backend/phpunit.xml`
- `frontend/package.json`
- `backend/composer.json`

## Performance risks

### FACT

- Route-level code splitting exists, but authenticated shared-shell code is persistent.
- Tenant loading and support message loading are unbounded at the API contract level.
- Dashboard and billing flows contain overlapping organization/subscription/entitlement work.
- The support widget creates background request and realtime/polling activity.
- There is no identified automated performance budget, browser trace, load test, or endpoint latency threshold.

### INFERENCE

The most credible current risk is not that the SPA lacks code splitting; it is that the first authenticated view has multiple data dependencies and that several responses do more work than the first screen requires. Data growth will amplify tenant, support-history, admin-search, and aggregate-query costs.

## Quick wins for a later, approved implementation phase

### RECOMMENDATION

Prioritize changes that can be measured and kept contract-safe:

1. Establish a production-like baseline and identify the slowest request/chunk before editing.
2. Avoid starting support history/background refresh work until it is needed, or introduce a reviewed client-side data policy that preserves support freshness.
3. Deduplicate shared billing/tenant requests across context, navbar, dashboard, and billing pages.
4. Bound support history with an approved pagination/cursor contract and a clear “load older” UX.
5. Reduce tenant-list payload and permission lookup work only after confirming authorization semantics and reviewing the API contract.
6. Inspect generated Vite chunks and dependencies, then split or replace large imports only where the measured bundle cost warrants it.
7. Verify production compression, immutable asset caching, and static-asset delivery at the deployment layer if those settings are in scope and documented.

## Deeper improvements for a later phase

### RECOMMENDATION

- Define performance budgets and acceptance metrics for initial load, authenticated dashboard readiness, route navigation, request count, response bytes, and endpoint p95.
- Instrument backend endpoint timing and database query count/time in non-production or an approved observability environment.
- Use query plans and realistic cardinalities to evaluate composite indexes and query shapes.
- Refactor dashboard aggregation around a measured query plan, shared subscription/entitlement resolution, and a minimal response contract; consider caching only with explicit invalidation and entitlement-safety rules.
- Add request cancellation/deduplication and stale-data policy at the frontend service/query layer if the application architecture supports it.
- Add a small, repeatable performance smoke test for the critical login-to-dashboard path and the largest admin/support views.

## What must not be changed yet

### REQUIRES APPROVAL

Do not change React components, API services, Laravel controllers, database queries, migrations, caching, routes, middleware, configuration, authentication, billing ownership, tenant authorization, or support semantics in this investigation task.

Do not add AI providers, chatbot runtime, RAG, automation, metering, or unrelated refactors. Do not run migrations, database reset commands, destructive commands, commits, or pushes.

## Recommendations for the next phase

### RECOMMENDATION

1. Review this investigation and agree on a baseline environment and target metrics.
2. Run safe measurement work: production frontend build analysis, browser waterfall/CWV, endpoint timings, query counts, and query plans against approved non-production data.
3. Rank bottlenecks by user impact, risk, and reversibility.
4. Create `02-spec.md` only for the selected change if it changes API response shape, pagination, cache semantics, loading behavior, architecture, or compatibility expectations.
5. Create `03-plan.md` after the scope is approved. Keep optimization work in small vertical slices with tests and verification.

## Is `02-spec.md` needed?

### FACT

`02-spec.md` is not needed to complete this read-only audit, and it has intentionally not been created.

### RECOMMENDATION

Create it in the next phase if the chosen optimization changes an API contract, pagination, cache semantics, dashboard loading behavior, or frontend/backend architecture. A purely internal, low-risk optimization may proceed through the Level 2 plan without a separate spec if the workflow owner agrees.

## Level decision

### FACT

This task remains Level 2. The current work is investigation-only, read-only, and does not alter authentication, billing, tenant isolation, migrations, production infrastructure, or customer data.

### INFERENCE

The likely next optimization can remain Level 2 if it is a bounded performance change with stable authorization and API behavior. The classification cannot be finalized for implementation until runtime evidence identifies the actual change.

### REQUIRES APPROVAL

Reclassify to Level 3 and obtain the required human approval before implementation if the selected solution requires authentication or billing changes, changes tenant isolation/authorization, introduces database migrations or risky data changes, changes production infrastructure/cache policy materially, or changes a compatibility-sensitive public API contract.

## Final investigation conclusion

### FACT

The source confirms route-level SPA splitting and explicit loading states, but also confirms several unbounded or overlapping data paths.

### INFERENCE

The leading suspects are the dashboard summary aggregation, unpaginated tenant discovery with permission serialization, support widget background traffic, and unbounded support message history. Build size and static delivery remain unmeasured.

### RECOMMENDATION

Measure those paths first, then implement only the smallest approved change that improves a defined metric without weakening authentication, billing ownership, tenant authorization, support separation, or data correctness.

