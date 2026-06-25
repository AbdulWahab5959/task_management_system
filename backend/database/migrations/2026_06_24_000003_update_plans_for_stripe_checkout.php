<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('plans')) {
            return;
        }

        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'amount')) {
                $table->decimal('amount', 12, 2)->default(0)->after('description');
            }

            if (! Schema::hasColumn('plans', 'amount_minor')) {
                $table->unsignedInteger('amount_minor')->default(0)->after('amount');
            }

            if (! Schema::hasColumn('plans', 'currency')) {
                $table->string('currency', 3)->default('USD')->after('amount_minor');
            }

            if (! Schema::hasColumn('plans', 'billing_interval')) {
                $table->string('billing_interval')->nullable()->after('currency');
            }

            if (! Schema::hasColumn('plans', 'stripe_price_id')) {
                $table->string('stripe_price_id')->nullable()->after('billing_interval');
            }

            if (! Schema::hasColumn('plans', 'metadata')) {
                $table->json('metadata')->nullable()->after('features');
            }
        });

        DB::table('plans')->orderBy('id')->chunkById(100, function ($plans): void {
            foreach ($plans as $plan) {
                $storedAmount = property_exists($plan, 'amount') && $plan->amount !== null
                    ? (float) $plan->amount
                    : 0.0;
                $legacyPrice = property_exists($plan, 'price') && $plan->price !== null
                    ? (float) $plan->price
                    : 0.0;
                $amount = $storedAmount > 0 ? $storedAmount : $legacyPrice;

                $amountMinor = property_exists($plan, 'amount_minor') && (int) $plan->amount_minor > 0
                    ? (int) $plan->amount_minor
                    : (int) round($amount * 100);

                DB::table('plans')
                    ->where('id', $plan->id)
                    ->update([
                        'amount' => $amount,
                        'amount_minor' => $amountMinor,
                        'currency' => strtoupper((string) ($plan->currency ?? 'USD')),
                        'billing_interval' => $plan->billing_interval ?? $plan->interval ?? null,
                        'stripe_price_id' => $plan->stripe_price_id ?? null,
                    ]);
            }
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->index('stripe_price_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('plans')) {
            return;
        }

        Schema::table('plans', function (Blueprint $table) {
            if (Schema::hasColumn('plans', 'stripe_price_id')) {
                $table->dropIndex(['stripe_price_id']);
            }

            foreach ([
                'metadata',
                'stripe_price_id',
                'billing_interval',
                'amount_minor',
                'amount',
            ] as $column) {
                if (Schema::hasColumn('plans', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
