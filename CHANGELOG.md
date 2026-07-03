# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Refund Eligibility Rules** - Payment model now implements `canBeRefunded()` and `getRefundDisabledReason()` methods with business logic validation
- **Admin Payments API Refund Data** - GET `/api/admin/payments` now returns:
  - `can_refund` (boolean) - whether payment is eligible for refund
  - `refund_disabled_reason` (string|null) - explanation if refund is unavailable
  - `refundable_amount` (decimal) - remaining amount available to refund
  - `provider_payment_intent_id` and `provider_charge_id` - for eligibility verification
  - `subscription_status`, `subscription_cancel_at_period_end`, `subscription_cancelled_at`, `subscription_ends_at` - subscription context
- **Refund Button UX** - Admin Payments Page shows:
  - Active "Refund" button for eligible payments
  - Disabled "Unavailable" button with tooltip for ineligible payments
- **Refund Modal Warning** - Added prominent warning: "Refunding returns money to the customer. This does not automatically reactivate or cancel subscription access."
- **Stripe Invoice Payment Webhook Support** - `invoice_payment.paid` and `invoice.paid` now save nested `payment.payment_intent` values to payments.
- **Stripe PaymentIntent Backfill Command** - Added `php artisan payments:backfill-stripe-intents` for dry-run or applied backfills from saved webhook payloads, with manual `--payment-id`, `--payment-intent`, and `--invoice` options.
- **Stripe Checkout Backfill Command** - Added `php artisan payments:backfill-stripe-checkout` to repair paid subscription checkout rows from known session, subscription, invoice, amount, and currency values.
 - **Auto Backfill After Checkout** - `checkout.session.completed` now triggers an automatic backfill attempt that fetches invoice/payment references (PaymentIntent `pi_...` and Charge `ch_...`) when a Stripe invoice ID is present.
 - **Stripe Backfill Command Improvements** - `php artisan payments:backfill-stripe-references` added with `--payment` single-payment mode and improved scanned/updated/skipped/failed reporting.
- **Payment Stripe Schema Repair Migration** - Added an idempotent migration that ensures payment rows have `gateway_subscription_id`, invoice, PaymentIntent, charge, and refund columns even when an older edited migration was already marked as run.

### Changed
- **PaymentActionController::refund** - Now validates refund eligibility first using `Payment::canBeRefunded()`
- **AdminPaymentsPage** - Refund button logic updated to use backend `can_refund` field instead of client-side status check
- **AdminPaymentsPage** - Disabled refund button now shows `refund_disabled_reason` in hover tooltip
- **Refund Modal Button** - Changed "Full Refund" text to "Confirm Refund" for clarity
- **Stripe Payment Saving** - Subscription checkout no longer saves `sub_...` as `provider_payment_id`; paid invoice webhooks promote `pi_...` into `provider_payment_id` and `provider_payment_intent_id`, and save `in_...` into `provider_invoice_id`.
- **Stripe Checkout Webhook Matching** - `checkout.session.completed` now matches pending payments by `metadata.reference`, then `client_reference_id`, then `provider_session_id`, and treats metadata payment id as a final fallback.
- **Stripe Checkout Payment Updates** - Subscription checkout completion now marks the existing payment row paid, stores `gateway_subscription_id=sub_...`, stores `provider_invoice_id=in_...`, updates amount/currency from the session when present, and leaves `provider_payment_intent_id` null until a real `pi_...` arrives.
- **AdminPaymentsPage** - Refund unavailable state now shows “Refund unavailable: missing Stripe PaymentIntent or Charge ID.” when no `pi_...` or `ch_...` source is present.

### Security
- Backend refund endpoint validates all eligibility rules even if frontend button is bypassed
- Only payments with active subscription cancellations allow refunds (prevents refunding active subscriptions)
- Refund disabled reason returned to admin but does not expose sensitive data
- Only admin/super_admin can refund
- Refund reason validated against Stripe-supported reasons
- Subscription IDs are no longer used as Stripe refund identifiers
- Admin refund API uses `provider_payment_intent_id` first and `provider_charge_id` second; it never falls back to a `sub_...` provider payment id.
- Missing Stripe refund sources now return an error without creating failed or fake refund records.
- Webhook payment updates skip missing optional columns with warning logs instead of failing the whole checkout event.
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
