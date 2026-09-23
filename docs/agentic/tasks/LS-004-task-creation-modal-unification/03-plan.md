# Implementation Plan

## Sources

- `00-requirement.md`, `01-investigation.md`, `02-spec.md`.
- Root `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`.
- Developer decision recorded in `00-requirement.md`: the defect + universal-modal bundle as one Level 2 task.

A specification is present because this task changes an existing response value (`sections[].tasks_total`) and clarifies client-side capability behavior.

Plan revision: LS-004-P1, 2026-09-18.

## Task Risk Level

Level 2. No authentication, authorization, tenant, billing, migration, or destructive change. The one backend change is a read-only aggregation scope. The workflow guide's Level 2 flow applies and no automatic plan-approval gate blocks this authorized work.

## Summary

Make the full task editor the only task-creation entry point, add a create path with project selection on My Tasks, and correct the five verified defects. Expected outcome: identical task behavior from every surface, a due-date ceiling the server will accept, permission controls that match the server's rule, a member count that states what it measures, and a section total that matches its badge.

## Files To Modify

- `frontend/src/components/projects/TaskDetailModal.tsx` - add `project_id` form state, optional `projects` prop, project-keyed section effect and due-date ceiling, project selector in create mode, validation-message surfacing.
- `frontend/src/components/projects/ProjectSection.tsx` - Add task opens the editor with the section id; import `Plus`.
- `frontend/src/pages/Dashboard/ProjectDetailPage.tsx` - remove the inline quick-add path and `QuickTaskInput`, open the dialog for section creation, pass project options, use the shared permission helper, relabel the member count.
- `frontend/src/pages/Dashboard/MyTasksPage.tsx` - add create-mode state and an Add task control, load project options, pass the correct project due date, pass `canEdit`/`canDelete` from the shared helper, add success feedback.
- `frontend/src/pages/Dashboard/ProjectsPage.tsx` - use the shared error helper for its existing fallback message.
- `backend/app/Http/Controllers/ProjectSectionController.php` - scope the section task count to top-level tasks.
- `backend/app/Http/Controllers/ProjectController.php` - apply the same scope in the project detail section mapping.
- `backend/tests/Feature/ProjectTaskTest.php` - assert the section count excludes subtasks.

## Files To Create

- `frontend/src/utils/taskPermissions.ts` - tenant capability helpers mirroring `TenantPermissionService`.
- `frontend/src/utils/apiError.ts` - validation-message extraction shared by the task editor, My Tasks, and Projects.
- `docs/agentic/tasks/LS-004-task-creation-modal-unification/04-review.md`, `05-qa.md`, `06-evidence.md`, `NEXT-PROMPT.md` - required artifacts, created after implementation with actual results.

## Files Explicitly Not To Modify

- `backend/routes/api.php`, `backend/config/permissions.php`, `backend/app/Http/Middleware/*`, `backend/app/Services/TenantPermissionService.php` - the authorization surface stays byte-identical.
- `backend/database/migrations/*` - no schema change.
- `backend/app/Http/Controllers/TaskController.php` - the write path and validation are already correct.
- `frontend/src/components/projects/TaskRow.tsx` - row polish is a deferred follow-up task.
- `frontend/src/types/project.types.ts` - no contract shape change.
- Any `LS-003` artifact.
- Billing, Stripe, support, admin, and organization files.
## Implementation Steps

### Step 1

Create `frontend/src/utils/taskPermissions.ts` with `tenantCan`, `canCreateTask`, `canUpdateTask`, and `canDeleteTask`, mirroring `TenantPermissionService::userCan` (owner and admin satisfy every registry key; member-role users need the relationship condition for update and delete). Create `frontend/src/utils/apiError.ts` exporting the validated-message extraction plus the existing schema-mismatch fallback text. Expected outcome: one permission rule and one error rule for all three surfaces.

### Step 2

Update `TaskDetailModal`: add `project_id` to `TaskFormState` and seed it from `task?.project_id ?? project.id`; add the optional `projects` prop; derive the effective project; key the section effect and the due-date `max` on the effective project, using the caller's sections as fallback only for the matching project; reset `section_id` on project change; render the project select in create mode; send `form.project_id` in the payload; use the shared error helper in the submit and delete handlers. Expected outcome: one editor that can create into any supplied project.

### Step 3

Update `ProjectSection` to replace the inline form with an Add task button reporting the section id, and delete `frontend/src/components/projects/TaskQuickAdd.tsx`. Update `ProjectDetailPage` accordingly: drop `QuickTaskInput` and the inline `addTask` writer, open the dialog for section creation, pass `projects` options, apply the shared permission helper, and relabel the member count. Expected outcome: section and header creation both use the editor.

### Step 4

Update `MyTasksPage`: add create-mode dialog state and an Add task control, load project options once per tenant, resolve the edited task's project due date, pass `canEdit`/`canDelete` from the helper, and show dashboard success feedback after a create. Expected outcome: My Tasks can create into a chosen project and delete where permitted.

### Step 5

Scope the section count in `ProjectSectionController::index`/`serialize` and `ProjectController::show` to tasks with a null `parent_task_id`, and add the regression assertion to `ProjectTaskTest`. Expected outcome: AC-8 verified by test.

### Step 6

Run `cd backend; php artisan test`, `cd frontend; npm.cmd run lint`, and `cd frontend; npm.cmd run build`; inspect `git diff` for forbidden file changes; record actual results in `05-qa.md` and evidence in `06-evidence.md`.

## Database Changes

None.

## API Changes

None in routes, methods, payloads, or status codes. `sections[].tasks_total` changes scope as recorded in `02-spec.md` and `01-investigation.md`. No in-repository consumer.

## Frontend Changes

Detailed in steps 1-4. All new controls use existing CSS classes (`pm-add-task-link`, `pm-button`, `dashboard-control`, `pm-task-dialog__meta`). Loading, empty, and error states remain the existing ones.

## Backend Changes

Two constrained `withCount`/count expressions. No controller logic, validation, or transaction change.

## Security Considerations

- No authorization change; the helper is display-only and the server keeps enforcing every rule.
- `project_id` from the client is a resource identifier resolved through the tenant-scoped model, exactly as `TaskController` already does; it is never treated as an authorization principal.
- The error helper reads only Laravel `errors`/`message` fields already sent to the client; no path, SQL, or stack trace is rendered.

## Performance Considerations

One additional project-list request on My Tasks and a constrained aggregate per section query. No measurement was taken and none is claimed.

## Testing Plan

- `cd backend; php artisan test` - full suite including the new section-count assertion.
- `cd frontend; npm.cmd run lint` - ESLint over the changed files.
- `cd frontend; npm.cmd run build` - TypeScript and Vite production build.
- `git diff --stat` and targeted `git diff` inspection for AC-9.

## Manual Verification

Requires an authenticated session against a migrated tenant database, which this environment does not provide. Scenarios to run before release:

1. Owner: create a project with sections, select Add task in a section, confirm the editor opens with that section selected, create, and confirm the row appears in that section with updated progress.
2. Owner: select Add task in the project header and confirm no section is pre-selected and the task lands under Unsorted work.
3. Member: confirm the editor opens for an assigned task, that Delete task is absent, and that another member's task cannot be reached.
4. Owner and admin: confirm Delete task appears and works from both My Tasks and the project page.
5. My Tasks: create a task after choosing a project and confirm the success confirmation and the list refresh.
6. Bounded project: attempt a due date beyond the project deadline and confirm the input prevents it on both pages.
7. Force a server rejection (for example a section from another project) and confirm the specific validation text is shown.
8. Desktop and mobile widths: confirm the dialog layout, focus order, and Escape handling.
## Rollback Strategy

Revert the task's file changes. No data, schema, or migration exists to unwind, and no configuration or environment file is touched. Deleting `frontend/src/utils/taskPermissions.ts` and `frontend/src/utils/apiError.ts` and restoring `TaskQuickAdd.tsx` from git history fully restores the previous behavior if the branch is reverted without a commit.

## Known Risks

- Interactive dialog behavior is unverified in this environment; recorded as a manual QA item rather than claimed as passing.
- The deferred `review` status decision does not affect this task.
- Reviewers may expect the project to be editable in edit mode; recorded as a non-goal with rationale.

## Approval Required

Approval Required: NO

Level 2 work explicitly authorized by the developer's recorded selection. No outstanding decision blocks implementation.

## Approval Status

Approval Status: PENDING

Unused approval field: `Approval Required: NO`, so no gate applies. This does not imply approval of anything beyond the authorized scope.

## Approved By

Not applicable. Level 2 work inside the developer's recorded request; the developer is the authority for the recorded selection in `00-requirement.md`.

## Approval Notes

Recorded decision, 2026-09-18: the developer selected "Fix the defects and the universal-modal slice together as one Level 2 task, then the polish items". Material plan changes require a dated new revision and a renewed decision.