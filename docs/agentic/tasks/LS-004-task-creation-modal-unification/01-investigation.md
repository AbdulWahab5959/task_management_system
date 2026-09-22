# Investigation

## Sources

- `00-requirement.md` (this task).
- Policy: root `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`, `docs/agentic/README.md`.
- Documentation: `docs/agentic/tasks/LS-003-project-management-saas/{00-requirement,02-spec,05-qa,NEXT-PROMPT}.md`, `backend/config/permissions.php`, `README.md` (API list).
- Backend: `app/Http/Controllers/{Task,Project,ProjectSection}Controller.php`, `app/Models/{Project,ProjectSection,Task}.php`, `app/Http/Middleware/RequireTenantPermission.php`, `app/Services/TenantPermissionService.php`, `routes/api.php`, `tests/Feature/ProjectTaskTest.php`, `database/migrations/tenant/*`.
- Frontend: `src/components/projects/*`, `src/pages/Dashboard/{ProjectDetailPage,MyTasksPage,ProjectsPage}.tsx`, `src/services/{task,project,project-section}.service.ts`, `src/types/project.types.ts`, `src/utils/dashboardAlert.ts`, `src/styles/project-management.css`.
- Commands actually run: `git status --short`, `git log -1`, `php artisan test` (baseline), and `Get-ChildItem`/`Select-String` inspections.

## Requirement Summary

Unify all task creation on the existing full task editor, add a create path with project choice on My Tasks, and correct five verified defects: the My Tasks due-date ceiling, the duplicated edit-permission rule plus missing delete capability on My Tasks, the section task-count semantics, the misleading "members" label on the project page, and the hidden server validation reason in the editor. Scope excludes schema, routes, authorization changes, and the deferred Todoist polish items.

## Repository State

- FACT: Branch `Project_Management_System`, base commit `14f96e53ca8cc28ba8e35397d032236895d7bff6` ("Add task quick add component and task row display", 2026-09-17).
- FACT: `git status --short` reported no tracked or staged changes and no untracked files before implementation. No pre-existing user work was present to preserve.
- FACT: Baseline `php artisan test` from `backend`: 162 passed, 812 assertions, 22.83s.

## Current Execution Flow

- FACT: The section add-task path is the inline `TaskQuickAdd` form, which posts directly to `POST /api/tenant/tasks` through `ProjectDetailPage.addTask` (lines 83-87).
- FACT: The full editor `TaskDetailModal` is mounted in exactly two places: `ProjectDetailPage.tsx:113` (header button at `:106`, task-row click at `:109`) and `MyTasksPage.tsx:87` (existing task only).
- FACT: `TaskDetailModal.submit` always sends `project_id: project.id` from the `project` prop (`:101-118`); the project is never form state.
- FACT: Sections load through `projectSectionService.list(project.id)` in an effect keyed on `[initialSections, project.id]` (`:70-74`), so section options are always scoped to the fixed project prop.
- FACT: The due-date ceiling is `max={project.due_date || undefined}` (`:183`), i.e. whatever the caller passed as the `project` prop.

## Current Architecture

- FACT: Tenant isolation is enforced by tenant-scoped Eloquent models (`UsesTenantConnection`), tenant resolution middleware, and per-route permission middleware (`routes/api.php:102-111`).
- FACT: All project/task/section routes already carry `permission:projects.view|projects.update|tasks.view|tasks.create|tasks.update|tasks.delete`. No route change is needed for any acceptance criterion.
- FACT: Authorization keys exist in `backend/config/permissions.php`: the admin role has `tasks.create/update/delete`; the member role has `tasks.create` and `tasks.update` but not `tasks.delete`; the owner resolves to all permissions in `TenantPermissionService::userCan`.
- FACT: `TenantPermissionService::permissionsFor` is the source of the frontend `activeTenant.permissions` array, so that payload is an accurate capability list rather than a raw role guess.

## Root Cause / Functional Gap

- FACT (defect 1, due-date ceiling): `MyTasksPage.tsx:87` passes `project={{ ..., due_date: null }}`, so `TaskDetailModal` renders a due-date input with no `max`. `TaskController::assertTaskDueDate` (lines 153-160) rejects a task due date later than the project deadline, so the rejection surfaces only after submission. `ProjectDetailPage.tsx:113` passes the real deadline, so the two pages disagree.
- FACT (defect 2, duplicated permission rule and missing delete): `ProjectDetailPage.tsx:27-29` computes create/update/delete from role plus `projects.update`, `tasks.create`, `tasks.delete`, with the per-task relationship rule at `:60`. `MyTasksPage.tsx:87` instead hardcodes `canEdit` and passes no `canDelete`, so no user can delete a task from My Tasks even when they hold `tasks.delete`.
- FACT (defect 3, section count): `ProjectSection.tsx:45` renders the badge from the `tasks` prop, which `ProjectDetailPage.roots` filters to `parent_task_id === null`. `ProjectSectionController::index`/`serialize` and `ProjectController::show` populate `tasks_total` from `withCount('tasks')`, which includes subtasks. The API field and the badge therefore disagree.
- FACT (defect 4, member label): `ProjectDetailPage.tsx:57` loads `tenantMembersService.list()` (all organization members) and `:106` renders `{members.length} members`. `Project` has no members relation (`app/Models/Project.php:27-40`), so the number is organization headcount.
- FACT (defect 5, hidden validation reason): the `TaskDetailModal.submit` and `deleteTask` catch blocks set fixed strings (`:117`, `:149`), discarding `error.response.data.errors`, unlike `ProjectsPage.apiError` (`:18-24`).
- INFERENCE: Because `TaskDetailModal` owns `project.id` as a prop and loads sections from it, adding a project selector requires promoting the project to form state and re-keying the section effect; there is no shortcut.
- FACT (documentation conflict, not a code defect): `LS-003/02-spec.md:21` lists task statuses `todo, in_progress, review, done`, while `TaskController::STATUSES` (line 17) and `types/project.types.ts:2` implement three statuses. No test or code references `review`.
- FACT (blueprint claim verification): the blueprint statements that My Tasks already has a project selector and Add task button, that section Add task already opens the full modal, and that the modal can select a project are all false against this revision.

## Affected Files

- `frontend/src/components/projects/TaskDetailModal.tsx` - project selection for creation, project-keyed sections, project-keyed due-date ceiling, error surfacing.
- `frontend/src/components/projects/ProjectSection.tsx` - section Add task opens the editor.
- `frontend/src/components/projects/TaskQuickAdd.tsx` - becomes dead code; removal candidate.
- `frontend/src/pages/Dashboard/ProjectDetailPage.tsx` - dialog-based creation, shared permission helper, member label.
- `frontend/src/pages/Dashboard/MyTasksPage.tsx` - create path, project options, due date, delete, feedback.
- New: `frontend/src/utils/taskPermissions.ts`, `frontend/src/utils/apiError.ts`.
- `backend/app/Http/Controllers/ProjectSectionController.php`, `backend/app/Http/Controllers/ProjectController.php` - section `tasks_total` scope.
- `backend/tests/Feature/ProjectTaskTest.php` - section count coverage.

## Affected Components

- FACT: `TaskQuickAdd` is imported only by `ProjectSection.tsx:4`; its exported `QuickTaskInput` type is imported by `ProjectDetailPage.tsx:8`. Removing the component requires removing both references.
- FACT: `TaskRow` is shared by `ProjectDetailPage` and `MyTasksPage`; this task does not change it, so both pages keep identical row behavior.
- FACT: `ProjectSection` is rendered from `ProjectDetailPage.tsx:109` for real sections and once for the "Unsorted work" pseudo-section with `section={null}`, so the add-task handler must tolerate a null section.
- FACT: `ProjectsPage.apiError` already implements the exact validation-message extraction needed for defect 5, so the new helper should match that shape instead of inventing a format.
## Database Findings

- FACT: Tenant-local migrations present: settings, projects, tasks, files, project/task management fields, task assignees, project sections, and task workflow fields. No labels, comments, activity, reminders, or recurrence tables exist.
- FACT: This task requires no schema change, no migration, and no data backfill. Section counts are derived at query time.
- FACT: Tests use per-test SQLite tenant databases created by `ProjectTaskTest::createTenant` with `Artisan::call('migrate', ...)` and cleaned up in `tearDown`. No destructive command is needed.

## API Findings

- FACT: Routes in scope are unchanged: `GET|POST /api/tenant/projects`, `GET|PUT|DELETE /api/tenant/projects/{project}`, `GET|POST /api/tenant/projects/{project}/sections`, `PUT /api/tenant/projects/{project}/sections/{section}`, `PUT .../sections/{section}/move`, `DELETE .../sections/{section}`, `GET|POST /api/tenant/tasks`, `GET|PUT|DELETE /api/tenant/tasks/{task}`.
- FACT: Section responses include `tasks_total` from `ProjectSectionController::serialize` and from the inline mapping in `ProjectController::show`. Changing its meaning is the only contract change in this task.
- FACT: No frontend service or component reads a section's `tasks_total`; `types/project.types.ts:12` declares it but `ProjectSection.tsx` uses the `tasks` prop.
- FACT: `POST /api/tenant/tasks` already accepts `project_id`, `section_id`, `parent_task_id`, `assignee_ids`, `status`, `priority`, `start_date`, and `due_date`, so a project selector for creation needs no API change.

## Authentication / Authorization Findings

- FACT: `RequireTenantPermission` delegates to `TenantPermissionService::authorize`, which resolves `tenant_users` membership, then direct `tenant_user_permissions` grants, then role defaults, and returns false for unknown keys, missing tenants, or inactive tenants.
- FACT: `TaskController::assertMemberCanEdit` (lines 208-214) restricts members to tasks they are assigned to or created; owners/admins bypass it.
- FACT: `TaskController::assertAssignees` (lines 195-206) blocks members from assigning anyone but themselves and blocks cross-tenant or inactive assignees.
- FACT: Task list scoping is server-owned: members always receive only tasks assigned to them (`TaskController::index`, lines 29-33), regardless of the `mine` parameter.
- FACT: The frontend rule implied by the backend is therefore: update requires `tasks.update` plus (non-member role, or assignee/creator); delete requires `tasks.delete` plus the same membership rule. `MyTasksPage` currently deviates from this on delete.
- INFERENCE: Sending `project_id` from a create form does not weaken authorization, because `TaskController::store` resolves the project through the tenant-scoped model and validates section/parent/dates against it.

## Frontend Findings

- FACT: `TaskDetailModal` state is `TaskFormState` (title, description, section_id, assignee_ids, status, priority, start_date, due_date) with no `project_id`.
- FACT: The effective project is derived twice in the component: `project.id` for the payload and `project.due_date` for the ceiling, both from the prop.
- FACT: The section select, assignee multi-select, status, priority, and date inputs are already complete and disabled by `canEdit`.
- FACT: `MyTasksPage` holds `selectedTask` only; there is no create-mode state and no project list. It does load `members` for the assignee select.
- FACT: `ProjectDetailPage` already loads all projects (`:56`) for its sidebar, so project options for the editor are available without a new request.
- FACT: `showDashboardSuccess`/`showDashboardError` from `src/utils/dashboardAlert.ts` are the established feedback mechanism and are already used by `ProjectsPage`.
- FACT: Existing CSS provides `pm-add-task-link`, `pm-task-dialog__meta`, `pm-task-dialog__crumb`, and `pm-quick-add`. Removing `TaskQuickAdd` leaves the `pm-quick-add` rules unused; leaving those declarations in place is a smaller, safer change than pruning shared stylesheet rules.

## Backend Findings

- FACT: `TaskController` is the single task write path and already validates section membership, parent-task membership, start/due ordering, the project deadline ceiling, and assignee eligibility, inside a tenant-connection transaction for creation.
- FACT: `ProjectSectionController::serialize` computes `tasks_total` as `$section->tasks_count ?? $section->tasks()->count()`, so a constrained `withCount` alias is sufficient to change the scope without touching call sites.
- FACT: `ProjectController::show` inlines its own section mapping with `withCount('tasks')`, so the same scope change must be applied in both places to keep the two section payloads consistent.

## Security Findings

- FACT: No security regression is introduced: no route, middleware, permission key, validation rule, or tenant-resolution change is planned. The section count change is a read-only aggregation.
- FACT: The new frontend permission helper only controls visibility; the server still authorizes every mutation, so a stale or tampered client payload cannot grant access.
- INFERENCE: Surfacing server validation messages improves honesty but must not expose internals; the helper reads only `errors.*` and `message`, both already returned to the client by Laravel validation responses.

## Performance Findings

- FACT: No measurement was taken. The section-count change replaces an unconstrained `withCount` with a constrained one, which is the same single aggregate query.
- FACT: `MyTasksPage` gains one `GET /api/tenant/projects` request for project options, matching what `ProjectDetailPage` already does on mount.
- INFERENCE: The due-date lookup on My Tasks reuses that same project list, so no per-task request is added.
## Existing Tests

- FACT: `backend/tests/Feature/ProjectTaskTest.php` (inspected, then executed as part of the suite) covers owner project creation, member read access, past-date rejection, project-deadline enforcement, multi-assignee behavior, section create/rename/move order, subtask creation and serialization, empty-section delete protection, and cross-project section rejection.
- FACT: No existing test asserts a section's `tasks_total`, so the new assertion is additive and does not contradict an existing expectation.
- FACT: `ProjectTaskTest` has 9 tests per the LS-003 QA record; the suite total measured here is 162 tests / 812 assertions.

## Risks

- INFERENCE: Replacing the inline form raises the interaction cost of a title-only task from one form to one dialog. The dialog autofocuses the title and pre-selects the section, so the added cost is a single submit action; this is the blueprint's explicit request.
- INFERENCE: Changing `tasks_total` semantics could affect an out-of-repository consumer (for example a future mobile client). No in-repository consumer exists, and the change is recorded in `02-spec.md` for traceability.
- FACT: Removing `TaskQuickAdd.tsx` is reversible through git history.

## Recommendations

- RECOMMENDATION: Promote `project_id` to `TaskFormState` in `TaskDetailModal`, keep the project read-only when editing an existing task, and re-key the section effect and due-date ceiling on it. Scope: one component plus its two call sites.
- RECOMMENDATION: Add `frontend/src/utils/taskPermissions.ts` mirroring `TenantPermissionService` semantics and use it in both dashboard pages, replacing the duplicated inline rules.
- RECOMMENDATION: Add `frontend/src/utils/apiError.ts`, extracting the validation-message shape already implemented in `ProjectsPage`, and use it in `TaskDetailModal`, `MyTasksPage`, and `ProjectsPage`.
- RECOMMENDATION: Scope section `tasks_total` to top-level tasks in both controllers, and add one `ProjectTaskTest` assertion proving a subtask does not inflate it.
- RECOMMENDATION: Relabel the project header count to "workspace members".

## Alternatives Considered

- Keeping `TaskQuickAdd` as a secondary fast-capture path: rejected because the requirement is one editor everywhere; the component is deleted rather than left unreferenced.
- Making the project editable when editing an existing task: rejected for this task because moving a task across projects while preserving section and subtask relationships needs its own validation design; kept as a documented non-goal.
- Changing only the frontend badge instead of the API field for defect 3: rejected because it leaves the API reporting a number no surface can rely on.
- Removing the unused `pm-quick-add` CSS: rejected as unrelated cleanup that enlarges the diff without changing behavior.
- Adding a dedicated project-summary endpoint for the My Tasks due date: rejected as unnecessary; the existing project list already carries `due_date`.

## Requires Human Decision

- REQUIRES APPROVAL: whether the `review` task status in `LS-003/02-spec.md` should be removed from that document or added to the implementation. No work in this task depends on the answer, and no LS-003 artifact was modified. Owner: developer.

## Unknown / Unverified Items

- UNVERIFIED: interactive browser behavior (dialog focus order, mobile layout at dashboard breakpoints, SweetAlert2 confirmation) requires an authenticated session against a migrated tenant database. Not available in this environment; recorded as a manual QA item in `03-plan.md` and `05-qa.md`.
- UNVERIFIED: whether any consumer outside this repository reads `projects/{id}.sections[].tasks_total`. The repository contains no such consumer.

## Confidence

8/10. Every defect and every blueprint claim in scope was verified directly against the file and line referenced, the baseline suite was executed, and the authorization model was traced from route middleware through the permission service. The reduction is for the two unverified items: no browser session for interaction-level manual QA, and no repository-external consumer audit.