<?php

namespace App\Console\Commands;

use App\Models\Payment;
use App\Services\StripeBackfillService;
use Illuminate\Console\Command;

class PaymentsBackfillStripeReferences extends Command
{
    protected $signature = 'payments:backfill-stripe-references
        {--dry-run : Run without actually updating records}
        {--limit= : Maximum number of payments to process}
        {--payment= : Single payment id to process}';

    protected $description = 'Backfill missing Stripe PaymentIntent and Charge IDs for paid Stripe payments.';

    public function handle(StripeBackfillService $backfillService): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = $this->option('limit');
        $singlePayment = $this->option('payment');

        $payments = collect();

        if ($singlePayment) {
            $payment = Payment::query()->whereKey((int) $singlePayment)->first();
            if (! $payment) {
                $this->error("Payment id {$singlePayment} not found.");
                return self::FAILURE;
            }

            $payments = collect([$payment]);
        } else {
            $query = Payment::query()
                ->where('gateway', 'stripe')
                ->whereIn('status', ['paid', 'partially_refunded', 'refunded'])
                ->where(function ($q) {
                    $q->whereNull('provider_payment_intent_id')
                        ->orWhere('provider_payment_intent_id', '')
                        ->orWhereNull('provider_charge_id')
                        ->orWhere('provider_charge_id', '');
                });

            if ($limit) {
                $query->limit((int) $limit);
            }

            $payments = $query->get();
        }

        $scanned = $payments->count();
        $updated = 0;
        $skipped = 0;
        $failed = 0;

        if ($payments->isEmpty()) {
            $this->info('No payments found that need backfilling.');

            return self::SUCCESS;
        }

        $this->info("Found {$payments->count()} payment(s) to process.");

        foreach ($payments as $payment) {
            $this->line("  Processing payment #{$payment->id} ({$payment->reference})...");

            if ($dryRun) {
                $this->line("    [DRY-RUN] Would attempt backfill.");
                $skipped++;
                continue;
            }

            $result = $backfillService->backfillStripePaymentReferences($payment);

            if ($result['success']) {
                $this->info("    ✓ Backfill succeeded.");
                $updated++;
            } else {
                $this->warn("    ✗ Backfill failed: {$result['reason']}");
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Scanned: {$scanned}");
        $this->info("Updated: {$updated}");
        $this->info("Skipped: {$skipped}");
        $this->info("Failed: {$failed}");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}