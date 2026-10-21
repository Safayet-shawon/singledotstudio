'use client';
import { useMemo, useState } from 'react';
import { ActionForm, type R } from './Forms';
import { computeTotals, DOC_TYPES, lineTotal, type DocData, type Line } from '@/server/doc-math';

const fmt = (n: number) => `৳${new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
type Action = (prev: R, fd: FormData) => Promise<R>;

export function DocBuilder({ action, initial, types, clients, projects, docId, type, clientId, projectId, needsNote, submit }: {
  action: Action; initial: DocData; types?: string[]; clients?: { id: string; name: string }[]; projects?: { id: string; name: string; client_id: string | null }[];
  docId?: string; type?: string; clientId?: string; projectId?: string; needsNote?: boolean; submit: string;
}) {
  const [d, setD] = useState<DocData>(initial);
  const [t, setT] = useState(type ?? types?.[0] ?? 'quotation');
  const [client, setClient] = useState(clientId ?? '');
  const totals = useMemo(() => computeTotals(d), [d]);
  const set = (p: Partial<DocData>) => setD((o) => ({ ...o, ...p }));
  const setLine = (i: number, p: Partial<Line>) => set({ lines: d.lines.map((l, k) => (k === i ? { ...l, ...p } : l)) });
  const shownProjects = (projects ?? []).filter((p) => !client || !p.client_id || p.client_id === client);
  return (
    <ActionForm action={action} submit={submit}>
      {docId && <input type="hidden" name="id" value={docId} />}
      <input type="hidden" name="data" value={JSON.stringify(d)} />
      {!docId && (
        <div className="ad-row three">
          <div className="ad-field"><label htmlFor="dt">Document type</label>
            <select id="dt" name="type" value={t} onChange={(e) => setT(e.target.value)}>{DOC_TYPES.filter((x) => types?.includes(x.key)).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></div>
          <div className="ad-field"><label htmlFor="dc">Client</label>
            <select id="dc" name="client_id" value={client} onChange={(e) => setClient(e.target.value)} required><option value="">Select a client…</option>{clients?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="ad-field"><label htmlFor="dp">Project (optional)</label>
            <select id="dp" name="project_id" defaultValue={projectId ?? ''}><option value="">None</option>{shownProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
      )}
      <div className="ad-field"><label htmlFor="ti">Title / subject</label><input id="ti" type="text" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Interior design for 3-bedroom apartment" /></div>
      <div className="ad-row">
        <div className="ad-field"><label htmlFor="is">Issue date</label><input id="is" type="date" value={d.issueDate} onChange={(e) => set({ issueDate: e.target.value })} required /></div>
        <div className="ad-field"><label htmlFor="du">Valid until / due date</label><input id="du" type="date" value={d.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || null })} /></div>
      </div>

      <div className="ad-tablewrap"><table className="ad-lines" style={{ minWidth: 700 }}>
        <thead><tr><th style={{ width: '46%' }}>Description</th><th>Qty</th><th>Unit</th><th>Unit price (BDT)</th><th className="num">Amount</th><th /></tr></thead>
        <tbody>{d.lines.map((l, i) => (
          <tr key={i}>
            <td><input type="text" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} aria-label="Description" /></td>
            <td><input type="number" min="0" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} style={{ width: 80 }} aria-label="Quantity" /></td>
            <td><input type="text" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} style={{ width: 70 }} aria-label="Unit" /></td>
            <td><input type="number" min="0" step="any" value={l.price} onChange={(e) => setLine(i, { price: Number(e.target.value) })} style={{ width: 130 }} aria-label="Unit price" /></td>
            <td className="num nowrap">{fmt(lineTotal(l))}</td>
            <td><button type="button" className="ad-btn sm danger" onClick={() => set({ lines: d.lines.length > 1 ? d.lines.filter((_, k) => k !== i) : d.lines })} aria-label="Remove line">✕</button></td>
          </tr>))}</tbody>
      </table></div>
      <div><button type="button" className="ad-btn sm" onClick={() => set({ lines: [...d.lines, { description: '', qty: 1, unit: 'pcs', price: 0 }] })}>+ Add line</button></div>

      <div className="ad-row three">
        <div className="ad-field"><label htmlFor="dk">Discount</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select id="dk" value={d.discountKind} onChange={(e) => set({ discountKind: e.target.value as DocData['discountKind'] })} style={{ width: 120 }}><option value="none">None</option><option value="percent">Percent</option><option value="amount">Amount</option></select>
            <input type="number" min="0" step="any" value={d.discountValue} disabled={d.discountKind === 'none'} onChange={(e) => set({ discountValue: Number(e.target.value) })} aria-label="Discount value" />
          </div></div>
        <div className="ad-field"><label htmlFor="tl">Tax label</label><input id="tl" type="text" value={d.taxLabel} onChange={(e) => set({ taxLabel: e.target.value })} /></div>
        <div className="ad-field"><label htmlFor="tp">Tax %</label><input id="tp" type="number" min="0" max="100" step="any" value={d.taxPercent} onChange={(e) => set({ taxPercent: Number(e.target.value) })} /></div>
      </div>

      <div className="ad-card" style={{ background: 'var(--soft)', boxShadow: 'none', animation: 'none' }}>
        <ul className="ad-list">
          <li><span className="muted">Subtotal</span><b>{fmt(totals.subtotal)}</b></li>
          {totals.discount > 0 && <li><span className="muted">Discount</span><b>- {fmt(totals.discount)}</b></li>}
          {d.taxPercent > 0 && <li><span className="muted">{d.taxLabel} ({d.taxPercent}%)</span><b>{fmt(totals.tax)}</b></li>}
          <li><span><b>Total</b></span><b style={{ fontSize: '1.3rem' }}>{fmt(totals.total)}</b></li>
        </ul>
      </div>

      <div className="ad-field"><label htmlFor="pt">Payment terms</label><textarea id="pt" value={d.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} style={{ minHeight: 70 }} /></div>
      <div className="ad-field"><label htmlFor="nt">Notes</label><textarea id="nt" value={d.notes} onChange={(e) => set({ notes: e.target.value })} style={{ minHeight: 70 }} /></div>
      <div className="ad-field"><label htmlFor="tc">Terms and conditions</label><textarea id="tc" value={d.terms} onChange={(e) => set({ terms: e.target.value })} /></div>
      {needsNote && <div className="ad-field"><label htmlFor="cn">What changed? (required, recorded in the version history)</label><input id="cn" name="note" type="text" required /></div>}
    </ActionForm>
  );
}
