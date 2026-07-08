<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Payment;
use App\Models\Refund;
use App\Services\NotificationService;
use App\Services\StripeBackfillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Stripe\Stripe;
use Throwable;

class PaymentActionController extends Controller
{
    /**
     * Admin: Refund a payment (full or partial).
     * POST /api/admin/payments/{payment}/refund
     */
    public function refund(Request $request, Payment $payment, NotificationService $notificationService, StripeBackfillService $stripeBackfillService): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($payment->getRefundDisabledReason() === 'Refund unavailable: missing Stripe PaymentIntent or Charge ID.') {
            $stripeBackfillService->backfillStripePaymentReferences($payment);
            $payment->refresh();
        }

        // Check refund eligibility using the business rules
        if (!$payment->canBeRefunded()) {
            $reason = $payment->getRefundDisabledReason();
            return response()->json([
                'message' => $reason ?? 'This payment cannot be refunded.',
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
        $stripeRefundParams = [];
        $refundSourceId = null;

        if ($payment->provider_payment_intent_id && str_starts_with($payment->provider_payment_intent_id, 'pi_')) {
            $refundSourceId = $payment->provider_payment_intent_id;
            $stripeRefundParams['payment_intent'] = $refundSourceId;
        } elseif ($payment->provider_charge_id && str_starts_with($payment->provider_charge_id, 'ch_')) {
            $refundSourceId = $payment->provider_charge_id;
            $stripeRefundParams['charge'] = $refundSourceId;
        }

        if (! $refundSourceId) {
            Log::warning('Cannot refund via Stripe: no valid PaymentIntent or Charge ID.', [
                'payment_id' => $payment->id,
                'reference' => $payment->reference,
                'provider_payment_id' => $payment->provider_payment_id,
                'provider_payment_intent_id' => $payment->provider_payment_intent_id,
                'provider_charge_id' => $payment->provider_charge_id,
            ]);

            return response()->json([
                'message' => 'Refund unavailable: missing Stripe PaymentIntent or Charge ID.',
            ], 400);
        }

        if (! is_string($stripeSecret) || trim($stripeSecret) === '') {
            Log::critical('Stripe secret key is not configured for refunds.', [
                'payment_id' => $payment->id,
            ]);

            return response()->json([
                'message' => 'Stripe key is not configured.',
            ], 500);
        }

        try {
            DB::beginTransaction();

            $refundResult = null;
            $providerRefundId = null;

            Stripe::setApiKey($stripeSecret);

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

            // Create refund record
            $refundRecord = $this->storeRefundRecord(
                $request,
                $payment,
                $refundAmount,
                $providerRefundId,
                $refundSourceId,
                $refundResult,
                $validated['reason'] ?? null,
            );

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

            // Create user notification for refund initiated
            try {
                $notificationService->refundInitiated(
                    $payment->user_id,
                    $refundAmount,
                    $payment->currency,
                    $payment->id,
                    $refundRecord->id,
                );
            } catch (Throwable $notificationException) {
                Log::warning('Failed to send refund notification.', [
                    'payment_id' => $payment->id,
                    'user_id' => $payment->user_id,
                    'exception' => $notificationException->getMessage(),
                ]);
            }

            // Log activity
            try {
                ActivityLog::create([
                    'user_id' => $request->user()->id,
                    'action' => $isPartial ? 'partial_refund_initiated' : 'refund_initiated',
                    'description' => "Admin initiated {$action} of {$refundAmount} {$payment->currency} for payment #{$payment->id}.",
                    'properties' => [
                        'payment_id' => $payment->id,
                        'payment_reference' => $payment->reference,
                        'refund_id' => $refundRecord->id,
                        'refund_amount' => $refundAmount,
                        'currency' => $payment->currency,
                        'is_partial' => $isPartial,
                        'provider_refund_id' => $providerRefundId,
                        'target_user_id' => $payment->user_id,
                    ],
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            } catch (Throwable $logException) {
                Log::warning('Failed to log activity for refund.', [
                    'exception' => $logException->getMessage(),
                ]);
            }

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
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            if ($this->isAlreadyRefundedStripeException($exception)) {
                $recoveredResponse = $this->recoverAlreadyRefundedPayment(
                    $request,
                    $payment,
                    $refundAmount ?? (float) $payment->amount,
                    $validated['reason'] ?? null,
                );

                if ($recoveredResponse) {
                    return $recoveredResponse;
                }
            }

            Log::error('Admin refund failed.', [
                'payment_id' => $payment->id,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Refund failed. Please try again or check Stripe dashboard.',
            ], 500);
        }
    }

    private function storeRefundRecord(
        Request $request,
        Payment $payment,
        float $refundAmount,
        ?string $providerRefundId,
        string $refundSourceId,
        mixed $refundResult,
        ?string $reason,
    ): Refund {
        if ($providerRefundId) {
            $existingRefund = Refund::where('provider_refund_id', $providerRefundId)->first();

            if ($existingRefund) {
                return $existingRefund;
            }
        }

        $refundData = [
            'payment_id' => $payment->id,
            'user_id' => $payment->user_id,
            'gateway' => $payment->gateway,
            'provider_refund_id' => $providerRefundId,
            'provider_payment_id' => $refundSourceId,
            'amount' => $refundAmount,
            'currency' => $payment->currency,
            'status' => 'succeeded',
            'reason' => $reason,
            'raw_response' => json_decode(json_encode($refundResult), true),
            'refunded_at' => now(),
        ];

        if (Schema::hasColumn('refunds', 'admin_user_id')) {
            $refundData['admin_user_id'] = $request->user()->id;
        }

        return Refund::create($refundData);
    }

    private function isAlreadyRefundedStripeException(Throwable $exception): bool
    {
        return str_contains(strtolower($exception->getMessage()), 'already been refunded');
    }

    private function recoverAlreadyRefundedPayment(
        Request $request,
        Payment $payment,
        float $requestedRefundAmount,
        ?string $reason,
    ): ?JsonResponse {
        try {
            $stripeRefund = $this->findLatestStripeRefund($payment);

            if (! $stripeRefund || ! ($stripeRefund->id ?? null)) {
                return null;
            }

            $providerRefundId = $stripeRefund->id;
            $refundAmount = isset($stripeRefund->amount)
                ? ((int) $stripeRefund->amount) / 100
                : $requestedRefundAmount;
            $refundSourceId = $stripeRefund->payment_intent
                ?? $payment->provider_payment_intent_id
                ?? $payment->provider_charge_id;

            if (! is_string($refundSourceId) || (! str_starts_with($refundSourceId, 'pi_') && ! str_starts_with($refundSourceId, 'ch_'))) {
                $refundSourceId = $payment->provider_payment_intent_id && str_starts_with($payment->provider_payment_intent_id, 'pi_')
                    ? $payment->provider_payment_intent_id
                    : $payment->provider_charge_id;
            }

            if (! is_string($refundSourceId) || (! str_starts_with($refundSourceId, 'pi_') && ! str_starts_with($refundSourceId, 'ch_'))) {
                return null;
            }

            DB::beginTransaction();

            if (($stripeRefund->charge ?? null) && is_string($stripeRefund->charge) && str_starts_with($stripeRefund->charge, 'ch_')) {
                $payment->update(['provider_charge_id' => $stripeRefund->charge]);
            }

            $refundRecord = $this->storeRefundRecord(
                $request,
                $payment,
                $refundAmount,
                $providerRefundId,
                $refundSourceId,
                $stripeRefund,
                $reason,
            );

            $this->markPaymentRefunded($payment, $refundAmount);

            DB::commit();

            Log::info('Recovered Stripe refund that was already processed.', [
                'admin_user_id' => $request->user()->id,
                'payment_id' => $payment->id,
                'refund_id' => $refundRecord->id,
                'provider_refund_id' => $providerRefundId,
            ]);

            return response()->json([
                'message' => 'Refund was already processed by Stripe and has now been saved locally.',
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
        } catch (Throwable $recoveryException) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }

            Log::error('Failed to recover already-refunded Stripe payment.', [
                'payment_id' => $payment->id,
                'exception' => $recoveryException,
            ]);

            return null;
        }
    }

    private function findLatestStripeRefund(Payment $payment): mixed
    {
        if ($payment->provider_charge_id && str_starts_with($payment->provider_charge_id, 'ch_')) {
            $refunds = \Stripe\Refund::all([
                'charge' => $payment->provider_charge_id,
                'limit' => 10,
            ]);

            return $refunds->data[0] ?? null;
        }

        if ($payment->provider_payment_intent_id && str_starts_with($payment->provider_payment_intent_id, 'pi_')) {
            $paymentIntent = \Stripe\PaymentIntent::retrieve($payment->provider_payment_intent_id);
            $chargeId = $paymentIntent->latest_charge ?? null;

            if (is_string($chargeId) && str_starts_with($chargeId, 'ch_')) {
                $refunds = \Stripe\Refund::all([
                    'charge' => $chargeId,
                    'limit' => 10,
                ]);

                if ($refunds->data[0] ?? null) {
                    return $refunds->data[0];
                }
            }

            $refunds = \Stripe\Refund::all([
                'payment_intent' => $payment->provider_payment_intent_id,
                'limit' => 10,
            ]);

            return $refunds->data[0] ?? null;
        }

        return null;
    }

    private function markPaymentRefunded(Payment $payment, float $refundAmount): void
    {
        $newRefundedAmount = min((float) $payment->amount, (float) $payment->refunded_amount + $refundAmount);
        $isFullyRefunded = $newRefundedAmount >= (float) $payment->amount;

        $payment->update([
            'refunded_amount' => $newRefundedAmount,
            'refund_status' => $isFullyRefunded ? 'refunded' : 'partially_refunded',
            'status' => $isFullyRefunded ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED,
        ]);
    }
}
