<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // Add gateway column if it doesn't exist
            if (!Schema::hasColumn('subscriptions', 'gateway')) {
                $table->string('gateway')->nullable()->after('plan_id');
            }
            
            // Add gateway_subscription_id column if it doesn't exist
            if (!Schema::hasColumn('subscriptions', 'gateway_subscription_id')) {
                $table->string('gateway_subscription_id')->nullable()->after('gateway');
            }
            
            // Add missing timestamps
            if (!Schema::hasColumn('subscriptions', 'starts_at')) {
                $table->timestamp('starts_at')->nullable()->after('gateway_subscription_id');
            }
            
            if (!Schema::hasColumn('subscriptions', 'ends_at')) {
                $table->timestamp('ends_at')->nullable()->after('starts_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'gateway',
                'gateway_subscription_id',
                'starts_at',
                'ends_at',
            ]);
        });
    }
};
