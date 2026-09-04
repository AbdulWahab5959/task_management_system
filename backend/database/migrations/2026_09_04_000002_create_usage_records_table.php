<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usage_records', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('metric', 80);
            $table->date('period_start');
            $table->unsignedBigInteger('quantity')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'tenant_id', 'metric', 'period_start'], 'usage_records_scope_metric_period_unique');
            $table->index(['user_id', 'metric', 'period_start']);
            $table->index(['tenant_id', 'metric', 'period_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usage_records');
    }
};
