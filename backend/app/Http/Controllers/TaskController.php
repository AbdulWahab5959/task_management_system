<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    private const STATUSES = ['todo', 'in_progress', 'done'];
    private const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public function index(Request $request): JsonResponse
    {
        $query = Task::query()->with('project:id,name')->latest();
        $tenant = $this->tenant($request);
        $role = $request->user()->getRoleInTenant($tenant);
        if ($request->filled('project_id')) {
            Project::query()->findOrFail((int) $request->input('project_id'));
            $query->where('project_id', (int) $request->input('project_id'));
        }
        // Members must never receive the workspace-wide task feed. The server
        // owns this boundary even if a client omits or falsifies `mine`.
        if ($role === 'member' || $request->boolean('mine')) {
            $this->whereAssignedTo($query, $request->user()->id);
        }
        foreach (['status', 'priority'] as $filter) {
            if ($request->filled($filter)) $query->where($filter, $request->input($filter));
        }
        if ($request->filled('assigned_to')) $this->whereAssignedTo($query, (int) $request->input('assigned_to'));
        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.trim((string) $request->input('search')).'%');
        }

        $tasks = $query->paginate(min(max((int) $request->input('per_page', 15), 1), 50));
        $assignmentIds = $this->assignmentIdsFor(collect($tasks->items()));
        $users = $this->usersFor(collect($tasks->items())->flatMap(fn (Task $task) => [$task->assigned_to, $task->created_by, ...($assignmentIds[$task->id] ?? [])])->all());

        return response()->json([
            'data' => collect($tasks->items())->map(fn (Task $task) => $this->serialize($task, $users, $assignmentIds[$task->id] ?? null))->values(),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validated($request, true);
        $project = $this->project($validated['project_id']);
        $this->assertTaskDueDate($project, $validated['due_date'] ?? null);
        $assigneeIds = $this->requestedAssigneeIds($validated);
        $this->assertAssignees($request, $assigneeIds);
        unset($validated['assignee_ids']);
        $task = DB::connection('tenant')->transaction(function () use ($validated, $request, $assigneeIds): Task {
            $task = Task::create([...$validated, 'assigned_to' => $assigneeIds[0] ?? null, 'created_by' => $request->user()->id]);
            $this->syncAssignees($task, $assigneeIds, $request->user()->id);
            return $task;
        });

        return response()->json(['data' => $this->serialize($task->load('project:id,name'), $this->usersFor([$task->created_by, ...$assigneeIds]), $assigneeIds)], 201);
    }

    public function show(Request $request, int $task): JsonResponse
    {
        $record = Task::query()->with('project:id,name')->findOrFail($task);
        $assignmentIds = $this->assignmentIdsFor(collect([$record]));
        return response()->json(['data' => $this->serialize($record, $this->usersFor([$record->created_by, $record->assigned_to, ...($assignmentIds[$record->id] ?? [])]), $assignmentIds[$record->id] ?? null)]);
    }

    public function update(Request $request, int $task): JsonResponse
    {
        $record = Task::findOrFail($task);
        $this->assertMemberCanEdit($request, $record);
        $validated = $this->validated($request, false);
        $project = array_key_exists('project_id', $validated) ? $this->project($validated['project_id']) : $record->project;
        $this->assertTaskDueDate($project, $validated['due_date'] ?? null);
        $hasAssignments = array_key_exists('assignee_ids', $validated) || array_key_exists('assigned_to', $validated);
        $assigneeIds = $hasAssignments ? $this->requestedAssigneeIds($validated) : $this->taskAssigneeIds($record);
        $this->assertAssignees($request, $assigneeIds);
        unset($validated['assignee_ids']);
        $record->fill($validated);
        $record->assigned_to = $assigneeIds[0] ?? null;
        if (($validated['status'] ?? $record->status) === 'done' && $record->completed_at === null) $record->completed_at = now();
        if (($validated['status'] ?? $record->status) !== 'done') $record->completed_at = null;
        $record->save();
        if ($hasAssignments) $this->syncAssignees($record, $assigneeIds, $request->user()->id);

        $fresh = $record->fresh()->load('project:id,name');
        return response()->json(['data' => $this->serialize($fresh, $this->usersFor([$fresh->created_by, ...$assigneeIds]), $assigneeIds)]);
    }

    public function destroy(Request $request, int $task): JsonResponse
    {
        $record = Task::findOrFail($task);
        $this->assertMemberCanEdit($request, $record);
        $record->delete();
        return response()->json(['message' => 'Task deleted.']);
    }

    private function validated(Request $request, bool $creating): array
    {
        return $request->validate([
            'project_id' => [$creating ? 'required' : 'sometimes', 'integer'],
            'title' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', self::STATUSES)],
            'priority' => ['sometimes', 'string', 'in:'.implode(',', self::PRIORITIES)],
            'assigned_to' => ['sometimes', 'nullable', 'integer'],
            'assignee_ids' => ['sometimes', 'array', 'max:25'],
            'assignee_ids.*' => ['integer', 'distinct'],
            'due_date' => ['sometimes', 'nullable', 'date', ...($creating ? ['after_or_equal:today'] : [])],
        ]);
    }

    private function project(int $id): Project
    {
        return Project::query()->findOrFail($id);
    }

    private function assertTaskDueDate(Project $project, ?string $dueDate): void
    {
        if ($dueDate !== null && $project->due_date !== null && $dueDate > $project->due_date->toDateString()) {
            throw ValidationException::withMessages([
                'due_date' => 'The task due date cannot be later than the project due date of '.$project->due_date->toDateString().'.',
            ]);
        }
    }

    private function tenant(Request $request): Tenant
    {
        return $request->attributes->get('tenant') ?? abort(404, 'Tenant not found.');
    }

    private function requestedAssigneeIds(array $validated): array
    {
        if (array_key_exists('assignee_ids', $validated)) return array_values(array_unique(array_map('intval', $validated['assignee_ids'] ?? [])));
        return array_key_exists('assigned_to', $validated) && $validated['assigned_to'] !== null ? [(int) $validated['assigned_to']] : [];
    }

    private function assertAssignees(Request $request, array $userIds): void
    {
        if ($userIds === []) return;
        $actor = $request->user();
        if ($actor->getRoleInTenant($this->tenant($request)) === 'member' && (count($userIds) > 1 || $userIds[0] !== $actor->id)) {
            abort(403, 'Members can only assign tasks to themselves.');
        }
        $activeIds = $this->tenant($request)->users()->whereIn('users.id', $userIds)->pluck('users.id')->map(fn ($id) => (int) $id)->all();
        if (count($activeIds) !== count($userIds)) {
            abort(422, 'The assignee must be an active member of this organization.');
        }
    }

    private function assertMemberCanEdit(Request $request, Task $task): void
    {
        $role = $request->user()->getRoleInTenant($this->tenant($request));
        if ($role === 'member' && !in_array($request->user()->id, $this->taskAssigneeIds($task), true) && $task->created_by !== $request->user()->id) {
            abort(403, 'Members can only update their own assigned tasks.');
        }
    }

    private function usersFor(array $ids): array
    {
        return User::query()->whereIn('id', array_values(array_unique(array_filter($ids))))->get(['id', 'name', 'email'])->keyBy('id')->all();
    }

    private function whereAssignedTo($query, int $userId): void
    {
        $query->where(function ($nested) use ($userId): void {
            $nested->where('assigned_to', $userId)->orWhereExists(fn ($exists) => $exists->from('task_assignees')->whereColumn('task_assignees.task_id', 'tasks.id')->where('task_assignees.user_id', $userId));
        });
    }

    private function taskAssigneeIds(Task $task): array
    {
        $ids = DB::connection('tenant')->table('task_assignees')->where('task_id', $task->id)->pluck('user_id')->map(fn ($id) => (int) $id)->all();
        return $ids ?: ($task->assigned_to === null ? [] : [(int) $task->assigned_to]);
    }

    private function assignmentIdsFor($tasks): array
    {
        $items = $tasks instanceof \Illuminate\Support\Collection ? $tasks : collect($tasks);
        $ids = $items->pluck('id')->all();
        $assignments = $ids === [] ? collect() : DB::connection('tenant')->table('task_assignees')->whereIn('task_id', $ids)->get(['task_id', 'user_id'])->groupBy('task_id');
        return $items->mapWithKeys(fn (Task $task) => [$task->id => ($assignments->get($task->id)?->pluck('user_id')->map(fn ($id) => (int) $id)->all() ?: ($task->assigned_to === null ? [] : [(int) $task->assigned_to]))])->all();
    }

    private function syncAssignees(Task $task, array $userIds, int $assignedBy): void
    {
        $table = DB::connection('tenant')->table('task_assignees');
        $table->where('task_id', $task->id)->delete();
        if ($userIds !== []) $table->insert(array_map(fn (int $userId) => ['task_id' => $task->id, 'user_id' => $userId, 'assigned_by' => $assignedBy, 'created_at' => now(), 'updated_at' => now()], $userIds));
    }

    private function serialize(Task $task, array $users, ?array $assignmentIds = null): array
    {
        $assignmentIds ??= $this->taskAssigneeIds($task);
        return [
            'id' => $task->id,
            'project_id' => $task->project_id,
            'project_name' => $task->project?->name,
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
            'due_date' => $task->due_date?->toDateString(),
            'completed_at' => $task->completed_at?->toISOString(),
            'created_at' => $task->created_at?->toISOString(),
            'updated_at' => $task->updated_at?->toISOString(),
        ];
    }
}
