# LS-003 - Investigation

## Baseline

- FACT: Branch is `Project_Management_System` at revision `360e490`.
- FACT: The worktree already contains unrelated modified backend, frontend, and documentation files plus the untracked `LS-002-backend-performance-audit` task. Those changes are preserved and are outside this task's baseline.
- FACT: No implementation files were changed for LS-003 during this investigation.

## Existing architecture

- FACT: Backend is Laravel API under `backend`; frontend is React/Vite under `frontend`.
- FACT: Sanctum authentication is applied through `auth:sanctum` route groups. Auth state is exposed by `AuthContext`/`useAuth`; tenant state is exposed by `TenantContext`/`useTenant`.
- FACT: Middleware aliases in `backend/bootstrap/app.php` include `tenant.identify`, `tenant.subscription`, `permission`, `admin`, and `super.admin`.
- FACT: Reusable frontend primitives include `Card`, `Button`, `Input`, `PageHeader`, `StatsCard`, `EmptyState`, dashboard sidebar/navbar, and loading components.

## Tenant and authorization implementation

- FACT: Central `tenants`, `tenant_users`, plans, subscriptions, invitations, permissions, and activity logs are stored on the central connection.
- FACT: `IdentifyTenant` resolves domain/custom-domain/route/request/header identifiers, verifies authenticated-user access and active status, then switches the tenant connection and stores the resolved tenant on the request.
- FACT: `TenantPermissionService` checks active tenant membership, direct permissions, role permissions, and grants super-admin platform access.
- FACT: `RequireTenantPermission` authorizes against the request tenant before the controller executes.
- FACT: `TenantService` provisions a separate tenant database and runs `database/migrations/tenant` migrations.
- FACT: `Project` and `Task` use `UsesTenantConnection`, so their current data model is tenant-database scoped rather than central-table `tenant_id` scoped.
- FACT: Team member and invitation controllers generally query through the resolved tenant or constrain central records by tenant ID, and invitation acceptance verifies the authenticated email.
- SECURITY FINDING: `DELETE /api/tenants/{tenant}/permanent` is not configured with `tenant.identify`; `TenantController::permanentlyDelete` falls back to direct route lookup. This is an existing high-risk authorization gap and must be fixed or explicitly addressed before relying on the route.
- SECURITY FINDING: `TenantMemberController::index` computes effective/direct permissions per member, which may create an N+1 query pattern; this is a performance concern, not an authorization bypass by itself.

## Existing projects/tasks

- FACT: Tenant migrations already create `projects` and `tasks`.
- FACT: Existing project fields are `id`, `name`, `description`, `status` (`active`, `completed`, `archived`), `created_by`, timestamps.
- FACT: Existing task fields are `id`, `project_id`, `title`, `description`, `status` (`todo`, `in_progress`, `done`), `priority` (`low`, `medium`, `high`, `urgent`), `assigned_to`, `due_date`, `created_by`, timestamps.
- FACT: Existing models expose only `Project::tasks()` and `Task::project()`; creator, assignee, tenant membership, status extensions, due dates for projects, progress, policies, requests, controllers, services, routes, frontend pages, and frontend services were not found.
- INFERENCE: Because each tenant has a separate database, central `users` foreign keys cannot be enforced with ordinary tenant-database foreign keys. Assignment validation must resolve the central authenticated user's membership before writing tenant-local task data, and resource queries must run only after tenant authorization and connection switching.

## Billing and subscription

- FACT: Stripe checkout, billing current-state, plans, payment history, invoices, cancellation, subscription resolver, webhook controller, webhook event storage, and idempotency-related migrations/services already exist.
- FACT: Current organization creation is limited by the authenticated user's subscription and the plan's `organizations` limit.
- FACT: `CheckSubscription` resolves the current tenant but reports a subscription scope of `user`; the current codebase therefore has mixed tenant/user billing semantics that must not be silently changed.
- REQUIRES APPROVAL: Whether project/task access is gated by the existing user-owned subscription resolver, a tenant-level subscription contract, or a compatibility bridge must be decided before billing middleware or entitlement code changes.

## Frontend and navigation

- FACT: The authenticated shell already provides sidebar/navbar, organization switching, loading/error/empty states, team, organizations, billing, settings, support, and platform-admin screens.
- FACT: No project/task routes, pages, typed services, or task navigation entries were found.
- FACT: Existing plan seed data includes project limits and chatbot-oriented labels/entitlements.
- RECOMMENDATION: Hide or remove unfinished chatbot labels from primary product navigation/copy only where that does not change existing billing contracts; preserve backend compatibility until separately reviewed.

## Files expected to change

- Backend: tenant-local migrations/models, project/task requests/services/controllers/policies or centralized authorization integration, routes, dashboard aggregation, tests, and only required config/seed updates.
- Frontend: typed project/task/dashboard services and types, pages/components, routing, navigation, loading/error/empty states, and existing design-system styles.
- Documentation: README and deployment notes; task artifacts for review/QA/evidence after implementation.

## Files that should remain untouched unless evidence requires otherwise

- Sanctum/authentication internals, Stripe provider implementation and webhook contract, unrelated support changes, existing tenant provisioning behavior, and unrelated user worktree changes.

## Investigation status

Implementation is not authorized. A specification and plan follow for developer review.

