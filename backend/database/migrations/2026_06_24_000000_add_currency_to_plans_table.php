<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('plans')) {
            return;
        }

        if (! Schema::hasColumn('plans', 'currency')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->string('currency', 3)->default('USD')->after('price');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('plans') || ! Schema::hasColumn('plans', 'currency')) {
            return;
        }

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }
};
