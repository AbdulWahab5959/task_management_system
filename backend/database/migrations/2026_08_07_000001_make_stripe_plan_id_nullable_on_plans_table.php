<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('plans') || ! Schema::hasColumn('plans', 'stripe_plan_id')) {
            return;
        }

        Schema::table('plans', function (Blueprint $table) {
            $table->string('stripe_plan_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('plans') || ! Schema::hasColumn('plans', 'stripe_plan_id')) {
            return;
        }

        Schema::table('plans', function (Blueprint $table) {
            $table->string('stripe_plan_id')->nullable(false)->change();
        });
    }
};
