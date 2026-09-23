import type { Task } from '../types/project.types';

/**
 * Mirrors the tenant capability contract in `backend/config/permissions.php` and
 * `App\Services\TenantPermissionService`.
 *
 * This only decides which controls the dashboard renders. The backend still
 * authorizes every request through the `permission:*` route middleware plus the
 * member-scoped checks in `TaskController`, so a stale or tampered payload can
 * never grant access.
 */
export interface TenantCapabilityContext {
  role?: string | null;
  permissions?: string[] | null;
}

function isWorkspaceManager(context: TenantCapabilityContext | null | undefined) {
  return context?.role === 'owner' || context?.role === 'admin';
}

/**
 * Owners resolve to every registry key. The admin and member roles receive their
 * capability list from `TenantPermissionService::permissionsFor`, so the payload
 * check covers them. The admin shortcut matches that role's configured keys,
 * which include every `tasks.*` key used by the helpers below.
 */
export function tenantCan(context: TenantCapabilityContext | null | undefined, permission: string) {
  if (!context) return false;
  return isWorkspaceManager(context) || Boolean(context.permissions?.includes(permission));
}

export function canCreateTask(context: TenantCapabilityContext | null | undefined) {
  return tenantCan(context, 'tasks.create');
}

export function canDeleteTask(context: TenantCapabilityContext | null | undefined) {
  return tenantCan(context, 'tasks.delete');
}

/**
 * `TaskController::assertMemberCanEdit` restricts member-role users to tasks they
 * are assigned to or created; owners and admins bypass that restriction.
 */
export function canUpdateTask(
  context: TenantCapabilityContext | null | undefined,
  task: Pick<Task, 'created_by' | 'assignee_ids'>,
  userId: number | null | undefined,
) {
  if (!tenantCan(context, 'tasks.update')) return false;
  if (context?.role !== 'member') return true;
  if (userId === null || userId === undefined) return false;
  return task.created_by === userId || task.assignee_ids.includes(userId);
}