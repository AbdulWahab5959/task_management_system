# LS-003 - Implementation Plan

## Sources

- [00-requirement.md](00-requirement.md)
- [01-investigation.md](01-investigation.md)
- [02-spec.md](02-spec.md)
- Root, backend, and frontend `AGENTS.md`
- Existing routes, middleware, models, migrations, services, controllers, frontend shell, and current worktree status

## Task risk level

Level 3. The plan affects tenant isolation, authorization, billing entitlements, reversible schema changes, and authenticated resource APIs.

## Plan revision

LS-003-P1, 2026-09-15. Approved for implementation by the developer.

## Approved amendment

LS-003-P2, 2026-09-15. Developer-approved multi-member task assignment scope. Preserve `tasks.assigned_to` as a compatibility field while adding a tenant-local `task_assignees` assignment relation as the source of truth for new multi-assignee behavior.

## Implementation decisions recorded

- Preserve the existing separate tenant-database architecture; project and task records remain tenant-local and do not gain central `tenant_id` columns.
- Preserve existing project and task status values for compatibility; add only project dates and task completion timestamps/indexes.
- Use archive-first project deletion; a second delete of an archived project permanently removes it from the active tenant database.
- Keep project/task APIs under authenticated tenant identification and existing permission middleware. No new billing or entitlement gate is introduced in this slice.

## Implementation sequence after approval

1. Resolve open decisions and document approved API/authorization behavior.
2. Fix and test existing tenant permanent-delete authorization gap.
3. Add/extend permission registry and server-side project/task authorization.
4. Extend tenant-local migrations and models with only approved missing fields, indexes, relationships, and reversible down paths.
5. Implement validated project/task services/controllers/routes with tenant scoping, assignment membership checks, pagination, and controlled errors.
6. Implement efficient tenant dashboard aggregation and project/task API types/services.
7. Build Projects, Project Details, My Tasks, and dashboard sections using existing React components and loading/empty/error patterns.
8. Update authenticated navigation while keeping platform administration separate and unfinished chatbot capabilities out of the primary product path.
9. Add focused backend security/business tests and frontend checks; extend demo seeders only for development-safe data.
10. Update README/deployment notes and complete review, QA, and evidence artifacts from the actual diff and command output.

## Planned verification

- `cd backend; php artisan test`
- Targeted tenant/project/task/team/billing tests before the full suite.
- `cd frontend; npm.cmd run lint; npm.cmd run build`
- Manual checks for tenant switching, cross-tenant IDOR, role boundaries, assignment validation, pagination, loading/error/empty states, and Stripe regression paths.
- Read-only route/config/schema review for deployment readiness; no real Stripe transactions.

## Rollback

Revert only implementation files and use reversible migrations. Preserve existing user and tenant data. Do not reset databases, drop tenant databases, or use destructive Git commands.

## Approval gate

Approval Required: YES

Approval Status: APPROVED

Approved By: Developer

Approval Date: 2026-09-15

Approval Source: Developer message: "I approve LS-003-P1 in `03-plan.md` for implementation."

Amendment Approval Status: APPROVED

Amendment Approved By: Developer

Amendment Approval Date: 2026-09-15

Amendment Approval Source: Developer message: "I approve the multi-member task assignment scope and preserving `tasks.assigned_to` as a compatibility field."
