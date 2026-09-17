<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectSectionController extends Controller
{
    public function index(int $project): JsonResponse
    {
        $record = Project::findOrFail($project);

        return response()->json([
            'data' => $record->sections()->withCount('tasks')->get()->map(fn (ProjectSection $section) => $this->serialize($section))->values(),
        ]);
    }

    public function store(Request $request, int $project): JsonResponse
    {
        $record = Project::findOrFail($project);
        $validated = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $position = ((int) $record->sections()->max('position')) + 1;
        $section = $record->sections()->create([...$validated, 'position' => $position]);

        return response()->json(['data' => $this->serialize($section)], 201);
    }

    public function update(Request $request, int $project, int $section): JsonResponse
    {
        $record = Project::findOrFail($project);
        $section = $record->sections()->findOrFail($section);
        $section->update($request->validate(['name' => ['required', 'string', 'max:120']]));

        return response()->json(['data' => $this->serialize($section)]);
    }

    public function move(Request $request, int $project, int $section): JsonResponse
    {
        $record = Project::findOrFail($project);
        $section = $record->sections()->findOrFail($section);
        $direction = $request->validate(['direction' => ['required', 'in:up,down']])['direction'];
        $neighborQuery = $record->sections()->whereKeyNot($section->id);
        $neighbor = $direction === 'up'
            ? $neighborQuery->where('position', '<', $section->position)->orderByDesc('position')->first()
            : $neighborQuery->where('position', '>', $section->position)->orderBy('position')->first();

        if ($neighbor === null) return response()->json(['data' => $this->serialize($section)]);

        DB::connection('tenant')->transaction(function () use ($section, $neighbor): void {
            $position = $section->position;
            $section->update(['position' => $neighbor->position]);
            $neighbor->update(['position' => $position]);
        });

        return response()->json(['data' => $this->serialize($section->fresh())]);
    }

    public function destroy(int $project, int $section): JsonResponse
    {
        $record = Project::findOrFail($project);
        $section = $record->sections()->findOrFail($section);
        if ($section->tasks()->exists()) {
            throw ValidationException::withMessages(['section' => 'Move or delete the tasks in this section before deleting it.']);
        }
        $section->delete();

        return response()->json(['message' => 'Section deleted.']);
    }

    private function serialize(ProjectSection $section): array
    {
        return [
            'id' => $section->id,
            'project_id' => $section->project_id,
            'name' => $section->name,
            'position' => $section->position,
            'tasks_total' => (int) ($section->tasks_count ?? $section->tasks()->count()),
            'created_at' => $section->created_at?->toISOString(),
            'updated_at' => $section->updated_at?->toISOString(),
        ];
    }
}
