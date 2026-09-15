# NEXT PROMPT

## Current Task

LS-003 Project Management SaaS Transformation

## Current Status

LS-003-P1 and approved LS-003-P2 are implemented. Multi-member assignment is no longer paused at the approval gate.

Completed implementation:

- Tenant-local Projects and Tasks APIs, models, migration, permissions, and routes.
- Project progress, dates, task priorities/statuses, pagination, search, filters, and same-tenant assignment checks.
- Dashboard project/task metrics and recent/upcoming task summaries.
- Projects, Project Details, and My Tasks frontend pages and navigation.
- Professional loader usage for the dashboard product screens.
- `tenant.identify` middleware added to permanent tenant deletion.
- Focused security/business tests and required documentation artifacts.
- Members now see view-only project access instead of a project creation button.
- New project start and due dates are restricted to today or later; due date must be on/after the start date.
- SweetAlert2 success/error popups were added for project creation, including a clear tenant-migration message for schema errors.
- Project edits, task creation, and task status changes now reload the authoritative project response so status, progress, and task counters update immediately without a full-page reload.
- Task due dates cannot be later than the parent project due date; the backend validates this and the task form applies the project deadline as its maximum.
- Owners/admins see all workspace tasks; members see tasks assigned to them. The task screen includes search, status, and priority filters.
- Member-only screens no longer show project edit/archive controls.
- Mutation refreshes keep the current screen visible and show the professional table loader inline; SweetAlert appears only after the refreshed resource is returned.
- Replaced the generic full-screen loader with a branded LaunchStack loading surface: dark workspace canvas, subtle grid and ambient depth, layered sync panel, orbital rocket mark, live indeterminate progress rail, secure-workspace signal, and reduced-motion support.
- Refined table loading states with a compact data-sync header, accessible status announcements, staggered skeleton widths, and responsive behavior. Removed the old Suspense `bg-slate-50` override that flattened the full-screen loader into a gray panel.
- Fixed the member task-feed boundary at the API layer. Members are now forced to receive only tasks assigned to their authenticated user, including multi-assignee pivot records; owners/admins retain the workspace task view.
- Added a regression test proving a member cannot see another member's task in the task feed.
- Reworked the My Tasks/workspace task page into a distinct command-center layout with personal/workspace context, open/active/done counts, clearer assignment metadata, status icons, responsive filters, and stronger task-row hierarchy.
- New request: add complete task CRUD and allow one task to be assigned to multiple active tenant members/admins.
- Added tenant-local `task_assignees` pivot storage. `tasks.assigned_to` remains synchronized to the first assignee for compatibility.
- Added validated multi-assignee API input/output, task edit/delete controls, member/admin assignment dropdown, and assignee display in project/workspace task views.

Verification:

- `php artisan test`: 160 passed, 787 assertions.
- `php artisan test --filter=ProjectTaskTest`: 7 passed, 29 assertions.
- Follow-up frontend lint and production build: passed.
- Latest frontend verification: lint passed and production build passed after SPA task/project refresh changes.
- `npm.cmd install sweetalert2`: completed; npm reported 9 dependency audit findings (3 moderate, 6 high) in the existing dependency tree and no `npm audit fix` was run.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- Loader redesign verification: `npm.cmd run lint` passed and `npm.cmd run build` passed after the new screen/table loader implementation.
- Latest focused backend verification: `php artisan test --filter=ProjectTaskTest` passed, 8 tests and 34 assertions.
- Latest task-feed and UI verification: `npm.cmd run lint` passed and `npm.cmd run build` passed after the member visibility fix and task command-center redesign.
- Changed PHP syntax and tenant route middleware checks: passed.

## Approval Record

LS-003-P2 was approved by the developer on 2026-09-15 with the decision to preserve `tasks.assigned_to` as the compatibility field and use tenant-local `task_assignees` as the source of truth for multi-member assignment. No further implementation approval is pending for this scope.

## Remaining Work

Manual browser and responsive QA is still required. Reload/restart the frontend dev server after the latest build, then verify that a member sees only their assigned tasks, owners/admins see the workspace task view, multi-assignee assignment remains correct, task CRUD/status refreshes work, popup success/error states, tenant switching, responsive layouts, and visual loading/empty/error states in a local environment.

## Database Migration Command

This task changed existing tenant-local `projects` and `tasks` tables and added the tenant-local `task_assignees` table; no central table was added. New tenants receive these migrations automatically during provisioning. For an already configured tenant connection, from the `backend` directory run:

```text
php artisan migrate --database=tenant --path=database/migrations/tenant --force
```

The `tenant` connection must point at the intended tenant database before running this command. For multiple existing tenants, run the same migration once per tenant through the existing `TenantService::ensureProvisioned()` workflow or an approved tenant-migration script. Do not use `migrate:fresh` or `db:wipe`. The migrations are `backend/database/migrations/tenant/2026_09_15_000001_add_project_task_management_fields.php` and `backend/database/migrations/tenant/2026_09_15_000002_create_task_assignees_table.php`.

## Static Table Usage Review

A repository-wide static scan found active application references for the core tenant, billing, auth, support, team, project, and task tables. `usage_records` currently has zero references outside migrations and is the clearest review candidate for a future cleanup decision. `cache_locks` is framework-managed and had no direct application reference. No table was deleted because runtime/configuration usage and production data require an explicit review first.

Static column review did not identify a safe column deletion. Columns can be used through ORM conventions, validation, serialization, framework jobs, webhooks, or deployment data not visible from simple string references. Remove or rename columns only through a separate approved schema audit with production-safe evidence.

## Ready-To-Copy Codex Prompt

```text
Resume LS-003 for post-implementation manual QA only.

Read:

- AGENTS.md
- backend/AGENTS.md
- frontend/AGENTS.md
- docs/agentic/README.md
- docs/agentic/tasks/LS-003-project-management-saas/00-requirement.md
- docs/agentic/tasks/LS-003-project-management-saas/01-investigation.md
- docs/agentic/tasks/LS-003-project-management-saas/02-spec.md
- docs/agentic/tasks/LS-003-project-management-saas/03-plan.md
- docs/agentic/tasks/LS-003-project-management-saas/NEXT-PROMPT.md
- docs/agentic/tasks/LS-003-project-management-saas/04-review.md
- docs/agentic/tasks/LS-003-project-management-saas/05-qa.md
- docs/agentic/tasks/LS-003-project-management-saas/06-evidence.md

The approved LS-003-P1 implementation and LS-003-P2 multi-member assignment amendment are complete. The latest follow-up fixed server-side member task-feed filtering in `backend/app/Http/Controllers/TaskController.php` and redesigned `frontend/src/pages/Dashboard/MyTasksPage.tsx` as a command-center task queue. The branded screen/table loader remains in `frontend/src/components/common/ProfessionalLoader.tsx` and `frontend/src/index.css`, with the old gray Suspense override removed from `frontend/src/App.tsx`. Inspect current git status and diff, preserve unrelated work, and perform only safe manual QA or narrowly scoped fixes within P1/P2. Verify tenant isolation, role boundaries, member-only task visibility, multi-assignee CRUD, assignment validation, dashboard queries, loading states, and responsive layouts. In particular, visually verify the full-screen loader on session/page transitions and the table loader during resource refreshes at desktop and mobile widths. Confirm the loading canvas remains visually coherent when rendered inside an existing dark wrapper or as a standalone route fallback.

If a code fix is necessary, keep it narrowly within approved LS-003-P1/P2 and rerun the relevant checks: `cd backend; php artisan test`, `cd frontend; npm.cmd run lint`, and `cd frontend; npm.cmd run build`. Update 05-qa.md and 06-evidence.md with actual results. Do not run destructive migrations, migrate:fresh, db:wipe, database deletion, real billing transactions, commit, push, or deployment. Stop and request renewed approval for any material security, tenant, billing, schema, API, or scope change beyond P1/P2.
```

## Handoff Notes

The implementation handoff remains in `NEXT-PROMPT.md` only, as requested. Treat `03-plan.md` as the approved architecture record and `04-review.md`, `05-qa.md`, and `06-evidence.md` as the implementation evidence. Update this file after every follow-up prompt with the latest status, commands, findings, and remaining work.
