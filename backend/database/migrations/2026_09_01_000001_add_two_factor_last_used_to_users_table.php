<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'two_factor_last_used_timecode')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('two_factor_last_used_timecode')->nullable()->after('two_factor_confirmed_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'two_factor_last_used_timecode')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('two_factor_last_used_timecode');
            });
        }
    }
};
