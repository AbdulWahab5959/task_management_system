# LS-005 — Task Row Polish (Inline Edit, Actions, Counts, Overdue, Avatars)

## Task ID

LS-005-task-row-polish
Level: 2
Date: 2026-09-18
Parent roadmap: user-approved Todoist-workflow blueprint (§12 "Highest priority" items 2, 3, 5, 9, 10). Follows completed LS-004.

## Requirement Statement

Improve the task row (used on the project detail page and My Tasks) so the day-to-day task workflow feels like Todoist without leaving LaunchStack's theme, permission model, or organization scoping:

1. Inline task title editing directly in the row, for users who may update the task.
2. Better task row actions: an explicit edit affordance and a delete control for users permitted to delete tasks.
3. Section task counts sourced from the backend `tasks_total` (top-level tasks only) instead of the client-rendered array length.
4. Clear overdue styling and a visible "Overdue" text label (not color alone) on unfinished tasks whose due date has passed.
5. Avatar-style assignee display (initials circles) so assignment is visible without reading text.

## Acceptance Criteria

- AC-1: A permitted user can rename a task inline in the row; Enter saves via `PUT /tenant/tasks/{id}` with only `title`, Escape cancels, and the row reflects the new title after refresh.
- AC-2: A user without update permission sees no rename control; a user without delete permission sees no delete control (frontend only; the backend remains authoritative).
- AC-3: A permitted user can delete a task from the row after an explicit confirmation; the list refreshes.
- AC-4: Section headers show `section.tasks_total` when a section exists; the Unsorted group shows its rendered count.
- AC-5: An unfinished task with `due_date < today` renders with an overdue class and a visible "Overdue" label; completed tasks never render overdue styling.
- AC-6: Rows render initials avatars for the task's assignees.
- AC-7: `php artisan test` still passes with no backend file modified by this task; frontend lint and build exit 0.

## Out of Scope

Labels, filters, Inbox/Today/Upcoming pages, comments, activity, notifications, recurring tasks, drag-and-drop ordering, keyboard shortcuts, breadcrumbs. Editing project/section/dates stays in `TaskDetailModal`.

## Approval

Implemented under the standing instruction to continue the approved Todoist-blueprint roadmap ("started form above where the task is left").
