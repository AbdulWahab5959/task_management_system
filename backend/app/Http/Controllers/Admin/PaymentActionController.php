<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Refund;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Throwable;

class PaymentActionController extends Controller
{
    /**
     * Admin: Refund a payment (full or partial).
     * POST /api/admin/payments/{payment}/refund
     */
    public function refund(Request $request, Payment $payment): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        // Only paid payments can be refunded
        if (! in_array($payment->status, [Payment::STATUS_PAID, Payment::STATUS_PARTIALLY_REFUNDED])) {
            return response()->json([
                'message' => 'Only paid payments can be refunded.',
            ], 400);
        }

        // Check if already fully refunded
        if ($payment->isFullyRefunded()) {
            return response()->json([
                'message' => 'This payment has already been fully refunded.',
            ], 400);
        }

        $refundAmount = $validated['amount'] ?? (float) $payment->amount;
        $refundableAmount = $payment->getRefundableAmount();

        // Validate refund amount does not exceed remaining refundable amount
        if ($refundAmount > $refundableAmount) {
            return response()->json([
                'message' => "Refund amount ({$refundAmount}) exceeds remaining refundable amount ({$refundableAmount}).",
            ], 400);
        }

        $isPartial = $refundAmount < (float) $payment->amount;

        $stripeSecret = config('services.stripe.secret');

        // Determine refund source - must be PaymentIntent (pi_...) or Charge (ch_...)
        $refundSourceId = $payment->provider_payment_intent_id
            ?? $payment->provider_charge_id
            ?? null;

        // Validate the refund source is a proper Stripe refundable ID (pi_ or ch_)
        $hasValidRefundSource = $refundSourceId
            && (str_starts_with($refundSourceId, 'pi_') || str_starts_with($refundSourceId, 'ch_'));

        // If no valid source, try to retrieve PaymentIntent from Stripe using available data
        if (! $hasValidRefundSource && $payment->gateway === 'stripe' && is_string($stripeSecret) && trim($stripeSecret) !== '') {
            Stripe::setApiKey($stripeSecret);

            try {
                // Try to get payment intent from subscription's latest invoice
                if ($payment->provider_payment_id && str_starts_with($payment->provider_payment_id, 'sub_')) {
                    try {
                        $subscription = \Stripe\Subscription::retrieve($payment->provider_payment_id);
                        $latestInvoiceId = $subscription->latest_invoice ?? null;

                        if ($latestInvoiceId) {
                            $invoice = \Stripe\Invoice::retrieve($latestInvoiceId);
                            $paymentIntentId = $invoice->payment_intent ?? null;

                            if ($paymentIntentId && str_starts_with($paymentIntentId, 'pi_')) {
                                $refundSourceId = $paymentIntentId;
                                $hasValidRefundSource = true;

                                // Save the retrieved IDs for future use
                                $payment->update([
                                    'provider_payment_intent_id' => $paymentIntentId,
                                    'provider_payment_id' => $paymentIntentId,
                                ]);

                                Log::info('Retrieved PaymentIntent from subscription latest invoice.', [
                                    'payment_id' => $payment->id,
                                    'subscription_id' => $payment->provider_payment_id,
                                    'invoice_id' => $latestInvoiceId,
                                    'payment_intent_id' => $paymentIntentId,
                                ]);
                            }
                        }
                    } catch (Throwable $subscriptionException) {
                        Log::warning('Failed to retrieve subscription for refund source fallback.', [
                            'payment_id' => $payment->id,
                            'subscription_id' => $payment->provider_payment_id,
                            'exception' => $subscriptionException->getMessage(),
                        ]);
                    }
                }

                // Try to get payment intent from session
                if (! $hasValidRefundSource && $payment->provider_session_id) {
                    try {
                        $session = \Stripe\Checkout\Session::retrieve($payment->provider_session_id);
                        $invoiceId = $session->invoice ?? null;

                        if ($invoiceId) {
                            $invoice = \Stripe\Invoice::retrieve($invoiceId);
                            $paymentIntentId = $invoice->payment_intent ?? null;

                            if ($paymentIntentId && str_starts_with($paymentIntentId, 'pi_')) {
                                $refundSourceId = $paymentIntentId;
                                $hasValidRefundSource = true;

                                $payment->update([
                                    'provider_payment_intent_id' => $paymentIntentId,
                                    'provider_payment_id' => $paymentIntentId,
                                    'provider_invoice_id' => $invoiceId,
                                ]);

                                Log::info('Retrieved PaymentIntent from checkout session invoice.', [
                                    'payment_id' => $payment->id,
                                    'session_id' => $payment->provider_session_id,
                                    'invoice_id' => $invoiceId,
                                    'payment_intent_id' => $paymentIntentId,
                                ]);
                            }
                        }
                    } catch (Throwable $sessionException) {
                        Log::warning('Failed to retrieve session for refund source fallback.', [
                            'payment_id' => $payment->id,
                            'session_id' => $payment->provider_session_id,
                            'exception' => $sessionException->getMessage(),
                        ]);
                    }
                }
            } catch (Throwable $fallbackException) {
                Log::warning('Refund source fallback failed.', [
                    'payment_id' => $payment->id,
                    'exception' => $fallbackException->getMessage(),
                ]);
            }
        }

        try {
            DB::beginTransaction();

            $stripeSecret = config('services.stripe.secret');
            $refundResult = null;
            $providerRefundId = null;

            if ($payment->gateway === 'stripe' && is_string($stripeSecret) && trim($stripeSecret) !== '' && $hasValidRefundSource) {
                Stripe::setApiKey($stripeSecret);

                $stripeRefundParams = [];

                // Use PaymentIntent ID if available
                if ($payment->provider_payment_intent_id && str_starts_with($payment->provider_payment_intent_id, 'pi_')) {
                    $stripeRefundParams['payment_intent'] = $payment->provider_payment_intent_id;
                } elseif ($payment->provider_charge_id && str_starts_with($payment->provider_charge_id, 'ch_')) {
                    $stripeRefundParams['charge'] = $payment->provider_charge_id;
                }

                if (empty($stripeRefundParams)) {
                    throw new \RuntimeException('No valid Stripe PaymentIntent or Charge ID found for refund.');
                }

                // Amount in cents
                $stripeRefundParams['amount'] = (int) round($refundAmount * 100);

                // Add reason if valid Stripe reason
                if (! empty($validated['reason'])) {
                    $validReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
                    $reasonLower = strtolower($validated['reason']);
                    if (in_array($reasonLower, $validReasons, true)) {
                        $stripeRefundParams['reason'] = $reasonLower;
                    }
                }

                $refundResult = \Stripe\Refund::create($stripeRefundParams);

                $providerRefundId = $refundResult->id ?? null;

                // Store charge ID from refund result if available
                if ($refundResult->charge ?? null) {
                    $chargeId = $refundResult->charge;
                    if ($chargeId && str_starts_with($chargeId, 'ch_')) {
                        $payment->update(['provider_charge_id' => $chargeId]);
                    }
                }
            } elseif ($payment->gateway === 'stripe' && ! $hasValidRefundSource) {
                // No valid refund source - mark as failed
                Log::warning('Cannot refund via Stripe: no valid PaymentIntent or Charge ID.', [
                    'payment_id' => $payment->id,
                    'reference' => $payment->reference,
                    'provider_payment_id' => $payment->provider_payment_id,
                    'provider_payment_intent_id' => $payment->provider_payment_intent_id,
                    'provider_charge_id' => $payment->provider_charge_id,
                ]);

                // Create a failed refund record
                $refundRecord = Refund::create([
                    'payment_id' => $payment->id,
                    'user_id' => $payment->user_id,
                    'gateway' => $payment->gateway,
                    'provider_refund_id' => null,
                    'provider_payment_id' => $payment->provider_payment_id,
                    'amount' => $refundAmount,
                    'currency' => $payment->currency,
                    'status' => 'failed',
                    'reason' => 'Invalid refund source: subscription ID was used instead of PaymentIntent/Charge ID.',
                    'raw_response' => null,
                    'refunded_at' => now(),
                ]);

                DB::commit();

                return response()->json([
                    'message' => 'This payment cannot be refunded because no valid Stripe PaymentIntent or Charge ID was saved. The refund has been marked as failed.',
                    'refund' => [
                        'id' => $refundRecord->id,
                        'amount' => $refundRecord->amount,
                        'status' => $refundRecord->status,
                        'provider_refund_id' => $refundRecord->provider_refund_id,
                        'reason' => $refundRecord->reason,
                        'refunded_at' => $refundRecord->refunded_at?->toISOString(),
                    ],
                    'payment' => [
                        'id' => $payment->id,
                        'status' => $payment->status,
                        'refunded_amount' => $payment->refunded_amount,
                        'refund_status' => $payment->refund_status,
                    ],
                ], 400);
            }

            // Create refund record
            $refundRecord = Refund::create([
                'payment_id' => $payment->id,
                'user_id' => $payment->user_id,
                'gateway' => $payment->gateway,
                'provider_refund_id' => $providerRefundId,
                'provider_payment_id' => $payment->provider_payment_intent_id ?? $payment->provider_charge_id ?? $payment->provider_payment_id,
                'amount' => $refundAmount,
                'currency' => $payment->currency,
                'status' => $refundResult ? 'succeeded' : 'pending',
                'reason' => $validated['reason'] ?? null,
                'raw_response' => $refundResult ? json_decode(json_encode($refundResult), true) : null,
                'refunded_at' => $refundResult ? now() : null,
            ]);

            // Update payment refund amounts
            $newRefundedAmount = (float) $payment->refunded_amount + $refundAmount;

            if ($isPartial) {
                $payment->update([
                    'refunded_amount' => $newRefundedAmount,
                    'refund_status' => 'partially_refunded',
                    'status' => Payment::STATUS_PARTIALLY_REFUNDED,
                ]);
            } else {
                $payment->update([
                    'refunded_amount' => $newRefundedAmount,
                    'refund_status' => 'refunded',
                    'status' => Payment::STATUS_REFUNDED,
                ]);
            }

            DB::commit();

            $action = $isPartial ? 'Partial refund' : 'Full refund';

            Log::info("Admin {$action} processed.", [
                'admin_user_id' => $request->user()->id,
                'payment_id' => $payment->id,
                'refund_id' => $refundRecord->id,
                'amount' => $refundAmount,
                'provider_refund_id' => $providerRefundId,
                'refund_source' => $refundSourceId,
            ]);

            return response()->json([
                'message' => "{$action} of {$refundAmount} {$payment->currency} processed successfully.",
                'refund' => [
                    'id' => $refundRecord->id,
                    'amount' => $refundRecord->amount,
                    'status' => $refundRecord->status,
                    'provider_refund_id' => $refundRecord->provider_refund_id,
                    'refunded_at' => $refundRecord->refunded_at?->toISOString(),
                ],
                'payment' => [
                    'id' => $payment->id,
                    'status' => $payment->fresh()->status,
                    'refunded_amount' => $payment->fresh()->refunded_amount,
                    'refund_status' => $payment->fresh()->refund_status,
                ],
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();

            Log::error('Admin refund failed.', [
                'payment_id' => $payment->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Refund failed. Please try again or check Stripe dashboard.',
            ], 500);
        }
    }
}