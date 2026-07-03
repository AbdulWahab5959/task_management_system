<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            if (! Schema::hasColumn('payments', 'gateway_subscription_id')) {
                $table->string('gateway_subscription_id')->nullable()->after('provider_session_id');
                $table->index('gateway_subscription_id');
            }

            if (! Schema::hasColumn('payments', 'provider_payment_intent_id')) {
                $table->string('provider_payment_intent_id')->nullable()->after('provider_payment_id');
            }

            if (! Schema::hasColumn('payments', 'provider_charge_id')) {
                $table->string('provider_charge_id')->nullable()->after('provider_payment_intent_id');
            }

            if (! Schema::hasColumn('payments', 'provider_invoice_id')) {
                $table->string('provider_invoice_id')->nullable()->after('provider_charge_id');
            }

            if (! Schema::hasColumn('payments', 'refunded_amount')) {
                $table->decimal('refunded_amount', 12, 2)->default(0)->after('provider_invoice_id');
            }

            if (! Schema::hasColumn('payments', 'refund_status')) {
                $table->string('refund_status')->nullable()->after('refunded_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            foreach (['refund_status', 'refunded_amount', 'provider_invoice_id', 'provider_charge_id', 'provider_payment_intent_id', 'gateway_subscription_id'] as $column) {
                if (Schema::hasColumn('payments', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
