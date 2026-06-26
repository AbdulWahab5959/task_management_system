# Progress

Project checkpoint generated on 2026-06-18. Updated 2026-06-27.

## Done

- Laravel backend and React frontend project structure exists.
- Public frontend pages exist for `/`, `/about`, `/pricing`, and `/contact`.
- Contact form submits to `POST /api/contact`.
- Contact messages are stored in `contact_messages`.
- Auth API is wired for registration, login, current user, logout, email verification, forgot password, reset password, profile update, and password update.
- Sanctum personal access token authentication is present.
- Verified-email access guard is present through `/api/auth/verified-only`.
- Frontend auth pages and protected dashboard routes are wired.
- Dashboard, profile, and settings pages exist.
- RBAC implementation with `admin` and `super_admin` roles, protected via `EnsureAdminRole` middleware.
- Admin contact message management, admin user management, activity logs, and admin analytics are wired.
- Dashboard UI/UX redesign is present across authenticated pages.
- Professional SaaS billing flow is now separated into:
  - Public `/pricing` for visitors.
  - User `/dashboard/billing` for authenticated subscription management.
  - Admin `/dashboard/admin/subscriptions` for admin/super_admin subscription management.
- User billing APIs exist under `auth:sanctum`: `/api/billing/current`, `/api/billing/plans`, `/api/billing/checkout`, `/api/billing/cancel`, and `/api/billing/payments`.
- Admin billing APIs exist under `auth:sanctum` plus `admin`: `/api/admin/subscriptions`, `/api/admin/subscriptions/{subscription}`, and `/api/admin/payments`.
- Public pricing cards are auth-aware: guests go to register/login, logged-in users go to dashboard billing.
- User billing shows current plan/status, available plans, upgrade/downgrade selection, active cancellation, payment history, and empty states.
- Admin subscriptions show total/active/pending/cancelled counts plus user, plan, gateway, status, amount, created date, search/filter, pagination, and detail modal.
- Paid plan selection creates pending subscription/payment records only. No fake successful payment is created.
- **Stripe Checkout Integration** - real Stripe Checkout Sessions for paid plan subscriptions:
  - `StripeCheckoutController` with `POST /api/billing/stripe/checkout` endpoint creates Stripe Checkout Sessions.
  - `StripeWebhookController` handles `checkout.session.completed`, `checkout.session.expired`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `payment_intent.payment_failed`.
  - Webhook activates subscriptions directly for users (no tenant dependency).
  - Frontend `PlanCard` on `/pricing` calls Stripe Checkout API directly for logged-in users.
  - `CheckoutPage` uses Stripe Checkout for paid plans.
  - `BillingSuccessPage` auto-refreshes subscription data from API.
- **Bug Fix**: `getCurrentSubscription` now queries by `user_id` directly, fixing the issue where current subscription plan was not showing in the dashboard.
- Admin users are not required to have a subscription for admin dashboard access.
- Dashboard UX polish is in place:
  - Sidebar route matching is explicit for Analytics, Subscriptions, Payments, Billing, Profile, and nested dashboard routes.
  - Sidebar scrollbar is now subtle and scoped to the menu area.
  - Billing page shows clear free/subscribed/pending/cancelled/cancel-at-period-end badges.
  - Cancel subscription uses an in-app confirmation modal instead of browser confirm/alert.
  - Admin subscription and payment tables have cleaner badges, controls, loading states, empty states, and responsive table shells.
- `npm.cmd run build` completed successfully.
- `php artisan route:list` confirmed billing and admin subscription/payment APIs.
- `php artisan migrate` applied the user-billing subscription normalization migration.
- **Stripe Checkout Start Failure debugged**:
  - Root cause confirmed: plan `2` is active, but `stripe_price_id` is `null`, so Stripe Checkout cannot start for that plan yet.
  - `POST /api/billing/stripe/checkout` now returns a clear `422` response when a paid plan is not connected to Stripe.
  - Pricing and dashboard checkout pages now surface backend checkout error messages instead of only generic failures.
  - Admin plan management can store a `price_...` Stripe Price ID, and the plan seeder preserves existing Stripe Price IDs.

## In Progress

- Team invitation and membership workflows.
- Multi-tenancy route/UI wiring and tenant database verification.
- Frontend test coverage.

## Pending

- Configure Stripe test keys in `.env`.
- Add valid Stripe price IDs to plans table. Plan `2` currently needs a real `price_...` value before Stripe can redirect.
- Team workflows.
- Multi-tenancy expansion.
- Deployment guide and production environment documentation.
- Frontend test coverage.

## Blocked

- Tenant migrations cannot be confirmed by default `php artisan migrate:status`; per-tenant migration status needs verification.

## Next Recommended Step

Add a real Stripe Price ID to plan `2` and any other paid plans, then test the full checkout flow with Stripe test cards.
