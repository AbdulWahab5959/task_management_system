# Evidence

## Task

LS-004-task-creation-modal-unification, Level 2. Base commit `14f96e53ca8cc28ba8e35397d032236895d7bff6`.

## Delivered Changes

Backend:

- `ProjectSectionController::index` and `::serialize` and `ProjectController::show` now scope a section's `tasks_total` to tasks with a null `parent_task_id`, so the API value matches the count badge the project view renders.
- `tests/Feature/ProjectTaskTest.php` gains `test_section_task_total_counts_only_top_level_tasks`.

Frontend:

- `TaskDetailModal.tsx` owns the destination project as form state, loads sections for the effective project, derives the due-date ceiling from that project, renders a project selector while creating, surfaces server validation messages, and reports which mutation completed through `onSaved`.
- `ProjectSection.tsx` Add task opens the shared editor with its section id instead of posting an inline three-field form.
- `TaskQuickAdd.tsx` deleted; it had no remaining importer.
- `ProjectDetailPage.tsx` opens the editor for section and header creation, passes workspace project options, applies the shared task-permission helpers, and labels the member count "workspace members".
- `MyTasksPage.tsx` adds an Add task control and create-mode dialog, loads project options, passes the task's project deadline to the editor, passes `canEdit`/`canDelete` from the shared helpers, and confirms a creation.
- `ProjectsPage.tsx` uses the shared error helper instead of a local duplicate.
- New `utils/taskPermissions.ts` and `utils/apiError.ts` give all dashboard surfaces one permission rule and one error rule.

## Acceptance Criteria Coverage

| Criterion | Evidence |
|---|---|
| AC-1 | `ProjectSection.tsx:47` Add task button -> `openCreateTask(sectionId)`; `05-qa.md` manual item 1 outstanding |
| AC-2 | `ProjectDetailPage` header button -> `openCreateTask(null)`; manual item 2 outstanding |
| AC-3 | `MyTasksPage` header control plus `projects={projectOptions}`; editor project select at `TaskDetailModal.tsx:187` |
| AC-4 | `TaskDetailModal.tsx:192-193` use `activeProject.due_date`; backend rule covered by `test_task_due_date_cannot_exceed_project_due_date` |
| AC-5 | `TaskDetailModal` submit/delete catch blocks use `apiValidationMessage` |
| AC-6 | `utils/taskPermissions.ts` used by `ProjectDetailPage` and `MyTasksPage`; server middleware unchanged |
| AC-7 | `ProjectDetailPage` metadata renders "workspace members" |
| AC-8 | `test_section_task_total_counts_only_top_level_tasks` passed inside the 163-test suite |
| AC-9 | `git diff --name-only` shows no route, middleware, permission-config, service, or migration file |
| AC-10 | `05-qa.md`: 163 tests / 821 assertions, lint exit 0, build exit 0 |

## Verification Commands and Results

- `cd backend; php artisan test` -> exit 0, 163 passed (821 assertions). Baseline before the change: 162 passed (812 assertions).
- `cd backend; php artisan test --filter=ProjectTaskTest` -> exit 0, 10 passed (63 assertions).
- `cd frontend; npm.cmd run lint` -> exit 0, no problems.
- `cd frontend; npm.cmd run build` -> exit 0, built in 4.36s.
- `php -l` on the two changed controllers and the changed test -> no syntax errors.

## Diff Summary

9 tracked files changed, 132 insertions, 146 deletions, plus 2 new frontend utility files and this task's documentation directory.

## Remaining Risks

- Interactive browser behavior on both viewport sizes is unverified in this environment (`05-qa.md` manual list). QA is PARTIAL for that reason.
- `sections[].tasks_total` semantics changed. No in-repository consumer reads the field; a repository-external consumer, if one exists, is unverified.
- `pm-quick-add` CSS is now unreferenced but intentionally retained; a later cleanup task can remove it with its own review.
- Editing an existing task cannot move it between projects. This is a recorded non-goal, not an oversight.

## Outstanding Decision

RESOLVED 2026-09-18 (documentation-only amendment): `LS-003/02-spec.md` listed a `review` task status (and an `on_hold` project status) that the implementation never had. The developer directed that the discrepancy be resolved by amending the specification; Revision 1 of `LS-003/02-spec.md` now records the three-value enums (`todo`/`in_progress`/`done`, `active`/`completed`/`archived`) as the approved contract, with reintroduction requiring a new requirement artifact and enum migration. No code change was made or required.

## Rollback Readiness

Revert the 9 tracked file changes, delete `frontend/src/utils/taskPermissions.ts` and `frontend/src/utils/apiError.ts`, and restore `frontend/src/components/projects/TaskQuickAdd.tsx` from git history. No schema, migration, data, configuration, or environment change exists to unwind.

## Untouched

`backend/routes/api.php`, `backend/config/permissions.php`, `backend/app/Http/Middleware/*`, `backend/app/Services/TenantPermissionService.php`, all migrations, `backend/app/Http/Controllers/TaskController.php`, `frontend/src/components/projects/TaskRow.tsx`, `frontend/src/types/project.types.ts`, billing/Stripe/support/admin/organization files, and every LS-003 artifact.

## Recommendation

NOT READY while the authenticated-browser smoke tests in `05-qa.md` remain unrun. Automated verification is complete and passing.