# Investigation

## Current behavior

- `frontend/src/components/projects/TaskRow.tsx` renders: check button, one big content button (title + context), and a meta column (priority badge, due date, status label). No rename, no delete, no avatars, no overdue state.
- Renaming is only possible through `TaskDetailModal` (full editor).
- Deleting is only possible through `TaskDetailModal` (`canDelete` prop, owner/admin per `taskPermissions.ts`).
- `ProjectSection.tsx` header badge shows `tasks.length` (client group), ignoring the backend `tasks_total` that LS-003/LS-004 scoped to top-level tasks.
- No overdue styling exists anywhere in `project-management.css`; overdue detection currently only exists in `MyTasksPage` group filtering (`task.due_date < date && status !== 'done'`).
- Assignees appear as joined text in the row context line (project view only).

## Backend contract (verified, unchanged)

- `TaskController::validated` allows `title` as `sometimes` on update, so a title-only `PUT /tenant/tasks/{id}` is valid.
- `TaskController::assertMemberCanEdit` restricts member-role users to tasks they created or are assigned to; `tasks.update` / `tasks.delete` route permissions unchanged. `TaskController.php` and all routes/middleware/config/migrations stay untouched in this task.
- `section.tasks_total` is already top-level-only after LS-004 (`ProjectSectionController::serialize`, covered by `test_section_task_total_counts_only_top_level_tasks`).

## Frontend patterns to follow

- Shared capability helpers in `frontend/src/utils/taskPermissions.ts` (`canUpdateTask`, `canDeleteTask`, `tenantCan`).
- Shared error helper `frontend/src/utils/apiError.ts` (`apiValidationMessage`).
- Services: `taskService.update(id, data)` / `taskService.remove(id)` already exist.
- Existing CSS conventions: `pm-task-row*` classes, hover styles behind `@media (hover: hover)`, focus-visible outline list at line 81, responsive meta collapse at lines 233-235.
- Reflow pattern: `queueMicrotask` wrapper for effects that call loaders.

## Constraints

- TaskRow is used by `ProjectDetailPage` (via `ProjectSection`) and `MyTasksPage`; both must wire the new callbacks without changing modal behavior.
- Inline rename must not swallow the row's click-to-open behavior: the title stays a button unless editing.
