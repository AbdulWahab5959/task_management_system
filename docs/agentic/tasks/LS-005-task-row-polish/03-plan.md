# Plan — LS-005-task-row-polish

Plan revision: LS-005-P1. Base commit `14f96e5` (LS-004 change set present in working tree, uncommitted).

## Steps

1. Create `frontend/src/utils/taskDisplay.ts` with the shared helpers from spec §1.
2. Rewrite `TaskRow.tsx`: props, overdue class/label, avatar stack, inline rename form, delete button with confirm; keep open-on-click and check-toggle behavior identical.
3. Update `ProjectSection.tsx`: forward new props; badge uses `section.tasks_total` when a section exists.
4. Update `ProjectDetailPage.tsx`: add `renameTask` / `deleteTask` handlers; pass props through sections.
5. Update `MyTasksPage.tsx`: add the same handlers with `load()` refresh; pass props to rows.
6. Append CSS to `project-management.css`; add the new icon buttons to the focus-visible selector list.
7. Verify: `npm.cmd run lint`, `npm.cmd run build` in `frontend`; `php artisan test` in `backend` (expect 163 passed — no backend change); write `04-review.md`, `05-qa.md`, `06-evidence.md`.

## Risks / mitigations

- Row click vs rename input focus: the editor replaces the content button while editing, so no nested-button HTML.
- Subtask rows use their own markup inside `TaskDetailModal`, not `TaskRow`; unaffected.
- `window.confirm` is the app's existing deletion-confirmation mechanism (project sections use in-row confirm; task delete in the modal has no confirm) — using `window.confirm` for row-level delete is the least surprising guard. Recorded as a deviation decision if the review disagrees.

## Verification commands

- `cd backend; php artisan test` → expect 163 passed, 821 assertions (unchanged).
- `cd frontend; npm.cmd run lint` → exit 0.
- `cd frontend; npm.cmd run build` → exit 0.
- Browser QA items recorded in `05-qa.md` (likely NOT RUN in this environment, as with LS-004).
