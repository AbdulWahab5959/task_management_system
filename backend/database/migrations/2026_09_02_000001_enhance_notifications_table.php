<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('category')->default('product')->after('type');
            $table->string('severity')->default('info')->after('category');
            $table->string('action_key')->nullable()->after('message');
            $table->string('action_url')->nullable()->after('action_key');
            $table->foreignId('tenant_id')->nullable()->after('user_id')->constrained('tenants')->nullOnDelete();
            $table->boolean('mandatory')->default(false)->after('data');
            $table->string('dedupe_key')->nullable()->after('mandatory');
            $table->timestamp('delivered_at')->nullable()->after('read_at');
            $table->timestamp('expires_at')->nullable()->after('delivered_at');
            $table->index(['user_id', 'category', 'created_at']);
            $table->index(['tenant_id', 'user_id']);
            $table->unique(['user_id', 'dedupe_key']);
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'dedupe_key']);
            $table->dropForeign(['tenant_id']);
            $table->dropIndex(['user_id', 'category', 'created_at']);
            $table->dropIndex(['tenant_id', 'user_id']);
            $table->dropColumn(['category', 'severity', 'action_key', 'action_url', 'tenant_id', 'mandatory', 'dedupe_key', 'delivered_at', 'expires_at']);
        });
    }
};
