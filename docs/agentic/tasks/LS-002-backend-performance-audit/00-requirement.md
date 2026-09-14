# LS-002 — Backend Performance Audit

## Task metadata

- Task Level: Level 2
- Status: INVESTIGATING
- Created: 2026-09-14
- Scope: Read-only backend/API/database performance investigation related to LS-001
- Parent task: [LS-001 Website Performance Audit](../LS-001-website-performance-audit/)
- Workflow reference: [docs/agentic/README.md](../../README.md)

## Request

Start a separate backend performance task after LS-001 Phase 1 frontend changes were committed and production dashboard Lighthouse evidence passed. Investigate backend/API/database performance candidates through safe source inspection and non-destructive measurements only.

## Objective

Determine which backend-side paths could contribute to dashboard or data-loading latency, with initial focus on:

- `GET /api/tenant/dashboard/summary`;
- `GET /api/tenants`;
- billing summary overlap with dashboard data;
- unbounded customer support message history;
- related indexes, eager loading, pagination, authorization, and tenant-connection behavior.

## In scope

- Laravel routes, middleware, controllers, services, models, relationships, query construction, and response shaping.
- Existing migrations and index coverage.
- Safe route/config/source inspection and read-only local measurements where available.
- Evidence-backed recommendations for a future implementation task.

## Explicitly out of scope

- Any application, backend, API, database, migration, route, configuration, cache, or infrastructure changes.
- Query rewrites, indexes, pagination contracts, caching, denormalization, or response-shape changes.
- Migrations, database resets, destructive commands, commits, pushes, or deployment.
- Authentication, billing, subscription, or tenant-isolation changes.
- New chatbot runtime, AI providers, RAG, automation, or metering.

## Acceptance criteria

- [ ] The investigation remains separate from LS-001.
- [ ] Findings distinguish FACT, INFERENCE, RECOMMENDATION, and REQUIRES APPROVAL.
- [ ] The dashboard summary, tenant list, billing overlap, support history, and relevant indexes are reviewed.
- [ ] Available safe measurements and unrun measurements are recorded accurately.
- [ ] No application or database files are modified.
- [ ] Any implementation recommendation is deferred to a separately approved task.

## Safety and approval constraints

Backend remains the trusted execution layer. Organization access must be checked before tenant-connection use, and billing ownership must remain with the authenticated user. No recommendation in this investigation authorizes a code change, migration, index, cache, pagination contract, or API compatibility change.

