import Link from 'next/link';
import { requireUser, pageCan, canAny } from '@/server/auth';
import { q, num } from '@/server/db';
import { docScope } from '@/server/access';
import { TODAY } from '@/server/queries';
import { DOC_TYPES, displayStatus, typeInfo, STATUS_LABEL } from '@/server/doc-math';
import { docAllowed } from '@/server/doc-perms';
import { Card, Empty, StatusBadge, bdt, day } from '@/components/admin/Ui';

export const metadata = { title: 'Documents' };

export default async function Documents({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requireUser();
  pageCan(u, ['fin.view', 'fin.view_all_documents', 'client.view_docs', 'client.create_docs', 'fin.quote_create', 'fin.invoice_create', 'client.gen_quote', 'client.gen_invoice']);
  const sp = await searchParams;
  const p: unknown[] = [];
  const where = [docScope(u, 'd', p)];
  if (DOC_TYPES.some((t) => t.key === sp.type)) { p.push(sp.type); where.push(`d.type = $${p.length}`); }
  const term = (sp.q ?? '').trim().slice(0, 60);
  if (term) { p.push(`%${term}%`); where.push(`(d.number ILIKE $${p.length} OR c.name ILIKE $${p.length} OR pr.name ILIKE $${p.length})`); }
  const rows = await q<{ id: string; number: string; type: string; status: string; total: string; current_version: number; updated_at: string; client: string | null; project: string | null; creator: string | null; issue: string | null; due: string | null; paid: string; today: string }>(
    `SELECT d.id, d.number, d.type, d.status, d.total, d.current_version, d.updated_at, c.name AS client, pr.name AS project, us.name AS creator,
       v.data->>'issueDate' AS issue, v.data->>'dueDate' AS due, (SELECT coalesce(sum(amount),0) FROM payments pay WHERE pay.document_id = d.id)::text AS paid, ${TODAY}::text AS today
     FROM documents d LEFT JOIN clients c ON c.id = d.client_id LEFT JOIN projects pr ON pr.id = d.project_id LEFT JOIN users us ON us.id = d.created_by
     JOIN document_versions v ON v.document_id = d.id AND v.version = d.current_version WHERE ${where.join(' AND ')} ORDER BY d.updated_at DESC LIMIT 300`, p);
  const shown = rows.map((r) => ({ ...r, ds: displayStatus(r.type, r.status, num(r.total), num(r.paid), r.due, r.today) })).filter((r) => !sp.status || r.ds === sp.status);
  const mayCreate = DOC_TYPES.some((t) => docAllowed(u, t.key, 'create'));
  void canAny;
  return (
    <div className="ad-grid">
      <form className="ad-toolbar" role="search">
        <input type="search" name="q" defaultValue={term} placeholder="Search number, client, project…" style={{ maxWidth: 300 }} />
        <select name="type" defaultValue={sp.type ?? ''} style={{ width: 200 }}><option value="">All types</option>{DOC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ''} style={{ width: 170 }}><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="ad-btn">Filter</button><span className="grow" />
        {mayCreate && <Link href="/admin/documents/new" className="ad-btn primary">+ New document</Link>}
      </form>
      {shown.length === 0 ? <Card><Empty title="No documents">Only documents you are authorised to see are listed.</Empty></Card> : (
        <div className="ad-tablewrap"><table>
          <thead><tr><th>Number</th><th>Type</th><th>Client</th><th>Project</th><th>Issued</th><th className="num">Amount</th><th>Status</th><th>Ver.</th><th>Modified</th><th>Created by</th></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/documents/${r.id}`}><b>{r.number}</b></Link></td><td>{typeInfo(r.type).label}</td><td>{r.client ?? '-'}</td><td>{r.project ?? '-'}</td><td className="nowrap">{day(r.issue)}</td>
              <td className="num nowrap">{bdt(num(r.total))}</td><td><StatusBadge s={r.ds} label={STATUS_LABEL[r.ds]} /></td><td>v{r.current_version}</td><td className="nowrap">{day(r.updated_at)}</td><td>{r.creator ?? '-'}</td>
            </tr>))}</tbody></table></div>
      )}
    </div>
  );
}
