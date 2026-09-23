# Investigation: Organizations page consistency and loading performance

## Existing patterns inspected

- `frontend/src/components/common/Card.tsx` is the shared card surface.
- `frontend/src/components/common/Button.tsx` is the shared button/theme component.
- `frontend/src/components/dashboard/PageHeader.tsx` and `DashboardPage.tsx` provide the surrounding page and skeleton patterns.
- `frontend/src/context/TenantContext.tsx` already deduplicates the initial tenant list request.
- `frontend/src/context/AuthContext.tsx` already deduplicates `/api/auth/me` while it is in flight.

## Findings

1. `OrganizationManagementPanel` requested current billing and all billing plans on mount even though plan details are only needed when the organization limit dialog is opened.
2. It requested `/tenant/settings` on mount even though `/tenant/dashboard/summary` already returns the complete profile needed for the overview. Settings are only required as a fallback when opening the editor without summary data.
3. The create callback called `refreshTenants()` again even though `TenantContext.createTenant()` already refreshes and selects the created tenant.
4. The summary and billing effects had no component-level in-flight reuse, so React StrictMode development effect replay could issue duplicate requests.
5. The summary state began as not loading, which could briefly render the error/empty branch before the microtask flipped loading on. The overview now starts with a stable skeleton state.
6. Selector cards used a page-specific border/background treatment and a pencil icon for non-selected organizations instead of the standard card surface.
7. Snapshot cards had no minimum height, allowing row alignment to shift when values such as a subscription plan wrapped.

## Backend observation

The existing summary endpoint executes several independent tenant/profile, project/task, subscription, and entitlement queries. This task does not change the API contract or backend because the most direct confirmed frontend waste is removed without risking authorization or tenant-query behavior. The summary endpoint remains one request from the Organizations page.
