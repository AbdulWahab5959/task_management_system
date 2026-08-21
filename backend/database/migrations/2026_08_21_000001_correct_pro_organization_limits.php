<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['pro-monthly', 'pro-yearly'] as $slug) {
            $plan = DB::table('plans')->where('slug', $slug)->first(['id', 'limits']);
            if (! $plan) {
                continue;
            }

            $limits = json_decode((string) $plan->limits, true);
            if (! is_array($limits)) {
                continue;
            }

            $limits['organizations'] = 2;
            DB::table('plans')->where('id', $plan->id)->update([
                'limits' => json_encode($limits),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        foreach (['pro-monthly', 'pro-yearly'] as $slug) {
            $plan = DB::table('plans')->where('slug', $slug)->first(['id', 'limits']);
            if (! $plan) {
                continue;
            }

            $limits = json_decode((string) $plan->limits, true);
            if (! is_array($limits)) {
                continue;
            }

            $limits['organizations'] = 1;
            DB::table('plans')->where('id', $plan->id)->update([
                'limits' => json_encode($limits),
                'updated_at' => now(),
            ]);
        }
    }
};
