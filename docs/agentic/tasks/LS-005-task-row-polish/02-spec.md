# Specification — LS-005-task-row-polish

Plan revision: LS-005-P1

## 1. New shared display helpers — `frontend/src/utils/taskDisplay.ts`

- `formatShortDate(value: string | null): string | null` (moved from TaskRow; `Mon d` format).
- `taskStatusLabel(status: TaskStatus): string` (moved from TaskRow).
- `isTaskOverdue(task: Pick<Task,'status'|'due_date'>, today: string): boolean` — true iff `status !== 'done'` and `due_date` is truthy and `< today`.
- `todayDateString(): string` — local `YYYY-MM-DD` for comparisons (matches the existing `MyTasksPage` comparison semantics).
- `initials(name: string): string` — first characters of the first two whitespace-separated words, uppercased.

## 2. TaskRow changes — `frontend/src/components/projects/TaskRow.tsx`

New optional props:

- `canDelete?: boolean` (default false)
- `onSaveTitle?: (task: Task, title: string) => Promise<void>`
- `onDelete?: (task: Task) => Promise<void>`

Behavior:

- Overdue: row gets `is-overdue` class; due-date element gets an additional visible `Overdue` text chip; priority badge untouched (labels already text).
- Avatars: an `pm-task-row__avatars` stack before the priority badge; one initials circle per assignee, max 3 then `+N`; `title` attribute with the full name list.
- Inline rename: a pencil icon button (`pm-task-row__action`) in the meta area when `onSaveTitle` and `canUpdate` are provided. Clicking switches the row to an editing state: the content area becomes a form with a text input (initial value = current title), Save via Enter or the confirm button, cancel via Escape or the cancel button. While saving, controls are disabled and the button label is `Saving…`. Empty/whitespace-only titles are rejected client-side without a request.
- Delete: a trash icon button when `canDelete` and `onDelete` are provided. It calls `window.confirm('Delete task "<title>"? This cannot be undone.')` before invoking `onDelete`.
- The existing click-to-open content button is unchanged while not editing.

## 3. ProjectSection changes

- New forwarded props: `canDeleteTasks?: boolean`, `onSaveTaskTitle?: (task, title) => Promise<void>`, `onDeleteTask?: (task) => Promise<void>`; passed through to each `TaskRow`.
- Header badge count: `section ? section.tasks_total : tasks.length`.

## 4. ProjectDetailPage changes

- New handlers `renameTask(task, title)` → `taskService.update(task.id, { title })` then `loadProject(false)`; `deleteTask(task)` → `taskService.remove(task.id)` then `loadProject(false)`. Errors surface through the existing page error banner with the shared message when validation text exists.
- Pass `canDeleteTasks={canDeleteTasks}` and the two handlers into every `ProjectSection`.

## 5. MyTasksPage changes

- New handlers `renameTask` and `deleteTask` with the same service calls followed by `await load()`; failures set the existing page error state.
- Pass `canDeleteTasks`, `onSaveTitle`, `onDelete` to each `TaskRow`.

## 6. CSS — `frontend/src/styles/project-management.css`

- `.pm-task-row.is-overdue` and `.pm-task-row__date.is-overdue` styling (accent-red text + subtle chip), plus `.pm-overdue-chip` with visible text.
- `.pm-task-row__avatars`, `.pm-avatar` (initials circle, muted surface), `.pm-avatar--more`.
- `.pm-task-row__actions` cluster with hover-reveal for pointer devices (behind the existing `@media (hover: hover)` pattern, always visible on touch), consistent with `.pm-icon-button` focus-visible handling added to the line-81 outline list.
- `.pm-task-row__title-input` reusing `dashboard-control` sizing.
- Responsive: actions stay reachable in the collapsed two-column grid.

## Non-goals

No backend change, no type changes to `Task`, no modal changes, no new routes.
