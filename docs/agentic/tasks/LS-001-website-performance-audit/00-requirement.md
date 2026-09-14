# LS-001 — Website Performance Audit

## Task metadata

- Task Level: Level 2
- Status: INVESTIGATING
- Created: 2026-09-07
- Scope: Read-only performance investigation and current AI/Codex workflow test
- Workflow reference: [docs/agentic/README.md](../../README.md)

## Original request

> The website is slow and data loading is slow even though the website is SPA. I want to increase website speed and test the current AI workflow.

## Problem statement

The LaunchStack website feels slow during initial SPA loading and while retrieving dashboard and related data. The cause has not yet been measured. The investigation must identify likely frontend, backend, API, database, build, and static-asset bottlenecks before any optimization is proposed for implementation.

## Objective

Produce an evidence-based, read-only audit of the current performance path, including:

- SPA startup and route-loading behavior.
- Dashboard, tenant, billing, support, and notification request behavior.
- Laravel endpoint and service/query behavior.
- Database query, pagination, eager-loading, and index risks.
- Vite bundle/build and static-asset risks.
- A prioritized set of safe next steps and measurements.
- A record that the Level 2 `docs/agentic/` workflow was exercised correctly.

## In scope

- Frontend initial load, route-based code splitting, large components, data-loading effects, repeated requests, loading states, dashboard, support/chat widget, notifications, admin pages, and assets.
- Backend API structure, likely slow endpoints, controller/service work, pagination, eager loading, N+1 risks, caching opportunities, and middleware/request overhead.
- Database indexes, joins, unbounded queries, subscription/organization/support/dashboard access patterns, and query-plan risks.
- Available safe build, route, test, and inspection commands.

## Explicitly out of scope for this task

- React, API service, Laravel controller, query, route, middleware, configuration, cache, migration, or database changes.
- Performance optimization implementation.
- Schema changes, migrations, database resets, destructive commands, commits, or pushes.
- New chatbot runtime, AI provider, RAG, automation, metering, or other product functionality.
- `02-spec.md`, `03-plan.md`, review, QA, or evidence artifacts during this investigation-only phase.

## Acceptance criteria

- [ ] The original request and `Task Level: Level 2` classification are preserved.
- [ ] The current frontend-to-API-to-backend-to-database loading path is documented with FACT, INFERENCE, RECOMMENDATION, and REQUIRES APPROVAL labels.
- [ ] Likely bottlenecks, affected files, risks, quick wins, deeper improvements, and next-phase recommendations are recorded.
- [ ] Runtime limitations and commands not run are explicitly disclosed; no timings are fabricated.
- [ ] Only `00-requirement.md` and `01-investigation.md` are created for this task.
- [ ] No application, database, migration, route, middleware, configuration, or optimization changes are made.
- [ ] The next-phase artifact and task-level decision are explicitly addressed.

## Known constraints and risks

- This first pass is static/read-only unless a safe inspection command is explicitly run.
- No production-like data volume, query plans, browser waterfall, server timings, or Core Web Vitals are available from source inspection alone.
- A later optimization may need a specification if it changes response shape, pagination, caching semantics, or frontend loading behavior.
- Any later work involving authentication, billing ownership, tenant isolation, migrations, or infrastructure requires additional review and may require Level 3 classification.

## Human decisions reserved for a later phase

- Approve a performance baseline and environment for repeatable measurements.
- Approve API contract changes, pagination behavior, cache policy, or database indexes if recommended by measured evidence.
- Reclassify to Level 3 if the selected solution affects high-risk authorization, billing, tenant isolation, migrations, or infrastructure.

