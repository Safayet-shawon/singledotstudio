import Link from 'next/link';
import { requireUser, pageCan, can } from '@/server/auth';
import { q } from '@/server/db';
import { clientScope } from '@/server/access';
import { Card, Empty, StatusBadge } from '@/components/admin/Ui';

export const metadata = { title: 'Clients' };

export default async function Clients({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await requireUser();
  pageCan(u, ['client.view_assigned', 'client.view_all', 'client.create']);
  const term = ((await searchParams).q ?? '').trim().slice(0, 60);
  const p: unknown[] = [];
  const where = [clientScope(u, 'c', p)];
  if (term) { p.push(`%${term}%`); where.push(`(c.name ILIKE $${p.length} OR c.company ILIKE $${p.length})`); }
  const rows = await q<{ id: string; name: string; company: string | null; phone: string | null; email: string | null; status: string; projects: number }>(
    `SELECT c.id, c.name, c.company, c.phone, c.email, c.status, (SELECT count(*) FROM projects pr WHERE pr.client_id = c.id)::int AS projects FROM clients c WHERE ${where.join(' AND ')} ORDER BY c.name LIMIT 300`, p);
  const contact = can(u, 'client.view_contact');
  return (
    <div className="ad-grid">
      <form className="ad-toolbar" role="search">
        <input type="search" name="q" defaultValue={term} placeholder="Search clients…" style={{ maxWidth: 320 }} /><button className="ad-btn">Search</button><span className="grow" />
        {can(u, 'client.create') && <Link href="/admin/clients/new" className="ad-btn primary">+ New client</Link>}
      </form>
      <Card>{rows.length === 0 ? <Empty title="No clients">You only see clients you are explicitly authorised for.</Empty> : (
        <div className="ad-tablewrap" style={{ border: 0, boxShadow: 'none' }}><table>
          <thead><tr><th>Client</th><th>Company</th>{contact && <th>Contact</th>}<th>Projects</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td><Link href={`/admin/clients/${r.id}`}><b>{r.name}</b></Link></td><td>{r.company ?? '-'}</td>{contact && <td>{r.phone ?? '-'}<br /><span className="muted small">{r.email ?? ''}</span></td>}<td>{r.projects}</td><td><StatusBadge s={r.status === 'active' ? 'active' : r.status} /></td></tr>)}</tbody></table></div>
      )}</Card>
    </div>
  );
}
