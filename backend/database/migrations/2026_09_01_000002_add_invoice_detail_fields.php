<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('invoices')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table): void {
            if (! Schema::hasColumn('invoices', 'invoice_date')) {
                $table->timestamp('invoice_date')->nullable()->after('status');
            }
            if (! Schema::hasColumn('invoices', 'billing_period_start')) {
                $table->timestamp('billing_period_start')->nullable()->after('invoice_date');
            }
            if (! Schema::hasColumn('invoices', 'billing_period_end')) {
                $table->timestamp('billing_period_end')->nullable()->after('billing_period_start');
            }
            if (! Schema::hasColumn('invoices', 'payment_reference')) {
                $table->string('payment_reference', 255)->nullable()->after('invoice_pdf');
            }
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->index(['status', 'invoice_date']);
            $table->index(['subscription_id', 'invoice_date']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('invoices')) {
            return;
        }

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropIndex('invoices_status_invoice_date_index');
            $table->dropIndex('invoices_subscription_id_invoice_date_index');
            foreach (['invoice_date', 'billing_period_start', 'billing_period_end', 'payment_reference'] as $column) {
                if (Schema::hasColumn('invoices', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
