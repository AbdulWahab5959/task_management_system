<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Throwable;

class SubscriptionActionController extends Controller
{
    /**
     * Admin: Cancel subscription immediately.
     * POST /api/admin/subscriptions/{subscription}/cancel-now
     */
    public function cancelNow(Subscription $subscription): JsonResponse
    {
        if (! in_array($subscription->status, ['active', 'trialing', 'past_due'])) {
            return response()->json([
                'message' => 'Subscription is not in a cancellable state.',
            ], 400);
        }

        try {
            // If subscription has a Stripe subscription ID, cancel immediately via Stripe
            if ($subscription->stripe_subscription_id) {
                $stripeSecret = config('services.stripe.secret');

                if (! is_string($stripeSecret) || trim($stripeSecret) === '') {
                    Log::critical('Stripe secret key is not configured for admin cancel.');

                    return response()->json([
                        'message' => 'Stripe is not configured. Please contact support.',
                    ], 500);
                }

                Stripe::setApiKey($stripeSecret);

                \Stripe\Subscription::update($subscription->stripe_subscription_id, [
                    'cancel_at_period_end' => false,
                ]);

                \Stripe\Subscription::retrieve($subscription->stripe_subscription_id)->cancel();
            }

            $subscription->update([
                'status' => 'cancelled',
                'cancel_at_period_end' => false,
                'cancelled_at' => now(),
                'ends_at' => now(),
            ]);

            Log::info('Admin cancelled subscription immediately.', [
                'admin_user_id' => request()->user()->id,
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'stripe_subscription_id' => $subscription->stripe_subscription_id,
            ]);

            return response()->json([
                'message' => 'Subscription has been cancelled immediately. User access has been removed.',
                'subscription' => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'cancelled_at' => $subscription->cancelled_at?->toISOString(),
                    'ends_at' => $subscription->ends_at?->toISOString(),
                ],
            ]);
        } catch (Throwable $exception) {
            Log::error('Admin cancel-now failed.', [
                'subscription_id' => $subscription->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Failed to cancel subscription immediately. Please try again.',
            ], 500);
        }
    }
}