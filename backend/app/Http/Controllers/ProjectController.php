<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    private const STATUSES = ['active', 'completed', 'archived'];

    public function index(Request $request): JsonResponse
    {
        $query = Project::query()
            ->withCount([
                'tasks as tasks_total',
                'tasks as tasks_completed' => fn ($tasks) => $tasks->where('status', 'done'),
            ])
            ->latest();

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.trim((string) $request->input('search')).'%');
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $projects = $query->paginate(min(max((int) $request->input('per_page', 12), 1), 50));

        return response()->json([
            'data' => collect($projects->items())->map(fn (Project $project) => $this->serializeProject($project))->values(),
            'meta' => [
                'current_page' => $projects->currentPage(),
                'last_page' => $projects->lastPage(),
                'per_page' => $projects->perPage(),
                'total' => $projects->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validated($request, true);
        $project = Project::create([...$validated, 'created_by' => $request->user()->id]);

        return response()->json(['data' => $this->serializeProject($project->loadCount('tasks'))], 201);
    }

    public function show(Request $request, int $project): JsonResponse
    {
        $record = Project::query()->withCount([
            'tasks as tasks_total',
            'tasks as tasks_completed' => fn ($tasks) => $tasks->where('status', 'done'),
        ])->findOrFail($project);
        $tasks = $record->tasks()->with(['project:id,name', 'section:id,name'])->latest()->limit(100)->get();
        $assignmentIds = $tasks->isEmpty() ? [] : DB::connection('tenant')->table('task_assignees')->whereIn('task_id', $tasks->pluck('id'))->get(['task_id', 'user_id'])->groupBy('task_id')->map(fn ($items) => $items->pluck('user_id')->map(fn ($id) => (int) $id)->all())->all();
        $users = $this->usersFor(array_merge([$record->created_by], $tasks->pluck('assigned_to')->filter()->all(), $tasks->pluck('created_by')->all(), collect($assignmentIds)->flatten()->all()));

        return response()->json([
            'data' => [
                ...$this->serializeProject($record, $users),
                'sections' => $record->sections()->withCount('tasks')->get()->map(fn ($section) => [
                    'id' => $section->id,
                    'project_id' => $section->project_id,
                    'name' => $section->name,
                    'position' => $section->position,
                    'tasks_total' => (int) $section->tasks_count,
                    'created_at' => $section->created_at?->toISOString(),
                    'updated_at' => $section->updated_at?->toISOString(),
                ])->values(),
                'tasks' => $tasks->map(fn ($task) => $this->serializeTask($task, $users, $assignmentIds[$task->id] ?? null))->values(),
            ],
        ]);
    }

    public function update(Request $request, int $project): JsonResponse
    {
        $record = Project::findOrFail($project);
        $record->fill($this->validated($request));
        $record->save();

        return response()->json(['data' => $this->serializeProject($record->loadCount('tasks'))]);
    }

    public function destroy(Request $request, int $project): JsonResponse
    {
        $record = Project::findOrFail($project);
        if ($record->status !== 'archived') {
            $record->update(['status' => 'archived']);
            return response()->json(['message' => 'Project archived.', 'data' => $this->serializeProject($record)]);
        }

        $record->delete();
        return response()->json(['message' => 'Project deleted.']);
    }

    private function validated(Request $request, bool $creating = false): array
    {
        return $request->validate([
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', self::STATUSES)],
            'start_date' => ['nullable', 'date', ...($creating ? ['after_or_equal:today'] : [])],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date', ...($creating ? ['after_or_equal:today'] : [])],
        ]);
    }

    private function usersFor(array $ids): array
    {
        return User::query()->whereIn('id', array_values(array_unique(array_filter($ids))))->get(['id', 'name', 'email'])->keyBy('id')->all();
    }

    private function serializeProject(Project $project, array $users = []): array
    {
        $total = (int) ($project->tasks_total ?? $project->tasks()->count());
        $completed = (int) ($project->tasks_completed ?? $project->tasks()->where('status', 'done')->count());

        return [
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'status' => $project->status,
            'start_date' => $project->start_date?->toDateString(),
            'due_date' => $project->due_date?->toDateString(),
            'created_by' => $project->created_by,
            'creator' => $users[$project->created_by] ?? null,
            'tasks_total' => $total,
            'tasks_completed' => $completed,
            'progress_percent' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
            'created_at' => $project->created_at?->toISOString(),
            'updated_at' => $project->updated_at?->toISOString(),
        ];
    }

    private function serializeTask($task, array $users, ?array $assignmentIds = null): array
    {
        $assignmentIds ??= $task->assigned_to === null ? [] : [(int) $task->assigned_to];
        return [
            'id' => $task->id,
            'project_id' => $task->project_id,
            'project_name' => $task->project?->name,
            'section_id' => $task->section_id,
            'section_name' => $task->section?->name,
            'parent_task_id' => $task->parent_task_id,
            'title' => $task->title,
            'description' => $task->description,
            'status' => $task->status,
            'priority' => $task->priority,
            'assigned_to' => $task->assigned_to,
            'assignee' => $users[$task->assigned_to] ?? null,
            'assignee_ids' => $assignmentIds,
            'assignees' => collect($assignmentIds)->map(fn (int $id) => $users[$id] ?? null)->filter()->values()->all(),
            'created_by' => $task->created_by,
            'creator' => $users[$task->created_by] ?? null,
            'start_date' => $task->start_date?->toDateString(),
            'due_date' => $task->due_date?->toDateString(),
            'completed_at' => $task->completed_at?->toISOString(),
            'created_at' => $task->created_at?->toISOString(),
            'updated_at' => $task->updated_at?->toISOString(),
        ];
    }
}
