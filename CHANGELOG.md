# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **User Cancel Immediately** - POST /api/billing/cancel-now endpoint for authenticated users to cancel subscription immediately
- **Cancel Immediately Confirmation Modal** - Danger-styled modal with plan details, billing period, and clear warnings
- **"Cancelled Immediately" Badge** - UI shows badge and details after immediate cancellation
- **cancel_at_period_end Webhook Sync** - `customer.subscription.updated` and `customer.subscription.deleted` now sync `cancel_at_period_end` from Stripe
- **Activity Logging** - Immediate cancellation creates activity log entry with `subscription_cancelled_immediately` action
- **Frontend cancel-now API** - `cancelNowUserSubscription()` service function in billing service

### Changed
- **BillingPage** - Shows both "Cancel at Period End" and "Cancel Immediately" buttons for active subscriptions
- **BillingPage** - When subscription is scheduled to cancel at period end, hides "Cancel at Period End" button, still shows "Cancel Immediately"
- **BillingPage** - After immediate cancellation, shows "Cancelled Immediately" badge, cancelled date, access ended date, and original billing period
- **BillingPage** - "Cancel at Period End" modal and "Cancel Immediately" modal are now separate with distinct styling and messaging
- **Webhook syncSubscriptionFromStripeObject** - Now syncs `cancel_at_period_end` field from Stripe
- **BillingController** - Added `use App\Models\ActivityLog` import and `cancelNow()` method

### Security
- User can only cancel their own subscription immediately
- User cannot immediately cancel a subscription that's already cancelled
- Guest cannot call cancel-now endpoint (requires auth:sanctum)
- Admin cancel-now endpoint is unaffected and continues to work

## Refund Source Fix
### Added
- **Invalid Refund Detection** - Admin refund endpoint now validates Stripe refund source before creating refund
- **Failed Refund Record** - When no valid PaymentIntent or Charge ID exists, creates a failed refund record with reason
- **provider_invoice_id Column** - Added to payments table for tracking Stripe invoice IDs
- **Webhook Invoice Saving** - `invoice.payment_succeeded` now saves `provider_payment_intent_id`, `provider_charge_id`, and `provider_invoice_id`
- **Checkout Webhook Fix** - `checkout.session.completed` now stores PaymentIntent ID as `provider_payment_intent_id` when available
- **needs_review Refund Status** - Admin payments page supports "needs review" status for invalid pending refunds

### Changed
- **PaymentActionController::refund** - Requires `pi_...` PaymentIntent ID or `ch_...` Charge ID for Stripe refunds
- **PaymentActionController::refund** - Falls back to Charge ID if PaymentIntent ID is unavailable
- **PaymentActionController::refund** - Returns clear error when refund source is invalid instead of failing silently
- **StripeWebhookController::upsertInvoicePayment** - Saves PaymentIntent, Charge, and Invoice IDs from invoice payload
- **StripeWebhookController::handleCheckoutSessionCompleted** - Separates PaymentIntent ID from subscription ID storage
- **AdminPaymentsPage** - Added `needs_review` badge for invalid pending refunds

### Security
- Refund amount validation enforced on backend
- Only admin/super_admin can refund
- Refund reason validated against Stripe-supported reasons
- Subscription IDs are no longer used as Stripe refund identifiers
- Clear error messages returned when refund source is invalid

## [1.3.0] - 2026-07-02
### Added
- **Subscription Cancellation Lifecycle** - User cancel at period end via Stripe API
- **Admin Cancel Immediately** - POST /api/admin/subscriptions/{id}/cancel-now endpoint
- **Admin Refund Management** - POST /api/admin/payments/{id}/refund endpoint with full and partial refund support
- **Refunds Table** - New `refunds` database table for tracking refund records
- **cancel_at_period_end Field** - Added to subscriptions table for tracking scheduled cancellations
- **Refund Columns on Payments** - Added `provider_payment_intent_id`, `provider_charge_id`, `refunded_amount`, `refund_status` to payments table
- **Refund Webhook Handlers** - `charge.refunded`, `refund.created`, `refund.updated` webhook event processing
- **Refund Model** - New `App\Models\Refund` Eloquent model with relationships
- **Admin Subscription Service** - Frontend service for cancel-now and refund API calls
- **Cancel Now Button** - Admin subscriptions page now has "Cancel Now" action with confirmation modal
- **Refund Button** - Admin payments page now has "Refund" action with full/partial refund modal
- **Refund Status Display** - Admin payments table shows refund status column (not refunded, partially_refunded, refunded)
- **Payment Status Constants** - Added `refunded` and `partially_refunded` status constants to Payment model
- **cancel_at_period_end in API** - Subscription serialization now includes `cancel_at_period_end` field

### Changed
- **BillingController::cancelSubscription** - Now calls Stripe API to set `cancel_at_period_end=true` instead of immediately cancelling
- **Subscription Model** - Added `cancel_at_period_end` to fillable attributes
- **Payment Model** - Added refund-related fillable fields, `refunds()` relationship, `isFullyRefunded()`, `isPartiallyRefunded()`, `getRefundableAmount()` methods
- **BillingPage** - Updated `isCancellingAtPeriodEnd` to check `cancel_at_period_end` field
- **AdminSubscriptionsPage** - Added Cancel Now button and confirmation modal for active subscriptions
- **AdminPaymentsPage** - Added Refund button with full/partial refund modal, refund status column
- **Webhook Event Types** - Added `charge.refunded`, `refund.created`, `refund.updated` to reprocessable event types

### Security
- User can only cancel their own subscription at period end
- User cannot refund payments
- User cannot cancel immediately
- Admin/super_admin can cancel immediately and refund
- Refund amount validated on backend - cannot exceed paid amount
- Stripe secret keys not exposed to frontend

## [1.2.0] - 2026-06-27
### Added
- Professional admin subscription reports with real database data
- Professional admin payment reports with real database data
- Real-time subscription and payment summary statistics for admins
- Enhanced filtering capabilities for admin reports (search, status, plan, gateway, date range)
- Additional columns in subscription details view showing Stripe IDs
- Date range filtering for both subscriptions and payments
- Plan and gateway filters for admin subscription reports
- Gateway filter for admin payment reports
- Stats cards for total subscriptions, active subscriptions, cancelled subscriptions, pending payments, paid payments, and total paid amount

### Changed
- Updated AdminSubscriptionController to return comprehensive subscription data including stripe_subscription_id and stripe_customer_id
- Enhanced getPayments method in AdminSubscriptionController to include summary statistics
- Improved AdminSubscriptionsPage.tsx with enhanced filtering and stats display
- Improved AdminPaymentsPage.tsx with enhanced filtering and stats display
- Updated API response format to include summary statistics for both subscriptions and payments
- Modified API endpoints to support additional query parameters (start_date, end_date, plan_id, gateway)

### Fixed
- Corrected API response to include all required subscription fields as per requirements
- Ensured proper calculation of payment summary statistics
- Fixed date filtering functionality in admin reports
- Improved data consistency in admin reports to use real database values

## [1.1.0] - 2026-06-26
### Added
- Stripe checkout integration
- Subscription management system
- Payment processing and tracking
- Webhook handling for payment events
- Tenant-based subscription isolation
- Admin panel for managing subscriptions and payments

### Changed
- Updated user authentication to support subscription-based access
- Enhanced profile management with subscription details
- Improved dashboard navigation for subscription features

## [1.0.0] - 2026-06-25
### Added
- Initial project setup with Laravel backend
- React frontend with Vite
- User authentication system (register, login, logout)
- Email verification workflow
- Password reset functionality
- Basic dashboard layout
- Profile management
- Role-based access control
- Multi-tenancy support
- API endpoints for all features
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
