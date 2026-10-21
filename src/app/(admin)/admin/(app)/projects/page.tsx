import Link from 'next/link';
import { requireUser, pageCan, can } from '@/server/auth';
import { q, num } from '@/server/db';
import { canSeeBudget, projectScope } from '@/server/access';
import { completionPct } from '@/server/perms';
import { Progress } from '@/components/admin/Charts';
import { Card, Empty, StatusBadge, bdt, day } from '@/components/admin/Ui';

export const metadata = { title: 'Projects' };

export default async function Projects({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const u = await requireUser();
  pageCan(u, ['project.view_assigned', 'project.view_all']);
  const sp = await searchParams;
  const p: unknown[] = [];
  const where = [projectScope(u, 'p', p)];
  const term = (sp.q ?? '').trim().slice(0, 60);
  if (term) { p.push(`%${term}%`); where.push(`(p.name ILIKE $${p.length} OR p.code ILIKE $${p.length} OR p.location ILIKE $${p.length})`); }
  if (['planning', 'active', 'in_progress', 'on_hold', 'completed', 'cancelled'].includes(sp.status ?? '')) { p.push(sp.status); where.push(`p.status = $${p.length}`); }
  const showBudget = canSeeBudget(u);
  const rows = await q<{ id: string; code: string; name: string; status: string; type: string | null; location: string | null; due_on: string | null; budget: string | null; total: number; done: number; client: string | null }>(
    `SELECT p.id, p.code, p.name, p.status, p.type, p.location, p.due_on::text, p.budget, c.name AS client,
      (SELECT count(*) FROM tasks t WHERE t.project_id = p.id)::int AS total, (SELECT count(*) FROM tasks t WHERE t.project_id = p.id AND t.status='completed')::int AS done
     FROM projects p LEFT JOIN clients c ON c.id = p.client_id WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT 200`, p);
  const wide = u.isOwner || can(u, 'project.view_all');
  return (
    <div className="ad-grid">
      <form className="ad-toolbar" role="search">
        <input type="search" name="q" defaultValue={term} placeholder="Search projects…" style={{ maxWidth: 320 }} />
        <select name="status" defaultValue={sp.status ?? ''} style={{ width: 170 }}><option value="">All statuses</option>{['planning', 'active', 'in_progress', 'on_hold', 'completed', 'cancelled'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select>
        <button className="ad-btn">Filter</button><span className="grow" />
        {can(u, 'project.edit') && wide && <Link href="/admin/projects/new" className="ad-btn primary">+ New project</Link>}
      </form>
      {rows.length === 0 ? <Card><Empty title="No projects">{wide ? 'Create the first project to start assigning work.' : 'You have not been added to any project yet.'}</Empty></Card> : (
        <div className="ad-tablewrap"><table>
          <thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Progress</th><th>Due</th>{showBudget && <th className="num">Budget</th>}</tr></thead>
          <tbody>{rows.map((r) => {
            const pct = completionPct(r.done, r.total);
            return (
              <tr key={r.id}>
                <td><Link href={`/admin/projects/${r.id}`}><b>{r.name}</b></Link><br /><span className="muted small">{r.code}{r.type ? ` · ${r.type}` : ''}{r.location ? ` · ${r.location}` : ''}</span></td>
                <td>{r.client ?? '-'}</td><td><StatusBadge s={r.status} label={r.status.replace('_', ' ')} /></td>
                <td style={{ minWidth: 150 }}><Progress pct={pct} /><span className="muted small">{r.done}/{r.total} tasks · {pct}%</span></td>
                <td className="nowrap">{day(r.due_on)}</td>{showBudget && <td className="num">{r.budget ? bdt(num(r.budget)) : '-'}</td>}
              </tr>);
          })}</tbody></table></div>
      )}
    </div>
  );
}
