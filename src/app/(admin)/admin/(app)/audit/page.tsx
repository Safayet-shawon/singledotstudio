import Link from 'next/link';
import { requireUser, pageCan } from '@/server/auth';
import { q } from '@/server/db';
import { Card, Empty, when } from '@/components/admin/Ui';

export const metadata = { title: 'Audit log' };

export default async function Audit({ searchParams }: { searchParams: Promise<{ q?: string; before?: string }> }) {
  const u = await requireUser();
  pageCan(u, 'admin.audit');
  const sp = await searchParams;
  const p: unknown[] = [];
  const where: string[] = [];
  const term = (sp.q ?? '').trim().slice(0, 60);
  if (term) { p.push(`%${term}%`); where.push(`(action ILIKE $${p.length} OR actor_name ILIKE $${p.length} OR entity ILIKE $${p.length})`); }
  if (/^\d+$/.test(sp.before ?? '')) { p.push(sp.before); where.push(`id < $${p.length}`); }
  const rows = await q<{ id: string; action: string; actor_name: string | null; entity: string | null; entity_id: string | null; detail: Record<string, unknown> | null; created_at: string }>(
    `SELECT id::text, action, actor_name, entity, entity_id, detail, created_at FROM audit_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 60`, p);
  return (
    <div className="ad-grid">
      <form className="ad-toolbar" role="search"><input type="search" name="q" defaultValue={term} placeholder="Search action, person or record…" style={{ maxWidth: 340 }} /><button className="ad-btn">Search</button></form>
      <p className="muted small" style={{ margin: 0 }}>The audit log is append-only: entries cannot be edited or deleted, even by administrators (enforced in the database).</p>
      {rows.length === 0 ? <Card><Empty title="No entries" /></Card> : (
        <div className="ad-tablewrap"><table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td className="nowrap">{when(r.created_at)}</td><td>{r.actor_name ?? 'System'}</td><td><b>{r.action}</b></td><td>{r.entity ?? ''}{r.entity_id ? ` ${r.entity_id.slice(0, 8)}` : ''}</td><td className="muted small">{r.detail ? JSON.stringify(r.detail).slice(0, 140) : ''}</td></tr>)}</tbody></table></div>
      )}
      {rows.length === 60 && <Link className="ad-btn" href={`/admin/audit?${term ? `q=${encodeURIComponent(term)}&` : ''}before=${rows[rows.length - 1].id}`}>Older entries</Link>}
    </div>
  );
}
