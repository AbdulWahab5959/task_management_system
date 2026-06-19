# Progress

Project checkpoint generated on 2026-06-18.

## Done

- Laravel backend and React frontend project structure exists.
- Public frontend pages exist for `/`, `/about`, and `/contact`.
- Contact form submits to `POST /api/contact`.
- Contact messages are stored in `contact_messages`.
- Auth API is wired for registration, login, current user, logout, email verification, forgot password, reset password, profile update, and password update.
- Sanctum personal access token authentication is present.
- Verified-email access guard is present through `/api/auth/verified-only`.
- Frontend auth pages and protected dashboard routes are wired.
- Dashboard, profile, and settings pages exist.
- App-level migrations exist and are reported as run by `php artisan migrate:status`.
- Backend feature tests exist for auth, email verification/password reset, and profile updates.
- RBAC implementation with `admin` and `super_admin` roles, protected via `EnsureAdminRole` middleware.
- Admin contact message management (list, show, status update, delete).
- Admin user management (list, show, update, status, role).
- Activity log capture, API routes, and admin UI (list, filter by action, user, date).
- **Admin analytics dashboard** — real database metrics via `GET /api/admin/analytics` with auth+admin middleware, and a full frontend admin analytics page at `/dashboard/admin` with stats cards, recent users table, recent activity table, and contact message summary.
- `npm.cmd run build` completed successfully.
- `php artisan route:list` completed successfully.
- `php artisan migrate:status` completed successfully.

## In Progress

- SaaS foundation models for tenants, plans, subscriptions, invoices, tenant users, and activity logs.
- Tenant service and middleware scaffolding.
- Stripe payment service scaffolding with mock fallback.
- Subscription UI components are present but not routed into the app.
- Tenant migration files are present under `backend/database/migrations/tenant`.

## Pending

- Plans/pricing route and UI wiring.
- Stripe subscription API route wiring and end-to-end verification.
- Team invitation and membership workflows.
- Multi-tenancy route/UI wiring and tenant database verification.
- Frontend test coverage.
- Deployment guide and production environment documentation.

## Blocked

- `npm run build` is blocked in PowerShell by local script execution policy for `npm.ps1`; `npm.cmd run build` works.
- Subscription frontend component posts to `/subscriptions/subscribe`, but no matching backend route is registered.
- Tenant migrations cannot be confirmed by default `php artisan migrate:status`; per-tenant migration status needs verification.

## Next Recommended Step

Implement RBAC first, starting with explicit role/permission requirements and protected admin middleware/routes. Do this before admin contact messages, user management, activity logs, analytics, billing, teams, or multi-tenancy expansion.
