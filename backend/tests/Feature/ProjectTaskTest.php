<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Tenant;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProjectTaskTest extends TestCase
{
    use RefreshDatabase;

    private array $tenantDatabasePaths = [];

    protected function tearDown(): void
    {
        DB::purge('tenant');
        foreach ($this->tenantDatabasePaths as $path) {
            if (file_exists($path)) @unlink($path);
        }
        parent::tearDown();
    }

    public function test_owner_can_create_project_and_member_can_read_it(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner', 'Workspace A');
        $tenant->users()->attach($member->id, ['role' => 'member']);

        $created = $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/projects', [
            'name' => 'Website Redesign',
            'description' => 'Refresh the public site.',
            'due_date' => '2026-10-20',
        ])->assertCreated()->json('data');

        $this->actingAs($member, 'sanctum')->withTenant($tenant)
            ->getJson('/api/tenant/projects/'.$created['id'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Website Redesign');
    }

    public function test_new_project_dates_cannot_be_in_the_past(): void
    {
        $owner = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects', [
                'name' => 'Future Project',
                'start_date' => now()->subDay()->toDateString(),
                'due_date' => now()->subDay()->toDateString(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['start_date', 'due_date']);

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects', [
                'name' => 'Valid Future Project',
                'start_date' => now()->toDateString(),
                'due_date' => now()->addDay()->toDateString(),
            ])
            ->assertCreated();
    }

    public function test_task_due_date_cannot_exceed_project_due_date(): void
    {
        $owner = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $project = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects', ['name' => 'Bounded Project', 'due_date' => '2026-09-30'])
            ->assertCreated()->json('data');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/tasks', ['project_id' => $project['id'], 'title' => 'Too late', 'due_date' => '2026-10-01'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['due_date']);
    }

    public function test_task_supports_multiple_active_assignees_and_legacy_primary_assignee(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $admin = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $tenant->users()->attach($admin->id, ['role' => 'admin']);
        $project = $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/projects', ['name' => 'Shared Work'])->json('data');

        $task = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/tasks', ['project_id' => $project['id'], 'title' => 'Shared task', 'assignee_ids' => [$member->id, $admin->id]])
            ->assertCreated()
            ->assertJsonCount(2, 'data.assignee_ids')
            ->assertJsonPath('data.assigned_to', $member->id)
            ->json('data');

        $this->assertSame([$member->id, $admin->id], $task['assignee_ids']);
        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->putJson('/api/tenant/tasks/'.$task['id'], ['assignee_ids' => [$admin->id]])
            ->assertOk()
            ->assertJsonPath('data.assignee_ids.0', $admin->id)
            ->assertJsonPath('data.assigned_to', $admin->id);
    }

    public function test_member_cannot_create_or_delete_projects(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $project = $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/projects', ['name' => 'Internal CRM'])->json('data');

        $this->actingAs($member, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects', ['name' => 'Not allowed'])
            ->assertForbidden();

        $this->actingAs($member, 'sanctum')->withTenant($tenant)
            ->deleteJson('/api/tenant/projects/'.$project['id'])
            ->assertForbidden();
    }

    public function test_task_assignment_requires_active_membership_and_cross_tenant_access_is_blocked(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $outsider = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner', 'Workspace A');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $otherTenant = $this->createTenant($outsider, 'owner', 'Workspace B');
        $project = $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/projects', ['name' => 'Secure Project'])->json('data');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/tasks', ['project_id' => $project['id'], 'title' => 'Assign me', 'assigned_to' => $member->id])
            ->assertCreated();

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/tasks', ['project_id' => $project['id'], 'title' => 'Foreign assignee', 'assigned_to' => $outsider->id])
            ->assertStatus(422);

        $this->actingAs($outsider, 'sanctum')->withTenant($otherTenant)
            ->getJson('/api/tenant/projects/'.$project['id'])
            ->assertNotFound();

        $this->actingAs($owner, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $otherTenant->id)
            ->getJson('/api/tenant/projects/'.$project['id'])
            ->assertForbidden();
    }

    public function test_member_can_update_assigned_task_and_owner_can_archive_project(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $project = $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/projects', ['name' => 'Delivery'])->json('data');
        $task = $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/tasks', ['project_id' => $project['id'], 'title' => 'Ship release', 'assigned_to' => $member->id])->json('data');

        $this->actingAs($member, 'sanctum')->withTenant($tenant)
            ->putJson('/api/tenant/tasks/'.$task['id'], ['status' => 'done'])
            ->assertOk()
            ->assertJsonPath('data.completed_at', fn ($value) => is_string($value));

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->deleteJson('/api/tenant/projects/'.$project['id'])
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');
    }

    public function test_member_task_feed_only_returns_tasks_assigned_to_that_member(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $otherMember = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $tenant->users()->attach($member->id, ['role' => 'member']);
        $tenant->users()->attach($otherMember->id, ['role' => 'member']);
        $project = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects', ['name' => 'Member feed'])->json('data');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/tasks', [
            'project_id' => $project['id'], 'title' => 'For this member', 'assigned_to' => $member->id,
        ])->assertCreated();
        $this->actingAs($owner, 'sanctum')->withTenant($tenant)->postJson('/api/tenant/tasks', [
            'project_id' => $project['id'], 'title' => 'For another member', 'assigned_to' => $otherMember->id,
        ])->assertCreated();

        $this->actingAs($member, 'sanctum')->withTenant($tenant)
            ->getJson('/api/tenant/tasks')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'For this member');
    }

    public function test_project_sections_and_subtasks_stay_scoped_to_their_project(): void
    {
        $owner = User::factory()->create();
        $tenant = $this->createTenant($owner, 'owner');
        $project = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects', ['name' => 'Website Redesign'])
            ->assertCreated()->json('data');
        $otherProject = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects', ['name' => 'Mobile App'])
            ->assertCreated()->json('data');

        $section = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects/'.$project['id'].'/sections', ['name' => 'Planning'])
            ->assertCreated()->json('data');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->putJson('/api/tenant/projects/'.$project['id'].'/sections/'.$section['id'], ['name' => 'Discovery'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Discovery');

        $secondSection = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/projects/'.$project['id'].'/sections', ['name' => 'Build'])
            ->assertCreated()->json('data');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->putJson('/api/tenant/projects/'.$project['id'].'/sections/'.$secondSection['id'].'/move', ['direction' => 'up'])
            ->assertOk();
        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->getJson('/api/tenant/projects/'.$project['id'].'/sections')
            ->assertOk()
            ->assertJsonPath('data.0.id', $secondSection['id']);

        $task = $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/tasks', [
                'project_id' => $project['id'],
                'section_id' => $section['id'],
                'title' => 'Confirm requirements',
                'start_date' => '2026-10-01',
                'due_date' => '2026-10-02',
            ])->assertCreated()
            ->assertJsonPath('data.section_name', 'Discovery')
            ->json('data');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/tasks', [
                'project_id' => $project['id'],
                'section_id' => $section['id'],
                'parent_task_id' => $task['id'],
                'title' => 'Review stakeholder notes',
            ])->assertCreated()
            ->assertJsonPath('data.parent_task_id', $task['id']);

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->getJson('/api/tenant/tasks/'.$task['id'])
            ->assertOk()
            ->assertJsonPath('data.subtasks.0.title', 'Review stakeholder notes');

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->getJson('/api/tenant/projects/'.$project['id'])
            ->assertOk()
            ->assertJsonPath('data.sections.1.name', 'Discovery')
            ->assertJsonPath('data.tasks.0.section_id', $section['id']);

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->deleteJson('/api/tenant/projects/'.$project['id'].'/sections/'.$section['id'])
            ->assertStatus(422);

        $this->actingAs($owner, 'sanctum')->withTenant($tenant)
            ->postJson('/api/tenant/tasks', ['project_id' => $otherProject['id'], 'section_id' => $section['id'], 'title' => 'Cross-project section'])
            ->assertNotFound();
    }

    private function withTenant(Tenant $tenant): static
    {
        return $this->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    private function createTenant(User $owner, string $role, string $name = 'Acme Workspace'): Tenant
    {
        $tenant = Tenant::create([
            'name' => $name,
            'slug' => 'tenant-'.uniqid(),
            'database_name' => 'tenant_'.uniqid(),
            'owner_id' => $owner->id,
            'status' => 'active',
        ]);
        $tenant->users()->attach($owner->id, ['role' => $role]);
        $path = database_path($tenant->database_name.'.sqlite');
        touch($path);
        $this->tenantDatabasePaths[] = $path;
        $tenant->configure();
        Artisan::call('migrate', ['--database' => 'tenant', '--path' => 'database/migrations/tenant', '--force' => true]);
        return $tenant;
    }
}
