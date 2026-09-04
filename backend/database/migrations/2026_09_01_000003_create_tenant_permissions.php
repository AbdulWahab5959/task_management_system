<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('permissions', function (Blueprint $table) { $table->id(); $table->string('key')->unique(); $table->string('name'); $table->text('description'); $table->string('group'); $table->boolean('is_system')->default(true); $table->timestamps(); });
        Schema::create('tenant_user_permissions', function (Blueprint $table) { $table->id(); $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete(); $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete(); $table->boolean('granted')->default(true); $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); $table->unique(['tenant_id', 'user_id', 'permission_id']); $table->index(['tenant_id', 'user_id']); });
        foreach (config('permissions.registry', []) as $key => $meta) DB::table('permissions')->insert(['key' => $key, 'name' => $meta['name'], 'description' => $meta['description'], 'group' => $meta['group'], 'is_system' => true, 'created_at' => now(), 'updated_at' => now()]);
    }
    public function down(): void { Schema::dropIfExists('tenant_user_permissions'); Schema::dropIfExists('permissions'); }
};
