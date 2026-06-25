<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments')) {
            return;
        }

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->string('gateway')->default('stripe');
            $table->string('reference')->unique();
            $table->string('provider_session_id')->nullable();
            $table->string('provider_payment_id')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status')->default('pending');
            $table->text('checkout_url')->nullable();
            $table->text('failure_reason')->nullable();
            $table->text('raw_provider_status')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('gateway');
            $table->index('status');
            $table->index('provider_session_id');
            $table->index('provider_payment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
