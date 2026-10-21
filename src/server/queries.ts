import { q, q1, num } from './db';
import { can, canAny, type User } from './auth';
import { clientScope, docScope, projectScope, taskScope } from './access';
import { completionPct } from './perms';

export const TODAY = `(now() AT TIME ZONE 'Asia/Dhaka')::date`;
type Row = Record<string, unknown>;

/** Which dashboard flavour: company-wide for administrators, personal for everyone else. Data is scoped either way. */
export const isWide = (u: User) => u.isOwner || canAny(u, ['task.view_all', 'project.view_all']);

export async function taskCounts(u: User, mine: boolean) {
  const p: unknown[] = [];
  const scope = taskScope(u, 't', p);
  let extra = '';
  if (mine) { p.push(u.id); extra = ` AND EXISTS (SELECT 1 FROM task_assignees x WHERE x.task_id = t.id AND x.user_id = $${p.length})`; }
  const r = await q1<Row>(`SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'assigned')::int AS assigned,
      count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      count(*) FILTER (WHERE status = 'submitted')::int AS submitted,
      count(*) FILTER (WHERE status = 'revision')::int AS revision,
      count(*) FILTER (WHERE status = 'completed')::int AS completed,
      count(*) FILTER (WHERE status <> 'completed' AND due_on < ${TODAY})::int AS overdue,
      count(*) FILTER (WHERE status = 'completed' AND due_on IS NOT NULL AND completed_at::date <= due_on)::int AS on_time,
      count(*) FILTER (WHERE status = 'completed' AND due_on IS NOT NULL AND completed_at::date > due_on)::int AS late
    FROM tasks t WHERE ${scope}${extra}`, p);
  const o = r ?? {};
  const total = num(o.total), completed = num(o.completed);
  return {
    total, assigned: num(o.assigned), in_progress: num(o.in_progress), submitted: num(o.submitted), revision: num(o.revision), completed,
    overdue: num(o.overdue), pending: num(o.assigned) + num(o.in_progress) + num(o.revision), onTime: num(o.on_time), late: num(o.late),
    pct: completionPct(completed, total),
  };
}

export async function completionTrend(u: User, mine: boolean, months = 6) {
  const p: unknown[] = [];
  const scope = taskScope(u, 't', p);
  let extra = '';
  if (mine) { p.push(u.id); extra = ` AND EXISTS (SELECT 1 FROM task_assignees x WHERE x.task_id = t.id AND x.user_id = $${p.length})`; }
  const rows = await q<Row>(`SELECT to_char(date_trunc('month', completed_at AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM') AS m, count(*)::int AS n FROM tasks t
    WHERE status = 'completed' AND completed_at IS NOT NULL AND completed_at > now() - interval '${months} months' AND ${scope}${extra} GROUP BY 1`, p);
  const map = new Map(rows.map((r) => [String(r.m), num(r.n)]));
  const out: { label: string; value: number }[] = [];
  const d = new Date(); d.setUTCDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    const key = `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`;
    out.push({ label: x.toLocaleString('en', { month: 'short', timeZone: 'UTC' }), value: map.get(key) ?? 0 });
  }
  return out;
}

export async function projectProgress(u: User, limit = 8) {
  const p: unknown[] = [];
  const scope = projectScope(u, 'p', p);
  const rows = await q<Row>(`SELECT p.id, p.name, p.code, p.status, p.due_on,
      (SELECT count(*) FROM tasks t WHERE t.project_id = p.id)::int AS total,
      (SELECT count(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed')::int AS done
    FROM projects p WHERE ${scope} AND p.status NOT IN ('cancelled') ORDER BY p.created_at DESC LIMIT ${limit}`, p);
  return rows.map((r) => ({ id: String(r.id), name: String(r.name), code: String(r.code), status: String(r.status), due: r.due_on ? String(r.due_on).slice(0, 10) : null, total: num(r.total), done: num(r.done), pct: completionPct(num(r.done), num(r.total)) }));
}

export async function upcomingTasks(u: User, mine: boolean, limit = 6) {
  const p: unknown[] = [];
  const scope = taskScope(u, 't', p);
  let extra = '';
  if (mine) { p.push(u.id); extra = ` AND EXISTS (SELECT 1 FROM task_assignees x WHERE x.task_id = t.id AND x.user_id = $${p.length})`; }
  const rows = await q<Row>(`SELECT t.id, t.title, t.status, t.priority, t.due_on, (t.due_on < ${TODAY}) AS overdue, pr.name AS project FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id
    WHERE t.status <> 'completed' AND t.due_on IS NOT NULL AND ${scope}${extra} ORDER BY t.due_on ASC LIMIT ${limit}`, p);
  return rows.map((r) => ({ id: String(r.id), title: String(r.title), status: String(r.status), priority: String(r.priority), due: String(r.due_on).slice(0, 10), overdue: Boolean(r.overdue), project: (r.project as string) ?? null }));
}

export async function workloadByProject(u: User) {
  const p: unknown[] = [u.id];
  const scope = taskScope(u, 't', p);
  const rows = await q<Row>(`SELECT coalesce(pr.name, 'No project') AS name, count(*)::int AS n FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id
    WHERE t.status <> 'completed' AND EXISTS (SELECT 1 FROM task_assignees x WHERE x.task_id = t.id AND x.user_id = $1) AND ${scope} GROUP BY 1 ORDER BY 2 DESC LIMIT 6`, p);
  return rows.map((r) => ({ label: String(r.name), value: num(r.n) }));
}

export async function workloadByEmployee(u: User) {
  const p: unknown[] = [];
  const scope = taskScope(u, 't', p);
  const rows = await q<Row>(`SELECT us.id, us.name, count(*) FILTER (WHERE t.status <> 'completed')::int AS open, count(*) FILTER (WHERE t.status = 'completed')::int AS done
    FROM task_assignees ta JOIN tasks t ON t.id = ta.task_id JOIN users us ON us.id = ta.user_id WHERE ${scope} GROUP BY us.id, us.name ORDER BY open DESC LIMIT 8`, p);
  return rows.map((r) => ({ id: String(r.id), name: String(r.name), open: num(r.open), done: num(r.done) }));
}

export async function recentActivity(u: User, limit = 8) {
  const p: unknown[] = [];
  const scope = taskScope(u, 't', p);
  const rows = await q<Row>(`SELECT e.id, e.kind, e.to_status, e.note, e.created_at, t.id AS task_id, t.title, us.name AS who
    FROM task_events e JOIN tasks t ON t.id = e.task_id LEFT JOIN users us ON us.id = e.user_id WHERE ${scope} ORDER BY e.created_at DESC LIMIT ${limit}`, p);
  return rows.map((r) => ({ id: Number(r.id), kind: String(r.kind), to: (r.to_status as string) ?? null, note: (r.note as string) ?? null, at: new Date(String(r.created_at)), taskId: String(r.task_id), title: String(r.title), who: (r.who as string) ?? 'System' }));
}

export async function projectCounts(u: User) {
  const p: unknown[] = [];
  const scope = projectScope(u, 'p', p);
  const r = await q1<Row>(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status IN ('planning','active','in_progress'))::int AS active, count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress FROM projects p WHERE ${scope} AND p.status <> 'cancelled'`, p);
  return { total: num(r?.total), active: num(r?.active), inProgress: num(r?.in_progress) };
}

/** Document money summary. Only meaningful for users who may see financial documents; callers gate it. */
export async function financeSummary(u: User) {
  const p: unknown[] = [];
  const scope = docScope(u, 'd', p);
  const r = await q1<Row>(`SELECT
      count(*) FILTER (WHERE d.type IN ('quotation','estimate','proposal') AND d.status = 'draft')::int AS q_draft,
      count(*) FILTER (WHERE d.type IN ('quotation','estimate','proposal') AND d.status = 'sent')::int AS q_sent,
      count(*) FILTER (WHERE d.type IN ('invoice') AND d.status IN ('approved','sent'))::int AS inv_open,
      coalesce(sum(d.total) FILTER (WHERE d.type = 'invoice' AND d.status IN ('approved','sent')), 0) AS inv_total,
      coalesce(sum((SELECT coalesce(sum(pay.amount),0) FROM payments pay WHERE pay.document_id = d.id)) FILTER (WHERE d.type = 'invoice' AND d.status IN ('approved','sent')), 0) AS inv_paid
    FROM documents d WHERE ${scope}`, p);
  const p2: unknown[] = [];
  const scope2 = docScope(u, 'd', p2);
  const pay = await q1<Row>(`SELECT coalesce(sum(pay.amount),0) AS n FROM payments pay JOIN documents d ON d.id = pay.document_id WHERE date_trunc('month', pay.paid_on) = date_trunc('month', ${TODAY}) AND ${scope2}`, p2);
  return { qDraft: num(r?.q_draft), qSent: num(r?.q_sent), invOpen: num(r?.inv_open), outstanding: num(r?.inv_total) - num(r?.inv_paid), received: num(pay?.n) };
}

export async function monthlyDocTotals(u: User, type: 'quotation' | 'invoice', months = 6) {
  const p: unknown[] = [];
  const scope = docScope(u, 'd', p);
  const types = type === 'quotation' ? `('quotation','estimate','proposal')` : `('invoice')`;
  const rows = await q<Row>(`SELECT to_char(date_trunc('month', d.created_at AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM') AS m, sum(d.total) AS n FROM documents d
    WHERE d.type IN ${types} AND d.status NOT IN ('cancelled') AND d.created_at > now() - interval '${months} months' AND ${scope} GROUP BY 1`, p);
  const map = new Map(rows.map((r) => [String(r.m), num(r.n)]));
  const out: { label: string; value: number }[] = [];
  const d = new Date(); d.setUTCDate(1);
  for (let i = months - 1; i >= 0; i--) {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({ label: x.toLocaleString('en', { month: 'short', timeZone: 'UTC' }), value: map.get(`${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`) ?? 0 });
  }
  return out;
}

export const canSeeFinance = (u: User) => can(u, 'fin.view') || can(u, 'fin.view_all_documents') || u.isOwner;
export { clientScope };
