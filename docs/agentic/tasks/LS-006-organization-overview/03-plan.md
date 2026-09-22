# Plan: Organization overview and management page

## Scope

Level 2 frontend change. No new API contract or backend architecture is required because the existing tenant dashboard summary endpoint already contains the requested overview data.

## Implementation steps

1. Replace the inline organization settings form with a selected-organization action row and a read-only profile overview.
2. Add an edit modal using the existing organization settings fields and save service, while preserving current tenant permissions and validation.
3. Add summary snapshot cards and overview sections for team, subscription, tasks, projects, recent activity, and setup checklist.
4. Lock page scrolling while any modal is open and constrain modal scrolling to one dialog surface.
5. Align controls and status treatments with the existing dashboard palette and reusable components.
6. Run frontend lint and production build, then document actual outcomes.

## Files in scope

- `frontend/src/components/dashboard/OrganizationManagementPanel.tsx`
- `docs/agentic/tasks/LS-006-organization-overview/`

## Approval

- Approval required: No (Level 2 implementation; no API or architectural change).
