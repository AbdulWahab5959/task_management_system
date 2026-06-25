<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'description', 'price', 'currency', 'interval', 'features', 'limits', 'is_popular', 'sort_order']);

        return response()->json($plans);
    }
}
