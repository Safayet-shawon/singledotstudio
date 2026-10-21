import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, can } from '@/server/auth';
import { q, q1, num } from '@/server/db';
import { canViewDoc } from '@/server/access';
import { TODAY } from '@/server/queries';
import { computeTotals, displayStatus, isInvoiceKind, lineTotal, STATUS_LABEL, typeInfo, type DocData } from '@/server/doc-math';
import { docAllowed } from '@/server/doc-perms';
import { approveDocumentAction, cancelDocumentAction, emailDocumentAction, markSentManuallyAction, recordPaymentAction, submitDocumentAction } from '@/server/actions/documents';
import { ActionButton, ActionForm } from '@/components/admin/Forms';
import { Card, StatusBadge, bdt, day, when } from '@/components/admin/Ui';

export const metadata = { title: 'Document' };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await canViewDoc(u, id))) notFound();
  const d = await q1<{ id: string; number: string; type: string; status: string; current_version: number; total: string; created_by: string | null; creator: string | null; client_id: string | null; client: string | null; client_email: string | null; project: string | null; project_id: string | null; issued: boolean; sent_at: string | null; sent_via: string | null; approved_at: string | null; approver: string | null; today: string }>(
    `SELECT d.id, d.number, d.type, d.status, d.current_version, d.total, d.created_by, us.name AS creator, d.client_id, c.name AS client, c.email AS client_email, pr.name AS project, d.project_id, d.issued, d.sent_at, d.sent_via, d.approved_at, ap.name AS approver, ${TODAY}::text AS today
     FROM documents d LEFT JOIN users us ON us.id = d.created_by LEFT JOIN users ap ON ap.id = d.approved_by LEFT JOIN clients c ON c.id = d.client_id LEFT JOIN projects pr ON pr.id = d.project_id WHERE d.id = $1`, [id]);
  if (!d) notFound();
  const [versions, payments] = await Promise.all([
    q<{ version: number; total: string; change_note: string | null; created_at: string; by: string | null; data: DocData }>(`SELECT v.version, v.total, v.change_note, v.created_at, us.name AS by, v.data FROM document_versions v LEFT JOIN users us ON us.id = v.created_by WHERE v.document_id = $1 ORDER BY v.version DESC`, [id]),
    q<{ id: string; amount: string; method: string | null; reference: string | null; paid_on: string; by: string | null }>(`SELECT p.id, p.amount, p.method, p.reference, p.paid_on::text, us.name AS by FROM payments p LEFT JOIN users us ON us.id = p.recorded_by WHERE p.document_id = $1 ORDER BY p.paid_on DESC, p.created_at DESC`, [id]),
  ]);
  const cur = versions.find((v) => v.version === d.current_version)!;
  const data = cur.data;
  const t = computeTotals(data);
  const paid = payments.reduce((a, p) => a + num(p.amount), 0);
  const ds = displayStatus(d.type, d.status, num(d.total), paid, data.dueDate, d.today);
  const inv = isInvoiceKind(d.type);
  const mayEdit = d.status !== 'cancelled' && (docAllowed(u, d.type, 'edit') || (d.created_by === u.id && !d.issued && docAllowed(u, d.type, 'create')));
  const mayApprove = docAllowed(u, d.type, 'approve') && !(d.created_by === u.id && !u.isOwner);
  const maySend = docAllowed(u, d.type, 'edit') || docAllowed(u, d.type, 'approve') || d.created_by === u.id;
  const history = await q<{ action: string; actor_name: string | null; created_at: string; detail: Record<string, unknown> | null }>(`SELECT action, actor_name, created_at, detail FROM audit_log WHERE entity = 'document' AND entity_id = $1 ORDER BY created_at DESC LIMIT 40`, [id]);
  const outstanding = Math.max(0, num(d.total) - paid);

  return (
    <div className="ad-grid ad-cols-21" style={{ alignItems: 'start' }}>
      <div className="ad-grid">
        <Card>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="ad-badge green">{d.number}</span><StatusBadge s={ds} label={STATUS_LABEL[ds]} /><span className="ad-badge">v{d.current_version}</span>
            {d.status === 'sent' && <span className="ad-badge blue">{d.sent_via === 'email' ? 'Emailed' : 'Marked as sent manually'} {day(d.sent_at)}</span>}
          </div>
          <h2 style={{ marginTop: 8 }}>{typeInfo(d.type).label}</h2>
          <p className="muted" style={{ margin: '4px 0 14px' }}>{d.client ? <>For <Link href={`/admin/clients/${d.client_id}`}>{d.client}</Link></> : 'No client'}{d.project && <> · Project {d.project}</>} · Created by {d.creator ?? 'unknown'}{d.approver && <> · Approved by {d.approver} on {day(d.approved_at)}</>}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a className="ad-btn primary" href={`/admin/documents/${id}/pdf`} target="_blank" rel="noopener">Download PDF</a>
            {mayEdit && <Link className="ad-btn" href={`/admin/documents/${id}/edit`}>{d.issued ? 'Revise' : 'Edit'}</Link>}
            {d.status === 'draft' && (d.created_by === u.id || mayEdit) && <ActionButton action={submitDocumentAction.bind(null, id)} label="Submit for approval" size="" tone="primary" />}
            {d.status === 'pending' && mayApprove && <ActionButton action={approveDocumentAction.bind(null, id)} label="Approve" size="" tone="primary" confirm="Approve this document? Once approved it is issued and can only be changed by revision." />}
            {['approved', 'sent'].includes(d.status) && maySend && <ActionButton action={emailDocumentAction.bind(null, id)} label={d.status === 'sent' ? 'Email again' : 'Email to client'} size="" />}
            {d.status === 'approved' && maySend && <ActionButton action={markSentManuallyAction.bind(null, id)} label="Mark as sent manually" size="" confirm="Only confirm this if you have actually sent the PDF to the client yourself." />}
            {d.status !== 'cancelled' && docAllowed(u, d.type, 'approve') && paid === 0 && <ActionButton action={cancelDocumentAction.bind(null, id)} label="Cancel document" tone="danger" size="" confirm="Cancel this document?" />}
          </div>
          <p className="muted small" style={{ margin: '10px 0 0' }}>A generated PDF is not proof of delivery. Status only changes to Sent when the email provider confirms delivery or someone marks it sent manually.</p>
        </Card>

        <div className="ad-doc">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><h3>{data.title || typeInfo(d.type).label}</h3><span className="muted small">Issued {day(data.issueDate)}{data.dueDate ? ` · ${inv ? 'Due' : 'Valid until'} ${day(data.dueDate)}` : ''}</span></div></div>
          <div className="ad-tablewrap" style={{ marginTop: 14, boxShadow: 'none' }}><table style={{ minWidth: 520 }}>
            <thead><tr><th>#</th><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
            <tbody>{data.lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.description}</td><td className="num">{l.qty} {l.unit}</td><td className="num">{bdt(l.price)}</td><td className="num">{bdt(lineTotal(l))}</td></tr>)}</tbody></table></div>
          <ul className="ad-list" style={{ maxWidth: 360, marginLeft: 'auto', marginTop: 12 }}>
            <li><span className="muted">Subtotal</span><span>{bdt(t.subtotal)}</span></li>
            {t.discount > 0 && <li><span className="muted">Discount</span><span>- {bdt(t.discount)}</span></li>}
            {data.taxPercent > 0 && <li><span className="muted">{data.taxLabel} ({data.taxPercent}%)</span><span>{bdt(t.tax)}</span></li>}
            <li><b>Total</b><b>{bdt(t.total)}</b></li>
            {inv && paid > 0 && <><li><span className="muted">Paid</span><span>- {bdt(paid)}</span></li><li><b>Balance due</b><b>{bdt(outstanding)}</b></li></>}
          </ul>
          {data.paymentTerms && <p style={{ marginTop: 14 }}><b>Payment terms:</b> {data.paymentTerms}</p>}
          {data.notes && <p><b>Notes:</b> {data.notes}</p>}
          {data.terms && <p className="muted small" style={{ whiteSpace: 'pre-wrap' }}>{data.terms}</p>}
        </div>

        {inv && (can(u, 'fin.view_payments') || can(u, 'fin.record_payment') || u.isOwner) && (
          <Card title="Payments">
            {payments.length === 0 ? <p className="muted">No payments recorded. Payment status comes only from entries made here.</p> : (
              <div className="ad-tablewrap" style={{ boxShadow: 'none' }}><table style={{ minWidth: 480 }}><thead><tr><th>Date</th><th className="num">Amount</th><th>Method</th><th>Reference</th><th>Recorded by</th></tr></thead>
                <tbody>{payments.map((p) => <tr key={p.id}><td>{day(p.paid_on)}</td><td className="num">{bdt(num(p.amount))}</td><td>{p.method ?? '-'}</td><td>{p.reference ?? '-'}</td><td>{p.by ?? '-'}</td></tr>)}</tbody></table></div>
            )}
            {can(u, 'fin.record_payment') && ['approved', 'sent'].includes(d.status) && outstanding > 0 && (
              <ActionForm action={recordPaymentAction} submit="Record payment" resetOnOk>
                <input type="hidden" name="id" value={id} />
                <div className="ad-row three">
                  <div className="ad-field"><label htmlFor="pa">Amount (BDT)</label><input id="pa" name="amount" type="number" min="0.01" step="0.01" max={outstanding} required /></div>
                  <div className="ad-field"><label htmlFor="pm">Method</label><select id="pm" name="method"><option>Bank transfer</option><option>Cash</option><option>bKash</option><option>Nagad</option><option>Cheque</option><option>Card</option></select></div>
                  <div className="ad-field"><label htmlFor="pd">Date</label><input id="pd" name="paid_on" type="date" defaultValue={d.today} /></div>
                </div>
                <div className="ad-field"><label htmlFor="pr">Reference (optional)</label><input id="pr" name="reference" type="text" /></div>
              </ActionForm>
            )}
          </Card>
        )}
      </div>

      <div className="ad-grid">
        <Card title="Version history">
          <ul className="ad-timeline">{versions.map((v) => (
            <li key={v.version}><b>v{v.version}</b> · {bdt(num(v.total))} {v.version === d.current_version && <span className="ad-badge green">current</span>}<br />
              <span className="muted small">{v.change_note ?? ''} · {v.by ?? 'unknown'} · {when(v.created_at)}</span><br />
              <a className="small" href={`/admin/documents/${id}/pdf?v=${v.version}`} target="_blank" rel="noopener">Open PDF of v{v.version}</a></li>))}</ul>
        </Card>
        <Card title="Approval and delivery history">
          {history.length === 0 ? <p className="muted">No history yet.</p> : <ul className="ad-timeline">{history.map((h, i) => <li key={i}><b>{h.action.replace('document.', '').replace(/_/g, ' ')}</b><br /><span className="muted small">{h.actor_name ?? 'System'} · {when(h.created_at)}</span></li>)}</ul>}
        </Card>
      </div>
    </div>
  );
}
