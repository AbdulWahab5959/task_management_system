# Frontend Stripe Checkout Notes

This React frontend uses Stripe hosted Checkout through Laravel. React shows
plans, asks Laravel to start checkout, and redirects the browser to the
`checkout_url` returned by the backend.

## How the Flow Works

1. The pricing page loads plans from Laravel.
2. The user clicks Subscribe on a plan.
3. React sends only `plan_id` and `gateway: "stripe"` to Laravel.
4. Laravel creates the Stripe Checkout Session.
5. Laravel returns `payment_reference` and `checkout_url`.
6. React redirects the browser to `checkout_url`.
7. Stripe redirects back to `/checkout/success?reference=pay_xxx` or
   `/checkout/cancel?reference=pay_xxx`.
8. The success page asks Laravel for the payment status and polls while the
   status is `pending`.

## Why Laravel Creates the Checkout Session

The backend owns pricing, subscription rules, user permissions, and Stripe
secret keys. React is easy for users to inspect, so it should never decide the
checkout amount or create a Stripe Checkout Session directly.

## Secrets Stay Out of React

Do not put Stripe secret keys, webhook secrets, prices for checkout, user IDs,
or subscription activation logic in frontend code. The frontend only displays
plans and payment status returned by Laravel.

## Required Environment Variable

```env
VITE_API_BASE_URL=https://api.example.com
```

Hosted Stripe Checkout redirect does not require a frontend publishable key.
Use a placeholder publishable key only if the app later adds Stripe Elements or
embedded checkout:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
```

## Required Frontend Pages

- `src/pages/Pricing.tsx`
- `src/pages/CheckoutSuccess.tsx`
- `src/pages/CheckoutCancel.tsx`

## Required Laravel Endpoints

- `POST /api/payments/checkout`
- `GET /api/payments/{reference}`
- `GET /api/plans`

## Testing Checklist

- Click Subscribe on a paid plan.
- Confirm React sends only `plan_id` and `gateway`.
- Confirm the browser redirects to Stripe using the backend `checkout_url`.
- Cancel checkout and return to `/checkout/cancel`.
- Complete a successful payment and return to `/checkout/success`.
- Confirm the success page shows the pending state while Laravel verifies.
- Confirm the success page updates when Laravel returns `paid`.
- Confirm API unavailable errors show friendly messages.
- Confirm unauthenticated users see a friendly sign-in message.

## Backend Dependencies

Laravel still needs to create Checkout Sessions, store payment references, verify
Stripe webhook events, and expose the payment status endpoint used by React.
