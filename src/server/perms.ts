// Permission catalogue. Pure module (no imports) so it can be used in server code, client UI and tests.
// Nobody receives a permission through a job title: every key below is granted individually by an administrator.

export interface PermDef { key: string; label: string; hint?: string }
export interface PermGroup { id: string; label: string; perms: PermDef[] }

export const PERM_GROUPS: PermGroup[] = [
  { id: 'projects', label: 'Projects', perms: [
    { key: 'project.view_assigned', label: 'View assigned projects' },
    { key: 'project.view_details', label: 'View project details' },
    { key: 'project.edit', label: 'Edit permitted project information' },
    { key: 'project.view_budget', label: 'View project budgets', hint: 'Confidential' },
    { key: 'project.upload_files', label: 'Upload project files' },
    { key: 'project.view_files', label: 'Access drawings and images' },
    { key: 'project.milestones', label: 'Manage milestones' },
    { key: 'project.reports', label: 'View project reports' },
    { key: 'project.approve', label: 'Approve project work' },
    { key: 'project.updates', label: 'Post project progress updates' },
    { key: 'project.view_all', label: 'See every project', hint: 'Administrative scope' },
  ] },
  { id: 'tasks', label: 'Tasks', perms: [
    { key: 'task.view_assigned', label: 'View assigned tasks' },
    { key: 'task.update_progress', label: 'Update task progress' },
    { key: 'task.change_status', label: 'Change task status' },
    { key: 'task.comment', label: 'Add comments' },
    { key: 'task.upload', label: 'Upload completed work' },
    { key: 'task.create', label: 'Create tasks' },
    { key: 'task.assign', label: 'Assign tasks' },
    { key: 'task.reassign', label: 'Reassign tasks' },
    { key: 'task.deadline', label: 'Set deadlines' },
    { key: 'task.approve', label: 'Approve submitted work' },
    { key: 'task.request_revision', label: 'Request revisions' },
    { key: 'task.view_all', label: 'See every task', hint: 'Administrative scope' },
  ] },
  { id: 'hr', label: 'Employees and HR', perms: [
    { key: 'hr.view_profiles', label: 'View permitted employee profiles' },
    { key: 'hr.create_employee', label: 'Create employee accounts' },
    { key: 'hr.edit_employee', label: 'Edit employee details' },
    { key: 'hr.deactivate', label: 'Deactivate employee accounts' },
    { key: 'hr.view_salary', label: 'View salary records', hint: 'Confidential' },
    { key: 'hr.enter_salary', label: 'Enter salary information', hint: 'Confidential' },
    { key: 'hr.edit_salary', label: 'Edit salary records', hint: 'Confidential' },
    { key: 'hr.view_payroll', label: 'View payroll summaries', hint: 'Confidential' },
    { key: 'hr.approve_payroll', label: 'Approve payroll', hint: 'Confidential' },
    { key: 'hr.attendance_view', label: 'View attendance and leave of all staff' },
    { key: 'hr.attendance_edit', label: 'Correct attendance and set fingerprint IDs' },
    { key: 'hr.leave_approve', label: 'Approve or reject leave requests' },
  ] },
  { id: 'finance', label: 'Finance', perms: [
    { key: 'fin.view', label: 'View authorised financial records' },
    { key: 'fin.view_budgets', label: 'View project budgets' },
    { key: 'fin.expense_enter', label: 'Enter expenses' },
    { key: 'fin.expense_edit', label: 'Edit expense records' },
    { key: 'fin.expense_approve', label: 'Approve expenses' },
    { key: 'fin.view_revenue', label: 'View revenue reports' },
    { key: 'fin.view_profit', label: 'View profit reports' },
    { key: 'fin.quote_create', label: 'Create quotations' },
    { key: 'fin.quote_edit', label: 'Edit quotations' },
    { key: 'fin.quote_approve', label: 'Approve quotations' },
    { key: 'fin.invoice_create', label: 'Create invoices' },
    { key: 'fin.invoice_edit', label: 'Edit invoices' },
    { key: 'fin.invoice_approve', label: 'Approve invoices' },
    { key: 'fin.view_payments', label: 'View payment records' },
    { key: 'fin.record_payment', label: 'Record payments' },
    { key: 'fin.view_all_documents', label: 'See every document', hint: 'Administrative scope' },
  ] },
  { id: 'clients', label: 'Clients', perms: [
    { key: 'client.view_assigned', label: 'View assigned clients' },
    { key: 'client.view_contact', label: 'View permitted contact details' },
    { key: 'client.edit', label: 'Edit permitted client information' },
    { key: 'client.create', label: 'Create clients' },
    { key: 'client.view_docs', label: 'View assigned project documents' },
    { key: 'client.create_docs', label: 'Create client documents' },
    { key: 'client.gen_quote', label: 'Generate quotations' },
    { key: 'client.gen_invoice', label: 'Generate invoices' },
    { key: 'client.download_docs', label: 'Download authorised documents' },
    { key: 'client.view_all', label: 'See every client', hint: 'Administrative scope' },
  ] },
  { id: 'cms', label: 'Website CMS', perms: [
    { key: 'cms.edit_text', label: 'Edit website text' },
    { key: 'cms.upload_images', label: 'Upload images' },
    { key: 'cms.replace_images', label: 'Replace images' },
    { key: 'cms.portfolio', label: 'Manage portfolio entries' },
    { key: 'cms.fonts', label: 'Change approved fonts' },
    { key: 'cms.design', label: 'Edit supported design settings' },
    { key: 'cms.preview', label: 'Preview website changes' },
    { key: 'cms.publish', label: 'Publish website changes' },
  ] },
  { id: 'admin', label: 'Administration', perms: [
    { key: 'admin.audit', label: 'View audit logs' },
    { key: 'admin.settings', label: 'Manage permitted system settings' },
    { key: 'admin.leads', label: 'View website leads and quotation requests' },
    { key: 'admin.edit_permissions', label: 'Edit employee permissions' },
    { key: 'admin.delegates', label: 'Manage delegated administrators' },
  ] },
];

export const ALL_PERMS: string[] = PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.key));
export const PERM_SET = new Set(ALL_PERMS);
export const permLabel = (key: string) => PERM_GROUPS.flatMap((g) => g.perms).find((p) => p.key === key)?.label ?? key;

/** Keep only known keys, no duplicates. */
export function sanitizePerms(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter((k): k is string => typeof k === 'string' && PERM_SET.has(k)))];
}

/** Convenience presets. They only pre-fill the editor; every preset remains fully customisable. */
export const PRESETS: { id: string; label: string; perms: string[] }[] = [
  { id: 'designer', label: 'Designer', perms: ['project.view_assigned', 'project.view_details', 'project.view_files', 'project.upload_files', 'task.view_assigned', 'task.update_progress', 'task.change_status', 'task.comment', 'task.upload'] },
  { id: 'project_manager', label: 'Project manager', perms: ['project.view_assigned', 'project.view_details', 'project.edit', 'project.view_files', 'project.upload_files', 'project.milestones', 'project.reports', 'project.approve', 'task.view_assigned', 'task.update_progress', 'task.change_status', 'task.comment', 'task.upload', 'task.create', 'task.assign', 'task.reassign', 'task.deadline', 'task.approve', 'task.request_revision', 'client.view_assigned', 'client.view_contact'] },
  { id: 'site_engineer', label: 'Site engineer', perms: ['project.view_assigned', 'project.view_details', 'project.view_files', 'project.upload_files', 'task.view_assigned', 'task.update_progress', 'task.change_status', 'task.comment', 'task.upload'] },
  { id: 'accountant', label: 'Accountant', perms: ['fin.view', 'fin.view_payments', 'fin.record_payment', 'fin.expense_enter', 'fin.invoice_create', 'fin.invoice_edit', 'client.view_assigned', 'client.view_contact', 'client.view_docs', 'client.download_docs', 'fin.view_all_documents'] },
  { id: 'hr', label: 'HR executive', perms: ['hr.view_profiles', 'hr.create_employee', 'hr.edit_employee'] },
  { id: 'content', label: 'Content designer', perms: ['cms.edit_text', 'cms.upload_images', 'cms.replace_images', 'cms.portfolio', 'cms.fonts', 'cms.preview'] },
  { id: 'sales', label: 'Sales executive', perms: ['client.view_assigned', 'client.view_contact', 'client.create', 'client.edit', 'client.view_docs', 'client.create_docs', 'client.gen_quote', 'fin.quote_create', 'fin.quote_edit', 'client.download_docs'] },
  { id: 'blank', label: 'Blank (no access)', perms: [] },
];

export interface NavItem { href: string; label: string; icon: string; any?: string[]; ownerOnly?: boolean }

/** Sidebar modules and the permissions that unlock them. Hiding a link is cosmetic; every page and action re-checks on the server. */
export const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'grid' },
  { href: '/admin/projects', label: 'Projects', icon: 'folder', any: ['project.view_assigned', 'project.view_all'] },
  { href: '/admin/tasks', label: 'Tasks', icon: 'check', any: ['task.view_assigned', 'task.view_all', 'task.create'] },
  { href: '/admin/clients', label: 'Clients', icon: 'users', any: ['client.view_assigned', 'client.view_all', 'client.create'] },
  { href: '/admin/documents', label: 'Documents', icon: 'file', any: ['fin.view', 'fin.view_all_documents', 'client.view_docs', 'client.create_docs', 'fin.quote_create', 'fin.invoice_create', 'client.gen_quote', 'client.gen_invoice'] },
  { href: '/admin/finance', label: 'Finance', icon: 'coin', any: ['fin.view', 'fin.view_revenue', 'fin.view_profit', 'fin.expense_enter', 'fin.view_payments'] },
  { href: '/admin/attendance', label: 'Attendance', icon: 'clock' },
  { href: '/admin/employees', label: 'Employees', icon: 'team', any: ['hr.view_profiles', 'hr.create_employee', 'hr.edit_employee', 'hr.view_payroll'] },
  { href: '/admin/website', label: 'Website', icon: 'globe', any: ['cms.edit_text', 'cms.upload_images', 'cms.portfolio', 'cms.fonts', 'cms.preview', 'cms.publish', 'cms.design', 'cms.replace_images'] },
  { href: '/admin/leads', label: 'Leads', icon: 'inbox', any: ['admin.leads'] },
  { href: '/admin/audit', label: 'Audit log', icon: 'shield', any: ['admin.audit'] },
  { href: '/admin/settings', label: 'Settings', icon: 'cog', any: ['admin.settings'] },
];

export const TASK_STATUSES = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'submitted', label: 'Submitted for Review' },
  { key: 'revision', label: 'Revision Required' },
  { key: 'completed', label: 'Completed' },
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number]['key'];
export const statusLabel = (k: string) => TASK_STATUSES.find((s) => s.key === k)?.label ?? k;

/** Completion % = completed / total x 100; zero tasks is 0, never NaN. */
export const completionPct = (completed: number, total: number) => (total > 0 ? Math.round((completed / total) * 100) : 0);
