import { q1 } from './db';
import { can, canAny, type User } from './auth';

/**
 * Record-level authorisation. Each scope function returns a SQL condition for the given table alias and pushes any
 * parameters it needs. Every list, count, chart, search and download query goes through these, so a user can only
 * ever read rows they are explicitly allowed to see. Navigation hiding is never the only barrier.
 */
type Params = unknown[];
const all = (u: User, perm: string) => u.isOwner || u.perms.includes(perm);

export function projectScope(u: User, a: string, p: Params): string {
  if (all(u, 'project.view_all')) return 'TRUE';
  if (!u.perms.includes('project.view_assigned')) return 'FALSE';
  p.push(u.id);
  return `EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ${a}.id AND pm.user_id = $${p.length})`;
}

export function taskScope(u: User, a: string, p: Params): string {
  if (all(u, 'task.view_all')) return 'TRUE';
  const parts: string[] = [];
  if (u.perms.includes('task.view_assigned')) parts.push(`EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = ${a}.id AND ta.user_id = {ME})`);
  if (u.perms.includes('task.create')) parts.push(`${a}.created_by = {ME}`);
  // Project managers can see the tasks of the projects they manage.
  if (u.perms.includes('task.assign')) parts.push(`EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ${a}.project_id AND pm.user_id = {ME} AND pm.role = 'manager')`);
  if (parts.length === 0) return 'FALSE';
  p.push(u.id); // only bind the parameter when the condition actually uses it
  return `(${parts.join(' OR ').replaceAll('{ME}', `$${p.length}`)})`;
}

export function clientScope(u: User, a: string, p: Params): string {
  if (all(u, 'client.view_all')) return 'TRUE';
  if (!canAny(u, ['client.view_assigned', 'client.create'])) return 'FALSE';
  p.push(u.id);
  return `(${a}.created_by = $${p.length} OR EXISTS (SELECT 1 FROM client_access ca WHERE ca.client_id = ${a}.id AND ca.user_id = $${p.length}))`;
}

export function docScope(u: User, a: string, p: Params): string {
  if (all(u, 'fin.view_all_documents')) return 'TRUE';
  if (!canAny(u, ['fin.view', 'client.view_docs', 'client.create_docs', 'fin.quote_create', 'fin.invoice_create', 'client.gen_quote', 'client.gen_invoice'])) return 'FALSE';
  p.push(u.id);
  const me = `$${p.length}`;
  const parts = [`${a}.created_by = ${me}`, `EXISTS (SELECT 1 FROM client_access ca WHERE ca.client_id = ${a}.client_id AND ca.user_id = ${me})`];
  if (u.perms.includes('client.view_docs')) parts.push(`EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ${a}.project_id AND pm.user_id = ${me})`);
  return `(${parts.join(' OR ')})`;
}

async function visible(table: string, scope: (u: User, a: string, p: Params) => string, u: User, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const p: Params = [id];
  const cond = scope(u, 't', p);
  return Boolean(await q1(`SELECT 1 AS ok FROM ${table} t WHERE t.id = $1 AND ${cond}`, p));
}
export const canViewProject = (u: User, id: string) => visible('projects', projectScope, u, id);
export const canViewTask = (u: User, id: string) => visible('tasks', taskScope, u, id);
export const canViewClient = (u: User, id: string) => visible('clients', clientScope, u, id);
export const canViewDoc = (u: User, id: string) => visible('documents', docScope, u, id);

export const canSeeBudget = (u: User) => can(u, 'project.view_budget') || can(u, 'fin.view_budgets');
export const canSeeContact = (u: User) => can(u, 'client.view_contact');

/** Is this user an assignee of the task? (needed so "update progress" only applies to their own work) */
export async function isAssignee(u: User, taskId: string) {
  return Boolean(await q1(`SELECT 1 AS ok FROM task_assignees WHERE task_id = $1 AND user_id = $2`, [taskId, u.id]));
}
export async function isProjectManager(u: User, projectId: string | null) {
  if (!projectId) return false;
  return Boolean(await q1(`SELECT 1 AS ok FROM project_members WHERE project_id = $1 AND user_id = $2 AND role = 'manager'`, [projectId, u.id]));
}
