<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\Stripe;
use Throwable;

class StripeCheckoutController extends Controller
{
    public function createSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
        ]);

        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $plan = Plan::query()
            ->whereKey($validated['plan_id'])
            ->where('is_active', true)
            ->first();

        if (! $plan) {
            return response()->json([
                'message' => 'Invalid plan selected.',
            ], 404);
        }

        if ($plan->isFree()) {
            return $this->activateFreePlan($user, $plan);
        }

        if (blank($plan->stripe_price_id)) {
            return response()->json([
                'message' => 'This plan is not connected to Stripe yet.',
            ], 422);
        }

        if (! str_starts_with((string) $plan->stripe_price_id, 'price_')) {
            return response()->json([
                'message' => 'This plan has an invalid Stripe price ID.',
            ], 422);
        }

        $stripeSecret = config('services.stripe.secret');

        if (! is_string($stripeSecret) || trim($stripeSecret) === '') {
            Log::critical('Stripe secret key is not configured.');

            return response()->json([
                'message' => 'Stripe key is not configured.',
            ], 500);
        }

        try {
            Stripe::setApiKey($stripeSecret);

            $frontendUrl = rtrim((string) config('services.frontend.url', 'http://localhost:5173'), '/');
            $reference = 'pay_'.Str::uuid()->toString();

            $session = Session::create([
                'mode' => 'subscription',
                'line_items' => [[
                    'price' => $plan->stripe_price_id,
                    'quantity' => 1,
                ]],
                'success_url' => $frontendUrl.'/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontendUrl.'/dashboard/billing/cancel',
                'client_reference_id' => $reference,
                'customer_email' => $user->email,
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'plan_id' => (string) $plan->id,
                    'reference' => $reference,
                ],
                'subscription_data' => [
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'plan_id' => (string) $plan->id,
                    ],
                ],
            ]);

            // Create a pending subscription
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'gateway' => 'stripe',
                'status' => 'pending',
            ]);

            // Create a pending payment record
            $payment = Payment::create([
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'plan_id' => $plan->id,
                'gateway' => 'stripe',
                'reference' => $reference,
                'provider_session_id' => $session->id,
                'amount' => $plan->amount,
                'currency' => strtoupper((string) ($plan->currency ?: 'USD')),
                'status' => Payment::STATUS_PENDING,
                'checkout_url' => $session->url,
            ]);

            return response()->json([
                'checkout_url' => $session->url,
                'session_id' => $session->id,
                'payment_reference' => $payment->reference,
            ]);
        } catch (ApiErrorException $e) {
            Log::error('Stripe Checkout Session creation failed.', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'exception' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Payment gateway error. Please try again later.',
            ], 500);
        } catch (Throwable $e) {
            Log::error('Checkout session creation failed.', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'exception' => $e,
            ]);

            return response()->json([
                'message' => 'Could not start checkout. Please try again.',
            ], 500);
        }
    }

    private function activateFreePlan($user, Plan $plan): JsonResponse
    {
        try {
            $subscription = Subscription::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                ],
                [
                    'gateway' => null,
                    'status' => 'active',
                    'starts_at' => now(),
                    'ends_at' => null,
                    'cancelled_at' => null,
                ]
            );

            return response()->json([
                'message' => 'Subscribed to free plan successfully.',
                'checkout_url' => null,
                'subscription' => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'plan' => [
                        'id' => $plan->id,
                        'name' => $plan->name,
                    ],
                ],
            ]);
        } catch (Throwable $e) {
            Log::error('Free plan subscription failed.', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'exception' => $e,
            ]);

            return response()->json([
                'message' => 'Could not subscribe to free plan. Please try again.',
            ], 500);
        }
    }
}
