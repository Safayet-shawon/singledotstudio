'use server';
import { revalidatePath } from 'next/cache';
import { q, q1, tx, num } from '../db';
import { can, Forbidden, type User } from '../auth';
import { docAllowed, type DocAct } from '../doc-perms';
import { canViewClient, canViewDoc, canViewProject } from '../access';
import { audit, notify } from '../audit';
import { bad, fail, isDate, me, nextNumber, pad, s, UUID } from '../util';
import { computeTotals, isInvoiceKind, normaliseDoc, typeInfo, DOC_TYPES, type DocData } from '../doc-math';
import { buildDocumentPdf } from '../doc-pdf';
import { getCompany } from '../settings';
import { mailConfigured, sendMailX } from '@/lib/mail';
import type { R } from '@/components/admin/Forms';

const allowed = async (u: User, type: string, act: DocAct) => docAllowed(u, type, act);
const need = async (u: User, type: string, act: DocAct) => { if (!docAllowed(u, type, act)) throw new Forbidden(`You do not have permission to ${act} this type of document.`); };

interface DocRow { id: string; number: string; type: string; status: string; current_version: number; total: string; created_by: string | null; client_id: string | null; project_id: string | null; issued: boolean }
async function load(u: User, id: string): Promise<DocRow> {
  if (!UUID.test(id) || !(await canViewDoc(u, id))) throw new Forbidden('You do not have access to this document.');
  const d = await q1<DocRow>(`SELECT id, number, type, status, current_version, total, created_by, client_id, project_id, issued FROM documents WHERE id = $1`, [id]);
  if (!d) throw bad('Unknown document.');
  return d;
}
function parseData(fd: FormData): DocData {
  let raw: unknown; try { raw = JSON.parse(s(fd, 'data', 200_000)); } catch { throw bad('The document could not be read. Please try again.'); }
  const n = normaliseDoc(raw);
  if ('error' in n) throw bad(n.error);
  return n.data;
}
const paidOf = async (id: string) => num((await q1<{ n: string }>(`SELECT coalesce(sum(amount),0)::text AS n FROM payments WHERE document_id = $1`, [id]))?.n);

export async function createDocumentAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const type = s(fd, 'type', 20);
    if (!DOC_TYPES.some((d) => d.key === type)) throw bad('Choose a document type.');
    await need(u, type, 'create');
    const clientId = s(fd, 'client_id', 40), projectId = s(fd, 'project_id', 40);
    if (!UUID.test(clientId) || !(await canViewClient(u, clientId))) throw bad('Choose a client you have access to.');
    if (projectId && (!UUID.test(projectId) || !(await canViewProject(u, projectId)))) throw new Forbidden('You do not have access to that project.');
    const data = parseData(fd);
    const total = computeTotals(data).total;
    const { n, year } = await nextNumber(typeInfo(type).prefix);
    const number = `${typeInfo(type).prefix}-${year}-${pad(n)}`;
    const id = (await q1<{ id: string }>(`INSERT INTO documents (number, type, client_id, project_id, status, total, created_by) VALUES ($1,$2,$3,$4,'draft',$5,$6) RETURNING id`, [number, type, clientId, projectId || null, total, u.id]))!.id;
    await q(`INSERT INTO document_versions (document_id, version, data, total, change_note, created_by) VALUES ($1,1,$2,$3,'Created',$4)`, [id, JSON.stringify(data), total, u.id]);
    await audit(u, 'document.created', 'document', id, { number, type, total });
    revalidatePath('/admin/documents');
    return { ok: true, redirect: `/admin/documents/${id}` };
  } catch (e) { return fail(e); }
}

export async function saveDocumentAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    const d = await load(u, s(fd, 'id', 40));
    if (d.status === 'cancelled') throw bad('Cancelled documents cannot be edited.');
    const isCreatorDraft = d.created_by === u.id && ['draft', 'pending'].includes(d.status) && (await allowed(u, d.type, 'create'));
    if (!isCreatorDraft) await need(u, d.type, 'edit');
    const data = parseData(fd);
    const total = computeTotals(data).total;
    const paid = await paidOf(d.id);
    if (total + 0.005 < paid) throw bad('The new total is below the payments already recorded.');
    const note = s(fd, 'note', 300);
    if (!d.issued) {
      // Drafts are edited in place.
      await tx([
        [`UPDATE document_versions SET data = $3, total = $4 WHERE document_id = $1 AND version = $2`, [d.id, d.current_version, JSON.stringify(data), total]],
        [`UPDATE documents SET total = $2, status = 'draft', updated_at = now() WHERE id = $1`, [d.id, total]],
      ]);
      await audit(u, 'document.edited', 'document', d.id, { number: d.number, total });
      revalidatePath(`/admin/documents/${d.id}`);
      return { ok: true, redirect: `/admin/documents/${d.id}` };
    }
    // Issued or sent: never overwrite. Create a new version, keep the old one, and require approval again.
    if (!note) throw bad('Describe what changed. Issued documents are revised, not overwritten.');
    const next = d.current_version + 1;
    await tx([
      [`INSERT INTO document_versions (document_id, version, data, total, change_note, created_by) VALUES ($1,$2,$3,$4,$5,$6)`, [d.id, next, JSON.stringify(data), total, note, u.id]],
      [`UPDATE documents SET current_version = $2, total = $3, status = 'pending', approved_by = NULL, approved_at = NULL, sent_at = NULL, sent_via = NULL, updated_at = now() WHERE id = $1`, [d.id, next, total]],
    ]);
    await audit(u, 'document.revised', 'document', d.id, { number: d.number, version: next, previousTotal: num(d.total), total, note });
    revalidatePath(`/admin/documents/${d.id}`);
    return { ok: true, redirect: `/admin/documents/${d.id}` };
  } catch (e) { return fail(e); }
}

export async function submitDocumentAction(id: string): Promise<R> {
  try {
    const u = await me();
    const d = await load(u, id);
    if (d.status !== 'draft') throw bad('Only drafts can be submitted for approval.');
    if (!(d.created_by === u.id || (await allowed(u, d.type, 'edit')))) throw new Forbidden();
    await q(`UPDATE documents SET status = 'pending', updated_at = now() WHERE id = $1`, [id]);
    await audit(u, 'document.submitted', 'document', id, { number: d.number });
    const approvers = await q<{ id: string }>(`SELECT id FROM users WHERE status = 'active' AND (is_owner OR $1 = ANY(perms))`, [`fin.${isInvoiceKind(d.type) ? 'invoice' : 'quote'}_approve`]);
    await notify(approvers.map((a) => a.id).filter((x) => x !== u.id), 'document', `${d.number} needs approval`, undefined, `/admin/documents/${id}`);
    revalidatePath(`/admin/documents/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function approveDocumentAction(id: string): Promise<R> {
  try {
    const u = await me();
    const d = await load(u, id);
    await need(u, d.type, 'approve');
    if (d.status !== 'pending') throw bad('Only documents pending approval can be approved.');
    if (d.created_by === u.id && !u.isOwner) throw new Forbidden('You cannot approve a document you created yourself.');
    await q(`UPDATE documents SET status = 'approved', issued = true, approved_by = $2, approved_at = now(), updated_at = now() WHERE id = $1`, [id, u.id]);
    await audit(u, 'document.approved', 'document', id, { number: d.number, version: d.current_version });
    if (d.created_by && d.created_by !== u.id) await notify([d.created_by], 'document', `${d.number} was approved`, undefined, `/admin/documents/${id}`);
    revalidatePath(`/admin/documents/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

async function renderPdf(d: DocRow, version: number) {
  const v = await q1<{ data: DocData }>(`SELECT data FROM document_versions WHERE document_id = $1 AND version = $2`, [d.id, version]);
  if (!v) throw bad('Unknown version.');
  const client = d.client_id ? await q1<{ name: string; company: string | null; phone: string | null; email: string | null; address: string | null }>(`SELECT name, company, phone, email, address FROM clients WHERE id = $1`, [d.client_id]) : null;
  const project = d.project_id ? await q1<{ name: string; code: string; location: string | null }>(`SELECT name, code, location FROM projects WHERE id = $1`, [d.project_id]) : null;
  const pdf = await buildDocumentPdf({ number: d.number, type: d.type, version, status: d.status, data: v.data, company: await getCompany(), client, project, paid: await paidOf(d.id) });
  return { pdf, client };
}

/** Email the PDF to the client. Success is reported only when the mail provider confirms it. */
export async function emailDocumentAction(id: string): Promise<R> {
  try {
    const u = await me();
    const d = await load(u, id);
    if (!(await allowed(u, d.type, 'edit')) && !(await allowed(u, d.type, 'approve')) && d.created_by !== u.id) throw new Forbidden();
    if (!['approved', 'sent'].includes(d.status)) throw bad('Approve the document before sending it.');
    if (!mailConfigured()) throw bad('Email delivery is not configured on this site, so nothing was sent. Download the PDF and send it yourself, then use "Mark as sent manually".');
    const { pdf, client } = await renderPdf(d, d.current_version);
    if (!client?.email) throw bad('This client has no email address on file.');
    const co = await getCompany();
    const m = await sendMailX({ to: client.email, subject: `${typeInfo(d.type).label} ${d.number} from ${co.name}`, text: `Hello ${client.name},\n\nPlease find ${d.number} attached.\n\n${co.name}`, attachments: [{ filename: `${d.number}.pdf`, content: pdf }] });
    await q(`INSERT INTO audit_log (actor_id, actor_name, action, entity, entity_id, detail) VALUES ($1,$2,'document.email_attempt','document',$3,$4)`, [u.id, u.name, id, JSON.stringify({ status: m.status, version: d.current_version })]);
    if (m.status !== 'sent') {
      throw bad(m.status === 'sample' || m.status === 'not_configured' ? 'Email delivery is not configured on this site, so nothing was sent. Download the PDF and send it yourself, then use "Mark as sent manually".' : 'The email provider rejected the message, so nothing was sent.');
    }
    await q(`UPDATE documents SET status = 'sent', sent_at = now(), sent_via = 'email', updated_at = now() WHERE id = $1`, [id]);
    revalidatePath(`/admin/documents/${id}`);
    return { ok: true, message: `Emailed to ${client.email}.` };
  } catch (e) { return fail(e); }
}

export async function markSentManuallyAction(id: string): Promise<R> {
  try {
    const u = await me();
    const d = await load(u, id);
    if (!(await allowed(u, d.type, 'edit')) && !(await allowed(u, d.type, 'approve')) && d.created_by !== u.id) throw new Forbidden();
    if (d.status !== 'approved') throw bad('Only approved documents can be marked as sent.');
    await q(`UPDATE documents SET status = 'sent', sent_at = now(), sent_via = 'manual', updated_at = now() WHERE id = $1`, [id]);
    await audit(u, 'document.marked_sent_manually', 'document', id, { number: d.number });
    revalidatePath(`/admin/documents/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function cancelDocumentAction(id: string): Promise<R> {
  try {
    const u = await me();
    const d = await load(u, id);
    await need(u, d.type, 'approve');
    if (d.status === 'cancelled') throw bad('Already cancelled.');
    if ((await paidOf(id)) > 0) throw bad('Payments are recorded against this document, so it cannot be cancelled.');
    await q(`UPDATE documents SET status = 'cancelled', updated_at = now() WHERE id = $1`, [id]);
    await audit(u, 'document.cancelled', 'document', id, { number: d.number });
    revalidatePath(`/admin/documents/${id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function recordPaymentAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    if (!can(u, 'fin.record_payment')) throw new Forbidden('You are not allowed to record payments.');
    const d = await load(u, s(fd, 'id', 40));
    if (!isInvoiceKind(d.type)) throw bad('Payments can only be recorded on invoices.');
    if (!['approved', 'sent'].includes(d.status)) throw bad('Payments can only be recorded on approved or sent invoices.');
    const amount = Math.round(Number(s(fd, 'amount', 20)) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw bad('Enter a payment amount above zero.');
    const paid = await paidOf(d.id);
    if (amount > num(d.total) - paid + 0.005) throw bad('That is more than the outstanding balance.');
    const on = s(fd, 'paid_on', 10);
    await q(`INSERT INTO payments (document_id, amount, method, reference, paid_on, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)`, [d.id, amount, s(fd, 'method', 30) || null, s(fd, 'reference', 80) || null, isDate(on) ? on : new Date().toISOString().slice(0, 10), u.id]);
    await audit(u, 'payment.recorded', 'document', d.id, { number: d.number, amount });
    if (d.created_by && d.created_by !== u.id) await notify([d.created_by], 'payment', `Payment recorded on ${d.number}`, undefined, `/admin/documents/${d.id}`);
    revalidatePath(`/admin/documents/${d.id}`); revalidatePath('/admin/finance'); revalidatePath('/admin');
    return { ok: true, message: 'Payment recorded.' };
  } catch (e) { return fail(e); }
}
