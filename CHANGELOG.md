# Changelog

All notable checkpoint documentation changes are recorded here.

## 2026-06-27

### Changed

- Polished dashboard sidebar navigation with explicit route matching so Analytics no longer highlights on admin Subscriptions or Payments pages.
- Added a subtle custom sidebar scrollbar for overflow-heavy layouts.
- Improved billing plan/status presentation with Free User, active subscriber, pending, cancelled, and cancel-at-period-end style badges.
- Replaced browser confirm/alert cancellation flow with a professional in-app cancellation modal.
- Refined billing plan buttons, payment history table styling, and admin subscription/payment table loading, empty, badge, filter, and pagination states.
- Added small role badges in the dashboard sidebar/navbar user controls.

### Verification

- `npm.cmd run build` passed.

## 2026-06-25 (Update 3)

### Fixed

- Debugged Stripe Checkout start failure and confirmed the runtime root cause: plan `2` is active but has `stripe_price_id = null`.
- Updated `POST /api/billing/stripe/checkout` to return clear errors for inactive/missing plans, missing Stripe Price IDs, invalid Stripe Price IDs, and missing Stripe secret configuration.
- Removed the mock Stripe secret default so missing server configuration fails explicitly.
- Updated `/pricing` and `/dashboard/billing/checkout/:planId` to show backend checkout messages instead of swallowing them behind generic frontend errors.
- Updated dashboard checkout pages to auto-start paid Stripe Checkout from the URL route.
- Added admin plan support for storing a `price_...` Stripe Price ID.
- Updated the plan seeder to preserve existing Stripe Price IDs instead of resetting them to `null`.

### Verification

- `POST api/billing/stripe/checkout` confirmed in `php artisan route:list --path=api/billing`.
- Plan `2` database row confirmed active with `stripe_price_id = null`.
- Direct controller check now returns `422 {"message":"This plan is not connected to Stripe yet."}` for plan `2`.
- `php -l` passed for updated PHP files.
- `npm.cmd run build` passed.

## 2026-06-25 (Update 2)

### Added

- **Stripe Checkout Integration** - real Stripe Checkout Sessions for paid plan subscriptions.
- Created `StripeCheckoutController` with `POST /api/billing/stripe/checkout` endpoint that creates Stripe Checkout Sessions, pending subscriptions, and pending payments.
- Updated `StripeWebhookController` to handle `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted` events in addition to existing handlers.
- Added `createStripeCheckoutSession()` to frontend billing service.
- Frontend `PlanCard` on `/pricing` now calls Stripe Checkout API directly for logged-in users - guest users redirected to `/login?redirect=/pricing`.
- `CheckoutPage` now uses Stripe Checkout for paid plans instead of creating manual pending requests.
- `BillingSuccessPage` now automatically refreshes subscription data from API after Stripe redirect.

### Fixed

- `BillingController::getCurrentSubscription` no longer depends on tenant relationships - queries subscriptions by `user_id` directly, fixing the bug where current subscription plan was not showing in the dashboard.
- `BillingController::cancelSubscription` simplified to work with user-owned subscriptions without tenant dependency.
- `StripeWebhookController::activateSubscriptionForPayment` now works with user-owned subscriptions instead of requiring tenant relationships.

### Changed

- `BillingController::checkout` now returns a redirect response for Stripe gateway, guiding clients to use the dedicated Stripe checkout endpoint.
- Subscription creation in webhook no longer requires a tenant - subscriptions are linked directly to users.

## 2026-06-25

### Added

- **Professional SaaS Billing Flow** - separated visitor pricing, user billing, and admin subscription management.

#### Backend

- Added authenticated user billing APIs: `GET /api/billing/current`, `GET /api/billing/plans`, `POST /api/billing/checkout`, `POST /api/billing/cancel`, and `GET /api/billing/payments`.
- Added admin APIs: `GET /api/admin/subscriptions`, `GET /api/admin/subscriptions/{subscription}`, and `GET /api/admin/payments`.
- Added direct `user_id` ownership for subscriptions and `subscription_id` ownership for payments.
- Added `2026_06_25_000004_normalize_subscriptions_for_user_billing.php` so user-owned subscriptions and pending paid requests do not require legacy tenant or Stripe identifiers.
- Updated `BillingController` so users only read their own billing data. Free plans activate directly; paid plans create pending subscription/payment records only.
- Updated `Admin\SubscriptionController` so admin/super_admin users can search, filter, paginate, and inspect all subscriptions/payments across user-owned and tenant-owned records.

#### Frontend

- Kept `/pricing` as the public visitor pricing page.
- Added `/dashboard/billing` for authenticated users with current plan, subscription status, available plans, upgrade/downgrade selection, cancellation, payment history, and empty states.
- Added `/dashboard/admin/subscriptions` for admin/super_admin users with total, active, pending, and cancelled counts plus searchable/filterable/paginated subscription records.
- Added `/dashboard/admin/payments` for admin/super_admin payment visibility.
- Added dashboard sidebar links for Billing, admin Subscriptions, and admin Payments.
- Updated public pricing cards so guests go to register/login and logged-in users go to dashboard billing.
- Updated login to honor `?redirect=/dashboard/billing`.

### Changed

- Paid plan checkout records only a pending request unless a real payment gateway returns a checkout URL.
- Admin subscription routing now uses `/dashboard/admin/subscriptions`.

### Security

- Users can only see their own subscription/payment records.
- Admin/super_admin can see all records via admin endpoints.
- Normal users are blocked from admin routes via `RoleProtectedRoute` and admin APIs via `EnsureAdminRole`.
- Backend calculates amounts from `plan_id` and does not trust frontend price values.
- No fake successful payments are created.

### Verification

- `npm.cmd run build` passed.
- `php -l` passed for updated billing/admin PHP files.
- `php artisan route:list --path=billing`, `--path=admin/subscriptions`, and `--path=admin/payments` confirmed the APIs exist.
- `php artisan migrate` applied `2026_06_25_000004_normalize_subscriptions_for_user_billing`.

## 2026-06-22

### Changed

- **Complete Dashboard UI/UX Redesign** - all authenticated dashboard pages and components redesigned to premium SaaS quality.
