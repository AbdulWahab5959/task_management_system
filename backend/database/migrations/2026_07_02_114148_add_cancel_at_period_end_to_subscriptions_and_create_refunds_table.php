<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add cancel_at_period_end to subscriptions if missing
        Schema::table('subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('subscriptions', 'cancel_at_period_end')) {
                $table->boolean('cancel_at_period_end')->default(false)->after('cancelled_at');
            }
        });

        // Add refund-related columns to payments if missing
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'provider_payment_intent_id')) {
                $table->string('provider_payment_intent_id')->nullable()->after('provider_payment_id');
            }
            if (!Schema::hasColumn('payments', 'provider_charge_id')) {
                $table->string('provider_charge_id')->nullable()->after('provider_payment_intent_id');
            }
            if (!Schema::hasColumn('payments', 'provider_invoice_id')) {
                $table->string('provider_invoice_id')->nullable()->after('provider_charge_id');
            }
            if (!Schema::hasColumn('payments', 'refunded_amount')) {
                $table->decimal('refunded_amount', 12, 2)->default(0)->after('provider_invoice_id');
            }
            if (!Schema::hasColumn('payments', 'refund_status')) {
                $table->string('refund_status')->nullable()->after('refunded_amount');
            }
        });

        // Create refunds table
        if (!Schema::hasTable('refunds')) {
            Schema::create('refunds', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('gateway')->default('stripe');
                $table->string('provider_refund_id')->nullable();
                $table->string('provider_payment_id')->nullable();
                $table->decimal('amount', 12, 2);
                $table->string('currency', 3)->default('USD');
                $table->string('status')->default('pending');
                $table->text('reason')->nullable();
                $table->json('raw_response')->nullable();
                $table->timestamp('refunded_at')->nullable();
                $table->timestamps();

                $table->index('payment_id');
                $table->index('provider_refund_id');
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');

        Schema::table('payments', function (Blueprint $table) {
            $columns = ['refund_status', 'refunded_amount', 'provider_invoice_id', 'provider_charge_id', 'provider_payment_intent_id'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('payments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            if (Schema::hasColumn('subscriptions', 'cancel_at_period_end')) {
                $table->dropColumn('cancel_at_period_end');
            }
        });
    }
};