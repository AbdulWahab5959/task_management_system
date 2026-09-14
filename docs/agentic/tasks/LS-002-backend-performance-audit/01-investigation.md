# LS-002 — Investigation

## Investigation status

- Task Level: Level 2
- Mode: Read-only source and route inspection
- Date: 2026-09-14
- Confidence: Moderate for code-path risks; low for runtime severity because no production-like query timings or plans were available.

## Sources and current state

- [00-requirement.md](00-requirement.md)
- [LS-001 investigation](../LS-001-website-performance-audit/01-investigation.md)
- [LS-001 QA](../LS-001-website-performance-audit/06-qa.md)
- [LS-001 evidence](../LS-001-website-performance-audit/07-evidence.md)
- [LS-001 Lighthouse follow-up](../LS-001-website-performance-audit/08-lighthouse-followup.md)
- `backend/AGENTS.md`
- `docs/agentic/README.md`
- Current backend routes, controllers, services, models, and migrations.

## Repository state

### FACT

- Branch: `master`.
- HEAD at investigation start: `8ad9a05 Implement Phase 1 frontend performance improvements`.
- Existing uncommitted changes are limited to LS-001 documentation files: `07-evidence.md` and `NEXT-PROMPT.md`.
- No backend, database, migration, or frontend application changes were made for LS-002.
- Only `LS-001-website-performance-audit` existed before this task; `LS-002-backend-performance-audit` is the new separate task folder.

## Production evidence carried forward

### FACT

LS-001’s production-preview Lighthouse dashboard report used `http://localhost:4173/dashboard`, had no Lighthouse warnings, and recorded FCP 0.5 s, LCP 1.6 s, Speed Index 2.0 s, TBT 0 ms, and Interactive 1.6 s.

### FACT

For each of `/api/auth/me`, `/api/tenants`, and `/api/tenant/dashboard/summary`, the report showed one XHR with status 200 and one CORS `Preflight` with status 204. The 204 request is not a duplicate application request. No support API request was observed while the support widget was closed.

### INFERENCE

The production capture does not indicate a remaining startup duplicate-request defect. Backend investigation should therefore focus on endpoint work that could become slow with larger tenants, more permissions, more subscription/usage records, or longer support histories.

## Route and authorization observations

### FACT

`backend/routes/api.php` places authenticated tenant operations under `auth:sanctum`. The dashboard summary is additionally protected by `tenant.identify` and `permission:organization.view`. The tenant list is authenticated but not tenant-scoped because it enumerates organizations visible to the authenticated user.

The safe route inventory command was run from `backend`:

```text
php artisan route:list --path=api --json
```

It completed successfully and confirmed the relevant middleware chains, including `auth:sanctum`, `IdentifyTenant`, and `RequireTenantPermission:organization.view` for the dashboard summary.

### FACT

`TenantDashboardController::summary()` reads the tenant from the request attributes populated by tenant identification and uses the authenticated user. It does not authorize from a client-supplied owner or subscription identifier.

### REQUIRES APPROVAL

Any performance change must preserve the existing authentication, organization authorization, tenant-connection ordering, billing ownership, and plan-entitlement rules. A performance proposal that changes these boundaries requires separate review and approval, potentially with higher risk classification.

## Dashboard summary assessment

### FACT

`backend/app/Http/Controllers/Api/TenantDashboardController.php::summary()` performs or invokes work for:

- tenant-scoped settings lookup for multiple keys;
- grouped `tenant_users` role counts;
- pending invitation count;
- authenticated owner subscription lookup with `plan` eager loading;
- active organization count for the subscription owner;
- organization entitlement summary;
- tenant usage summary;
- plan features, entitlements, limits, and subscription serialization;
- profile completion and setup checklist calculation.

`PlanEntitlementService::organizationSummary()` performs another active-tenant count for the supplied user. `usageSummary()` queries usage records for the current month and tenant/user scope.

### INFERENCE

The endpoint is a high-priority backend candidate because one response aggregates several independent domains and repeats organization-count work between the controller and entitlement service. The source establishes query breadth and possible overlap, but not latency, query count, or user-visible severity.

### RECOMMENDATION

Measure dashboard summary p50/p95 latency, SQL query count, slowest query duration, response size, and work by service under representative tenant/team/subscription/usage data before proposing a rewrite, cache, or response split.

## Tenant list assessment

### FACT

`TenantController::index()` retrieves every active tenant visible to the authenticated user in one unpaginated query, then maps each tenant through `serializeTenant()`.

`serializeTenant()` calls `TenantPermissionService::permissionsFor()`. That method first checks membership, iterates every configured permission key, and calls `userCan()` for each key. `userCan()` can query `tenant_users` and, when needed, `tenant_user_permissions` joined to `permissions`.

### INFERENCE

Tenant-list cost can grow with the number of active organizations and configured permissions. The permission loop is a likely repeated-query pattern for non-owner users. Existing `tenant_users` and tenant-permission unique/index coverage may help individual lookups, but does not remove the repeated application-level calls.

### RECOMMENDATION

Measure tenant count, permission-registry size, SQL query count, response size, and p50/p95 latency for owner, admin, member, and super-admin cases. Do not add an index or change serialization from source evidence alone.

## Billing overlap assessment

### FACT

`BillingController::getCurrentSubscription()` loads the authenticated user’s latest active-like subscription with its plan, up to 10 payments with plans, active organization count, organization entitlement summary, usage summary, and plan-derived limits/entitlements.

### INFERENCE

The billing endpoint duplicates some work present in dashboard summary, especially organization counts, entitlement resolution, and usage/subscription serialization. This may create avoidable work when a dashboard or navbar separately requests billing data, but the production Lighthouse report did not establish that billing was on the initial critical path.

### RECOMMENDATION

Use a browser Network trace plus backend request/query timing to establish whether billing is requested during dashboard startup, and measure overlap before considering coordination or response-contract changes.

## Support history assessment

### FACT

`SupportController::messages()` returns `$this->support->messages($conversation)->get()->reverse()->values()`. `SupportService::messages()` orders by descending message ID and eager-loads `sender`, but does not apply a limit, cursor, or page size.

The support message migration includes indexes on `conversation_id, created_at` and `conversation_id, read_at`.

### INFERENCE

The current endpoint is bounded by neither message count nor response size. It may become a database, serialization, and network bottleneck as a support conversation grows even though LS-001 now defers the request until the widget opens.

### REQUIRES APPROVAL

Pagination or cursoring would alter the API contract and frontend behavior. It requires a measured proposal, specification, compatibility review, and explicit approval; it is not authorized by this investigation.

## Existing index and query-shape observations

### FACT

Reviewed migrations already define useful indexes and uniqueness constraints for several relevant paths, including:

- tenant membership uniqueness and tenant/user/role indexes;
- tenant permission uniqueness and tenant/user indexes;
- support message conversation/time and read-state indexes;
- support conversation organization/status and last-message indexes;
- notifications user/read, category/created-at, tenant/user indexes;
- usage record uniqueness and user/metric/period and tenant/metric/period indexes;
- tenant owner/status/primary lifecycle index;
- subscription tenant and status indexes.

### INFERENCE

The presence of these indexes means an index addition cannot be justified from endpoint code alone. Exact database engine, cardinality, selectivity, query plans, and sort/filter patterns must be measured. Repeated counts and unbounded reads remain candidates even where single-column indexes exist.

## Safe measurements completed and not completed

### FACT — completed

- Read-only route inventory: `php artisan route:list --path=api --json` from `backend`; completed successfully.
- Static inspection of target controllers, services, models, routes, and migrations.
- Git status, branch, HEAD, and scoped diff inspection.

### NOT RUN — reason

- Backend test suite: not required for this read-only investigation and not a performance benchmark.
- `EXPLAIN`/query plans: not run because no approved production-like database profiling scope or safe representative dataset was established.
- Production endpoint p50/p95 timing: not available from repository inspection.
- SQL query logging/profiling: not enabled or changed; enabling it requires an approved measurement environment and safe handling of logs.
- Load testing: not run; no approved test dataset or load profile was provided.
- Migrations and database inspection commands that could expose credentials or private data: not run.

## Prioritized findings

| Priority | Candidate | Evidence | Confidence | Safe next measurement |
|---|---|---|---|---|
| 1 | Dashboard summary aggregation | Multiple service/query domains and repeated organization-count path | INFERENCE | Endpoint timing, query count, slow-query breakdown, payload size |
| 2 | Tenant list permission serialization | Unpaginated list plus permission loop and per-key authorization lookups | INFERENCE | Query count and latency by role/tenant/permission count |
| 3 | Unbounded support history | Complete message retrieval with eager-loaded sender and no limit | FACT/INFERENCE | Message cardinality, payload size, query duration, open-widget request timing |
| 4 | Billing/dashboard overlap | Similar subscription, organization, entitlement, and usage work | INFERENCE | Browser request waterfall and backend query/request correlation |

## Decision and next phase

### RECOMMENDATION

Keep LS-001 closed for frontend performance implementation. Use measured backend evidence to create a separate specification and plan before any backend, API, database, pagination, cache, or index change.

### REQUIRES APPROVAL

No implementation is approved by LS-002. A future implementation task must identify the measured bottleneck, preserve tenant/auth/billing rules, define rollback and compatibility behavior, and obtain the required developer approval before changing code or schema.

## Verification and safety result

- Application code changed: none.
- Backend code changed: none.
- Database/migrations changed: none.
- Migrations run: none.
- Commits/pushes: none.

## Draft Specification and Measurement Plan (2026-09-14)

### RECOMMENDATION — proposed problem statement

The strongest directly measured candidate is unbounded support-history retrieval: 100 synthetic messages returned about 61 KB in one response. The next specification should define a bounded history contract while preserving authenticated ownership and organization checks. Dashboard aggregation, billing overlap, and tenant-list permission serialization remain candidates for controlled reproduction rather than approved defects.

### RECOMMENDATION — support-history contract options

Evaluate these options in order:

1. **Preferred candidate:** additive cursor or `before_id` pagination that returns a bounded `data` collection plus explicit continuation metadata. Preserve the current default request as a bounded first page during migration, and define ordering, page size limits, empty-page behavior, and how new messages are merged in the widget.
2. **Compatibility fallback:** retain the existing array response temporarily but apply a server-owned maximum and document truncation. This reduces immediate payload risk but can hide older messages and does not provide a complete history contract.
3. **Not sufficient alone:** add only a frontend display limit. The backend would continue transferring the full conversation and would not address response-size or query-memory cost.

The preferred option changes an API contract and frontend loading behavior. It therefore remains a recommendation and requires explicit approval, API documentation, frontend compatibility work, authorization review, and regression tests before implementation.

### RECOMMENDATION — remaining controlled fixture matrix

If separately approved, reproduce the candidates in the same disposable environment with aggregate-only instrumentation:

- tenant list at 1, 3, and 10 active organizations, comparing owner/member serialization and response bytes;
- billing current at 0, 10, and 100 payment rows, keeping its response limit fixed;
- dashboard summary with controlled team membership, invitations, subscription, and current-period usage;
- support at 0, 100, and 1,000 messages, comparing current full retrieval with the approved bounded contract only after its contract is specified.

For each case, run at least two independent five-request samples. Preserve the authenticated identity, organization membership/status, tenant switch ordering, billing owner, and cross-organization rejection behavior. Record status, p50/p95 duration, response bytes, query count, aggregate query duration, and aggregate slow-query count/duration only.

### RECOMMENDATION — acceptance criteria

- Authorized requests retain the expected 2xx response and documented shape.
- Missing, inactive, and cross-organization tenant cases remain rejected before tenant-connection use.
- Billing results remain owned by the authenticated user; no client-supplied billing or tenant identifier becomes authoritative.
- Support responses have a documented maximum page size and deterministic ordering; pagination does not leak another user's or organization's conversation.
- Compare p50/p95, query count, slow-query count, and response bytes against the same-fixture baseline. Treat a repeated p95 regression above 20% or unexpected response growth as a release blocker for the candidate change.
- Re-run frontend support behavior and backend authorization tests before any merge. No local synthetic timing is a production SLO.

### RECOMMENDATION — rollback and compatibility

Use a feature flag or backward-compatible endpoint negotiation only if explicitly approved and designed in the plan. Define rollback as reverting the bounded-history implementation while retaining data. Do not delete support messages, rewrite historical records, or use destructive migrations. Any schema/index migration requires a separate Level 3 approval and backup/rollback plan.

### REQUIRES APPROVAL — implementation gate

This draft is not an approved specification or implementation plan. Explicit approval is required before changing support response shape, adding pagination, changing frontend consumption, adding indexes, changing queries, modifying cache/configuration, or running further fixture measurements that require database writes. The task remains Level 2 for investigation, but a behavior-changing implementation must satisfy the applicable API, authorization, tenant-isolation, and billing review gates.
- Secrets, credentials, raw provider responses, private data, and stack traces recorded: none.

## Additional Read-Only Verification (2026-09-14)

### FACT — route inventory measurement

From the `backend` directory, the following safe command was run successfully:

```text
php artisan route:list --path=api --json
```

The summarized result was `api_route_count=106`. The target route middleware chains were:

| Route | Middleware summary |
|---|---|
| `api/tenant/dashboard/summary` | `auth:sanctum`, `IdentifyTenant`, `RequireTenantPermission:organization.view` |
| `api/tenants` | `auth:sanctum` |
| `api/billing/current` | `auth:sanctum` |
| `api/support/conversation/messages` | `auth:sanctum`, `ThrottleRequests:30,1` |

### INFERENCE

The route inventory confirms that the dashboard summary preserves both tenant identification and organization-view authorization before controller execution. It does not measure controller latency, SQL query count, response size, or database performance.

### NOT RUN — unchanged limitation

No endpoint timing, query plan, SQL trace, load test, or production-data measurement was added. These require an approved safe measurement environment, representative data, and controls that prevent exposure of credentials or private data.

## Proposed Safe Measurement Plan (Approval Required)

### RECOMMENDATION — measurement environment

Use a disposable local Laravel environment with a non-production database and synthetic or explicitly approved test fixtures. Do not use production credentials, production records, customer content, payment data, or copied database dumps. Keep the existing application authorization and tenant-identification middleware active.

### RECOMMENDATION — request timing

Measure the four target endpoints separately, using an authenticated local test account and an organization owned by that account:

1. `GET /api/tenant/dashboard/summary` with the required `X-Tenant-ID` for the test organization.
2. `GET /api/tenants` for controlled owner, admin/member, and super-admin cases only if safe test identities exist.
3. `GET /api/billing/current` for a synthetic user with a non-sensitive local subscription fixture.
4. `GET /api/support/conversation/messages` for a local conversation with controlled message counts.

Capture status code, total request duration, response byte count, and success/failure category only. Do not record authorization headers, bearer tokens, response bodies, customer text, or raw URLs containing sensitive parameters. Use repeated cold and warm local requests with a documented fixed fixture; report median and p95 rather than a single timing.

### RECOMMENDATION — query count and slow-query summary

If approved, attach temporary in-process database instrumentation only in the disposable local process or an isolated test harness. Aggregate query count and duration by endpoint/request label, and record only totals and anonymized query-shape labels. Do not write raw SQL, bindings, tokens, or private values to logs. A query-duration threshold such as 50 ms may be used to count slow statements in this local profile, but it is a diagnostic threshold, not a production SLO.

The harness must begin and end instrumentation within the measurement request, remove listeners at completion, and write output only to an untracked temporary location outside the repository. No persistent application logging or configuration change is part of this proposal.

### RECOMMENDATION — representative fixture matrix

Use deterministic local fixtures that vary one dimension at a time:

- dashboard: one organization, small team, subscription, and current-period usage;
- tenant list: 1, 3, and 10 active organizations with controlled permission-registry size and owner/member roles;
- billing: 0, 10, and 100 local payment records while keeping the endpoint’s 10-item response limit;
- support: 0, 100, and 1,000 messages in one local conversation to expose unbounded response growth.

Do not create or alter fixtures until this measurement plan is approved. Do not use real user or payment data.

### RECOMMENDATION — acceptance thresholds and comparison

First establish a baseline for each fixture and endpoint. Treat the following as measurement acceptance checks, not product promises:

- 100% of authorized requests return their expected 2xx result and response shape;
- unauthorized, cross-organization, and missing-tenant cases remain rejected by existing middleware;
- report median and p95 total duration, query count, slow-query count, and response bytes for each fixture;
- flag any result whose p95 is more than 20% worse than the same-run baseline or whose response size grows unexpectedly with a fixed fixture;
- identify a candidate for remediation only when the result reproduces across at least two runs and remains attributable to the endpoint under test.

No code change should be proposed solely because a threshold is exceeded; the result must be reviewed against query shape, cardinality, authorization behavior, and compatibility impact.

### RECOMMENDATION — cleanup and rollback

Prefer a disposable database/process so cleanup is process termination and removal of temporary, untracked measurement output. If an approved harness temporarily registers listeners or changes local-only runtime settings, restore them in a `finally` path and verify the normal local process afterward. Do not run rollback migrations, truncate tables, reset databases, or delete repository files as part of this investigation.

### REQUIRES APPROVAL — risk classification

The proposed measurement remains Level 2 because it is local, read-only at the application-data level, and does not change contracts, authorization, schema, or infrastructure. Escalate if measurement requires production access, persistent profiling/configuration, private data, database writes, migration changes, or any authentication, billing, or tenant-isolation change.

## Approval Checklist (Measurement Not Yet Authorized)

The following conditions must be confirmed before any measurement execution:

- [ ] Environment is disposable and local.
- [ ] Database contains only synthetic or explicitly approved test fixtures.
- [ ] No production credentials, customer data, payment data, bearer tokens, raw response bodies, raw SQL, or private logs will be captured.
- [ ] Existing Sanctum authentication, tenant identification, organization authorization, billing ownership, and tenant-connection ordering remain active.
- [ ] Query instrumentation is temporary, in-process, aggregate-only, and cleaned up in a `finally` path.
- [ ] No repository configuration or application files need to change.
- [ ] No migrations, database resets, truncation, destructive cleanup, or persistent profiling are required.
- [ ] Endpoint timing, p95 comparison, query-count, slow-query, and response-size acceptance checks are understood.
- [ ] The task remains Level 2 unless the measurement scope expands.

### REQUIRES APPROVAL

This checklist is a gate, not an approval. No fixtures, database access, profiling, query listeners, configuration changes, or endpoint measurements have been authorized or performed. The developer must explicitly approve the complete local measurement scope before execution.

## Measurement Execution Attempt — Blocked (2026-09-14)

### FACT

A non-sensitive environment metadata check was run from the repository root to verify whether the approved disposable environment existed. It reported:

- `APP_ENV=local`;
- `DB_CONNECTION=mysql`;
- `DB_HOST=127.0.0.1` and `DB_PORT=3306`;
- a populated but intentionally redacted `DB_DATABASE` value;
- no `backend/*.sqlite` file available as a disposable local database candidate.

The check did not connect to the database, read application records, create fixtures, enable profiling, or change configuration.

### BLOCKED / NOT RUN

The four endpoint measurements, synthetic fixture creation, query instrumentation, response-size capture, and p50/p95 timing were not run. The current MySQL database cannot be treated as disposable or synthetic-only based on metadata alone, and no isolated SQLite/test database was available. Running against it could access private data or mutate shared local state, which would violate the approved checklist.

## Isolated Central Database Verification (2026-09-14)

### FACT

Using a temporary process-level `DB_DATABASE=saas_performance_test` override, the following read-only command completed successfully from `backend`:

```text
php artisan migrate:status --no-ansi
```

The command exited with status 0 and reported the imported migration schema as present. The repository `.env` was not changed and no migration was run.

### BLOCKED / NOT RUN

The endpoint measurement plan remains blocked. The authenticated requests require a controlled non-sensitive local test session, and dashboard/support execution can involve tenant SQLite databases. Those tenant database files were not verified as belonging to the imported synthetic dataset and were not accessed. No fixtures, token rows, database writes, query listeners, profiling, endpoint requests, or response captures were performed.

### REQUIRES APPROVAL

Before measurement, provide a complete isolated dataset: the central `saas_performance_test` database plus verified synthetic tenant databases and a safe way to use a synthetic authenticated test identity without exposing credentials or creating unapproved database rows. Alternatively, approve a separate test-harness setup that may create ephemeral auth/tenant fixtures and run migrations in a disposable environment.

### REQUIRES APPROVAL

Provide or explicitly approve an isolated disposable local database and synthetic fixture setup before measurement execution. The setup must be separate from the current MySQL database, must not use production or customer data, and must not require repository configuration changes or migrations. Until that prerequisite exists, no backend performance measurement is authorized.

### Correction to environment availability

The metadata check found SQLite files associated with tenant-database naming, but their purpose and contents were not inspected. They are not verified as disposable or synthetic-only and must not be used for measurement without explicit isolation approval. The blocker is therefore the absence of a **verified** disposable synthetic database, not proof that no SQLite files exist.

## Follow-up Environment Recheck (2026-09-14)

### FACT

A second non-sensitive metadata check confirmed `DB_CONNECTION=mysql`, a configured central database name, 36 SQLite files under the backend database directory, and `isolated_database_verified=False`.

### BLOCKED / NOT RUN

The SQLite files were not opened or inspected, and the existing MySQL database was not contacted. Because no database is verified as isolated, disposable, and synthetic-only, endpoint timing, fixture creation, profiling, query counts, and response-size measurements remain blocked.

## Authorized Disposable Measurement Execution (2026-09-14)

### FACT — environment and safety

The developer explicitly authorized a separate disposable test database, synthetic fixtures, and migrations, with an explicit prohibition on `saas_system` and unverified SQLite files. The measurement used the isolated `saas_performance_test` central database through a temporary process-level `DB_DATABASE` override and created the disposable tenant database `ls002_perf_tenant_20260914`. The tenant database was migrated, used only for the synthetic run, and dropped in cleanup. Synthetic central and tenant rows were removed in cleanup. No repository `.env` or application/configuration file changed.

The temporary harness preserved the Laravel request pipeline, Sanctum test authentication, tenant identification, organization authorization, billing ownership, and tenant-connection configuration. It captured only status, elapsed duration, response bytes, aggregate query count/duration, and aggregate query duration at or above the 50 ms diagnostic threshold. It did not print credentials, bearer tokens, raw SQL, bindings, response bodies, customer text, payment data, or private logs.

### FACT — command and execution record

From `C:\xampp\htdocs\SaaS-system`, on 2026-09-14, this command completed with exit status 0:

```text
$env:DB_CONNECTION='mysql'; $env:DB_DATABASE='saas_performance_test'; php 'tmp/ls002-measure.php'
```

The temporary harness ran `database/migrations/tenant`, seeded one synthetic owner/tenant/subscription, 100 synthetic support messages, and issued five sequential requests per endpoint. Sanitized output reported `setup=complete` and `cleanup=complete`. The temporary harness was removed after execution.

### FACT — endpoint results

These are local synthetic measurements, not production SLOs. `p50` and `p95` use five sequential application-pipeline requests per endpoint. The first request's response size and aggregate query metrics are shown for the fixed fixture.

| Endpoint label | Status | Durations (ms) | p50 / p95 (ms) | Response bytes | Queries | Query time (ms) | Slow queries >=50 ms |
|---|---:|---|---:|---:|---:|---:|---:|
| `tenants` | 200 | 22.02, 24.29, 24.90, 25.67, 73.14 | 24.90 / 73.14 | 620 | 17 | 18.41 | 0 / 0.00 ms |
| `dashboard_summary` | 200 | 34.30, 45.23, 49.08, 59.29, 119.29 | 49.08 / 119.29 | 1,883 | 19 | 78.12 | 0 / 0.00 ms |
| `billing_current` | 200 | 18.59, 20.20, 24.54, 26.18, 66.97 | 24.54 / 66.97 | 2,169 | 12 | 51.59 | 0 / 0.00 ms |
| `support_messages` | 200 | 56.04, 65.28, 65.65, 89.59, 111.59 | 65.65 / 111.59 | 61,002 | 13 | 22.52 | 0 / 0.00 ms |

### INFERENCE — interpretation

- All four authorized synthetic requests returned 200 through the real middleware/controller path.
- 100 support messages produced approximately 61 KB, directly demonstrating response-size growth from unbounded retrieval in this fixture.
- Dashboard summary performed 19 queries and billing current 12 in this fixture. These support the earlier candidates but do not alone justify a rewrite, cache, API, or schema change.
- No individual query crossed the 50 ms diagnostic threshold. This does not establish absence of performance risk.
- Five samples are directional; the planned 1/3/10 tenant, 0/10/100 payment, and 0/100/1,000 message matrices remain necessary before selecting a fix.

### NOT RUN — remaining checks

No production timing, Lighthouse/browser waterfall, duplicate-request observation, query plan, load test, concurrency test, or production-data measurement was run.

### RECOMMENDATION

Prepare a measured LS-002 specification and implementation plan, prioritizing bounded/paginated support history and validating dashboard/billing overlap and tenant-list permission serialization at controlled fixture sizes. Any backend, API, pagination, cache, index, schema, authorization, billing, or tenant-isolation change requires separate approval before implementation.

### REQUIRES APPROVAL

Measurement execution is complete, but no implementation is approved. Do not modify backend/application/database code, migrations, routes, configuration, API contracts, or tenant/auth/billing behavior until the specification and plan are reviewed and explicitly approved.

## Updated Safety Result

- Application/backend code changed: none.
- Repository database schema/migrations changed: none.
- Disposable tenant migrations ran only in `ls002_perf_tenant_20260914`; that database was dropped during cleanup.
- Existing `saas_system` and all unverified SQLite files were not used.
- Synthetic rows were cleaned up; harness cleanup reported complete.
- Commits/pushes: none.
