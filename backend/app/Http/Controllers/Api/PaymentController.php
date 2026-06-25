<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Payments\StripePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class PaymentController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripePaymentService,
    ) {}

    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer'],
            'gateway' => ['required', 'string', 'in:stripe'],
        ]);

        try {
            return response()->json(
                $this->stripePaymentService->createCheckout($request->user(), $validated),
                201,
            );
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            Log::error('Stripe checkout failed.', [
                'user_id' => $request->user()?->id,
                'plan_id' => $validated['plan_id'] ?? null,
                'exception' => $exception,
            ]);

            return response()->json([
                'message' => 'Checkout could not be started. Please try again in a moment.',
            ], 500);
        }
    }

    public function show(Request $request, string $reference): JsonResponse
    {
        $payment = Payment::query()
            ->where('reference', $reference)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return response()->json([
            'reference' => $payment->reference,
            'gateway' => $payment->gateway,
            'status' => $payment->status,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'paid_at' => $payment->paid_at?->toISOString(),
        ]);
    }
}
