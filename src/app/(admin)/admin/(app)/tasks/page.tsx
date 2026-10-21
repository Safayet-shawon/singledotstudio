import Link from 'next/link';
import { requireUser, pageCan, can } from '@/server/auth';
import { q } from '@/server/db';
import { projectScope, taskScope } from '@/server/access';
import { TASK_STATUSES } from '@/server/perms';
import { TODAY } from '@/server/queries';
import { Card, Empty, PriorityBadge, StatusBadge, day } from '@/components/admin/Ui';

export const metadata = { title: 'Tasks' };

interface T { id: string; title: string; status: string; priority: string; due_on: string | null; overdue: boolean; project: string | null; assignees: string | null }

export default async function Tasks({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requireUser();
  pageCan(u, ['task.view_assigned', 'task.view_all', 'task.create']);
  const sp = await searchParams;
  const view = sp.view === 'board' ? 'board' : 'table';
  const p: unknown[] = [];
  const where = [taskScope(u, 't', p)];
  if (TASK_STATUSES.some((x) => x.key === sp.status)) { p.push(sp.status); where.push(`t.status = $${p.length}`); }
  if (['low', 'medium', 'high', 'urgent'].includes(sp.priority ?? '')) { p.push(sp.priority); where.push(`t.priority = $${p.length}`); }
  if (/^[0-9a-f-]{36}$/i.test(sp.project ?? '')) { p.push(sp.project); where.push(`t.project_id = $${p.length}`); }
  if (/^[0-9a-f-]{36}$/i.test(sp.employee ?? '')) { p.push(sp.employee); where.push(`EXISTS (SELECT 1 FROM task_assignees x WHERE x.task_id = t.id AND x.user_id = $${p.length})`); }
  if (sp.due === 'overdue') where.push(`t.status <> 'completed' AND t.due_on < ${TODAY}`);
  if (sp.due === 'week') where.push(`t.status <> 'completed' AND t.due_on BETWEEN ${TODAY} AND ${TODAY} + 7`);
  if (sp.mine === '1') { p.push(u.id); where.push(`EXISTS (SELECT 1 FROM task_assignees x WHERE x.task_id = t.id AND x.user_id = $${p.length})`); }
  const rows = await q<T>(`SELECT t.id, t.title, t.status, t.priority, t.due_on::text, (t.status <> 'completed' AND t.due_on < ${TODAY}) AS overdue, pr.name AS project,
      (SELECT string_agg(us.name, ', ' ORDER BY us.name) FROM task_assignees ta JOIN users us ON us.id = ta.user_id WHERE ta.task_id = t.id) AS assignees
    FROM tasks t LEFT JOIN projects pr ON pr.id = t.project_id WHERE ${where.join(' AND ')} ORDER BY t.due_on NULLS LAST, t.created_at DESC LIMIT 300`, p);

  const pp: unknown[] = [];
  const projects = await q<{ id: string; name: string }>(`SELECT p.id, p.name FROM projects p WHERE ${projectScope(u, 'p', pp)} ORDER BY p.name LIMIT 100`, pp);
  const people = u.isOwner || can(u, 'task.view_all') || can(u, 'task.assign') ? await q<{ id: string; name: string }>(`SELECT id, name FROM users WHERE status <> 'inactive' ORDER BY name`) : [];
  const qs = (o: Record<string, string>) => '?' + new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v) as [string, string][]), ...o }).toString();

  return (
    <div className="ad-grid">
      <form className="ad-toolbar" role="search">
        <input type="hidden" name="view" value={view} />
        <select name="status" defaultValue={sp.status ?? ''} style={{ width: 170 }}><option value="">All statuses</option>{TASK_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        <select name="priority" defaultValue={sp.priority ?? ''} style={{ width: 140 }}><option value="">Any priority</option>{['urgent', 'high', 'medium', 'low'].map((x) => <option key={x}>{x}</option>)}</select>
        <select name="project" defaultValue={sp.project ?? ''} style={{ width: 190 }}><option value="">All projects</option>{projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        {people.length > 0 && <select name="employee" defaultValue={sp.employee ?? ''} style={{ width: 180 }}><option value="">Anyone</option>{people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
        <select name="due" defaultValue={sp.due ?? ''} style={{ width: 150 }}><option value="">Any deadline</option><option value="overdue">Overdue</option><option value="week">Next 7 days</option></select>
        <button className="ad-btn">Apply</button>
        <span className="grow" />
        <Link className="ad-chip" href={qs({ view: 'table' })} style={view === 'table' ? { background: '#166534', color: '#fff' } : undefined}>Table</Link>
        <Link className="ad-chip" href={qs({ view: 'board' })} style={view === 'board' ? { background: '#166534', color: '#fff' } : undefined}>Board</Link>
        {can(u, 'task.create') && <Link href="/admin/tasks/new" className="ad-btn primary">+ New task</Link>}
      </form>

      {rows.length === 0 ? <Card><Empty title="No tasks match">Only tasks you are allowed to see are listed.</Empty></Card> : view === 'table' ? (
        <div className="ad-tablewrap">
          <table>
            <thead><tr><th>Task</th><th>Project</th><th>Assigned to</th><th>Priority</th><th>Deadline</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/tasks/${r.id}`}><b>{r.title}</b></Link></td><td>{r.project ?? '-'}</td><td>{r.assignees ?? <span className="muted">Unassigned</span>}</td>
                <td><PriorityBadge p={r.priority} /></td><td className="nowrap">{day(r.due_on)} {r.overdue && <span className="ad-badge red">Overdue</span>}</td><td><StatusBadge s={r.status} /></td>
              </tr>))}</tbody>
          </table>
        </div>
      ) : (
        <div className="ad-kanban">
          {TASK_STATUSES.map((st) => {
            const list = rows.filter((r) => r.status === st.key);
            return (
              <div key={st.key} className="ad-col">
                <h4><span>{st.label}</span><span>{list.length}</span></h4>
                {list.map((r, i) => (
                  <Link key={r.id} href={`/admin/tasks/${r.id}`} className="ad-tcard" style={{ animationDelay: `${i * 40}ms` }}>
                    <b>{r.title}</b>
                    <span className="muted small">{r.project ?? 'No project'}</span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}><PriorityBadge p={r.priority} />{r.due_on && <span className={`ad-badge ${r.overdue ? 'red' : ''}`}>{day(r.due_on)}</span>}</div>
                    {r.assignees && <span className="muted small" style={{ display: 'block', marginTop: 6 }}>{r.assignees}</span>}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
