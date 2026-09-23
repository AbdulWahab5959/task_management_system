# Requirement: Organizations page consistency and loading performance

## Metadata

- Task ID: LS-007
- Level: 2
- Status: IMPLEMENTING
- Date: 2026-09-21

## User request

Fix the current Organizations page so it matches the existing LaunchStack dashboard template. Reuse existing cards, buttons, spacing, typography, colors, borders, shadows, and loading behavior. Remove unusual card decoration, correct the create-organization styling, investigate the page’s multi-stage/slowness issue, remove unnecessary duplicate requests, and keep the final layout stable while loading.

## Acceptance criteria

1. Organization selector cards use the existing dashboard card language and do not show the non-selected pencil/arrow decoration.
2. Create organization continues to use the shared `Button` component and existing theme rather than page-specific purple styling.
3. The overview snapshot cards keep a stable height and render consistently in the four-column layout.
4. Initial organization loading does not fetch settings or billing plans that are not needed to render the overview; profile editing and plan-limit details load those resources only when needed.
5. In-flight summary and billing requests are reused during development re-renders, and create-organization does not refresh tenants twice.
6. Existing organization functionality, tenant scoping, permissions, and routes remain unchanged.
7. Frontend lint/build pass; focused backend tests pass if backend code is changed.

## Out of scope

- API contract changes, broad dashboard redesign, new caching libraries, or unrelated page changes.
