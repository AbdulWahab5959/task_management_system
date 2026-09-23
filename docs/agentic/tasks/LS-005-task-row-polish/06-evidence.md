# Evidence — LS-005-task-row-polish

## Delivered changes (frontend only)

- New `frontend/src/utils/taskDisplay.ts`: `formatShortDate`, `taskStatusLabel`, `todayDateString`, `isTaskOverdue`, `initials`.
- `TaskRow.tsx`: overdue class + visible "Overdue" chip; initials avatar stack (max 3 + `+N`); inline title editor (Enter saves, Escape/Cancel reverts, empty/unchanged skips the request); rename (pencil) and confirm-guarded delete (trash) icon actions gated by `canUpdate` / `canDelete` + handler presence; check disabled while editing.
- `ProjectSection.tsx`: forwards `canDeleteTasks` / `onSaveTaskTitle` / `onDeleteTask` to rows; header badge uses `section.tasks_total` when a section exists.
- `ProjectDetailPage.tsx`: `renameTask` / `deleteTask` handlers (`taskService.update({ title })` / `taskService.remove`, then `loadProject(false)`), errors via `apiValidationMessage`; both section usages receive the new props.
- `MyTasksPage.tsx`: same two handlers with `load()` refresh; rows receive `canUpdate={taskUpdatable(task)}`, rename, and delete props.
- `project-management.css`: overdue styling + chip, avatar stack, hover-reveal action cluster (pointer devices; always visible on touch), inline editor layout, extended focus-visible list.

## Acceptance criteria evidence

| Criterion | Evidence |
|---|---|
| AC-1 | `TaskRow` editor form; `TaskController::validated` accepts title-only update (verified unchanged) |
| AC-2 | Rename requires `onSaveTitle && canUpdate`; delete requires `canDelete && onDelete`; `canDeleteTasks` = `canDeleteTask(activeTenant)` |
| AC-3 | `window.confirm` guard → `taskService.remove` → list refresh |
| AC-4 | `ProjectSection.tsx:47` badge: `section ? section.tasks_total : tasks.length` |
| AC-5 | `isTaskOverdue` + `is-overdue` class + `pm-overdue-chip`; skipped when `status === 'done'` |
| AC-6 | `pm-avatar` initials stack with `aria-label`/`title` names |
| AC-7 | Commands below; zero backend diff |

## Verification commands and results

- `cd frontend; npm.cmd run lint` → exit 0
- `cd frontend; npm.cmd run build` → exit 0
- `cd backend; php artisan test` → exit 0, 163 passed (821 assertions) — unchanged from LS-004 post-state

## Remaining risks

- Interactive browser behavior unverified (`05-qa.md` manual items); QA PARTIAL.
- Overdue uses the viewer's local calendar day; a tenant spanning distant timezones could see ±1 day differences, same semantics as the existing My Tasks grouping.
- `pm-quick-add` CSS from LS-004 remains unused (unchanged decision).

## Rollback readiness

Revert the six frontend files and delete `frontend/src/utils/taskDisplay.ts`. No backend, schema, config, or environment change exists to unwind.

## Untouched

All backend files, `frontend/src/types/project.types.ts`, `TaskDetailModal.tsx`, `TaskRow` consumers other than the two dashboard pages, billing/support/admin/organization files, LS-003 and LS-004 artifacts.
