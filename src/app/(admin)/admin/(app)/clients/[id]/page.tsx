import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, can } from '@/server/auth';
import { q, q1, num } from '@/server/db';
import { canViewClient, docScope, projectScope } from '@/server/access';
import { setClientAccessAction, updateClientAction } from '@/server/actions/clients';
import { ActionButton, ActionForm } from '@/components/admin/Forms';
import { ClientFields } from '@/components/admin/ClientFields';
import { Card, Empty, StatusBadge, bdt, day } from '@/components/admin/Ui';

export const metadata = { title: 'Client' };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canViewClient(u, id))) notFound();
  const c = await q1<{ id: string; name: string; company: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; status: string; created_at: string }>(`SELECT * FROM clients WHERE id = $1`, [id]);
  if (!c) notFound();
  const contact = can(u, 'client.view_contact');
  const pp: unknown[] = [id];
  const dp: unknown[] = [id];
  const [projects, docs] = await Promise.all([
    q<{ id: string; name: string; code: string; status: string }>(`SELECT p.id, p.name, p.code, p.status FROM projects p WHERE p.client_id = $1 AND ${projectScope(u, 'p', pp)} ORDER BY p.created_at DESC`, pp),
    can(u, 'client.view_docs') || can(u, 'fin.view') || can(u, 'fin.view_all_documents') ? q<{ id: string; number: string; type: string; status: string; total: string; created_at: string }>(`SELECT d.id, d.number, d.type, d.status, d.total, d.created_at FROM documents d WHERE d.client_id = $1 AND ${docScope(u, 'd', dp)} ORDER BY d.created_at DESC`, dp) : Promise.resolve([]),
  ]);
  const manageAccess = u.isOwner || can(u, 'client.view_all');
  const access = manageAccess ? await q<{ id: string; name: string; has: boolean }>(`SELECT us.id, us.name, EXISTS (SELECT 1 FROM client_access ca WHERE ca.client_id = $1 AND ca.user_id = us.id) AS has FROM users us WHERE us.status <> 'inactive' AND NOT us.is_owner ORDER BY us.name`, [id]) : [];
  return (
    <div className="ad-grid ad-cols-21" style={{ alignItems: 'start' }}>
      <div className="ad-grid">
        <Card>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><StatusBadge s={c.status} /></div>
          <h2 style={{ marginTop: 8 }}>{c.name}</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>{c.company ?? ''}</p>
          {contact ? <p style={{ margin: '10px 0 0' }}>{c.phone ?? '-'} · {c.email ?? '-'}<br />{c.address ?? ''}</p> : <p className="muted small" style={{ marginTop: 10 }}>Contact details are restricted for your account.</p>}
        </Card>
        <Card title="Projects">{projects.length === 0 ? <Empty title="No projects you can see" /> : <ul className="ad-list">{projects.map((p) => <li key={p.id}><Link href={`/admin/projects/${p.id}`}><b>{p.name}</b> <span className="muted small">{p.code}</span></Link><StatusBadge s={p.status} label={p.status.replace('_', ' ')} /></li>)}</ul>}</Card>
        {docs.length > 0 || can(u, 'client.view_docs') ? (
          <Card title="Documents" action={(can(u, 'client.create_docs') || can(u, 'fin.quote_create') || can(u, 'fin.invoice_create') || can(u, 'client.gen_quote') || can(u, 'client.gen_invoice')) && <Link className="ad-btn sm primary" href={`/admin/documents/new?client=${id}`}>+ New document</Link>}>
            {docs.length === 0 ? <p className="muted">No documents yet.</p> : <ul className="ad-list">{docs.map((d) => <li key={d.id}><span><Link href={`/admin/documents/${d.id}`}><b>{d.number}</b></Link><br /><span className="muted small">{d.type} · {day(d.created_at)}</span></span><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{(can(u, 'fin.view') || u.isOwner) && <span>{bdt(num(d.total))}</span>}<StatusBadge s={d.status} /></span></li>)}</ul>}
          </Card>
        ) : null}
        {can(u, 'client.edit') && <Card title="Edit client"><ActionForm action={updateClientAction} submit="Save client"><input type="hidden" name="id" value={id} /><ClientFields v={c} contact={contact} /></ActionForm></Card>}
      </div>
      <div className="ad-grid">
        {manageAccess && (
          <Card title="Who can open this client">
            <p className="muted small">Only people ticked here (and administrators) can see this client and its documents.</p>
            <ul className="ad-list">{access.map((a) => <li key={a.id}>{a.name}<ActionButton action={setClientAccessAction.bind(null, id, a.id, !a.has)} label={a.has ? 'Revoke' : 'Grant'} tone={a.has ? 'danger' : ''} /></li>)}</ul>
          </Card>
        )}
      </div>
    </div>
  );
}
