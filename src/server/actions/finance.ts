'use server';
import { revalidatePath } from 'next/cache';
import { q, q1 } from '../db';
import { assertCan, Forbidden } from '../auth';
import { canViewProject } from '../access';
import { audit } from '../audit';
import { bad, fail, isDate, me, s, UUID } from '../util';
import { saveCompany, getCompany } from '../settings';
import type { R } from '@/components/admin/Forms';

export async function addExpenseAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'fin.expense_enter');
    const title = s(fd, 'title', 160), amount = Number(s(fd, 'amount', 20)), on = s(fd, 'spent_on', 10), project = s(fd, 'project_id', 40);
    if (title.length < 2) throw bad('Describe the expense.');
    if (!Number.isFinite(amount) || amount < 0) throw bad('Enter a valid amount.');
    if (project && (!UUID.test(project) || !(await canViewProject(u, project)))) throw new Forbidden('You do not have access to that project.');
    const r = await q1<{ id: string }>(`INSERT INTO expenses (project_id, title, amount, spent_on, entered_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [project || null, title, amount, isDate(on) ? on : new Date().toISOString().slice(0, 10), u.id]);
    await audit(u, 'expense.entered', 'expense', r!.id, { amount });
    revalidatePath('/admin/finance');
    return { ok: true, message: 'Expense recorded. It needs approval before it counts.' };
  } catch (e) { return fail(e); }
}

export async function approveExpenseAction(id: string): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'fin.expense_approve');
    const e = await q1<{ entered_by: string | null; status: string; amount: string }>(`SELECT entered_by, status, amount FROM expenses WHERE id = $1`, [id]);
    if (!e) throw bad('Unknown expense.');
    if (e.entered_by === u.id && !u.isOwner) throw new Forbidden('You cannot approve an expense you entered yourself.');
    await q(`UPDATE expenses SET status = 'approved', approved_by = $2 WHERE id = $1 AND status = 'pending'`, [id, u.id]);
    await audit(u, 'expense.approved', 'expense', id, { amount: e.amount });
    revalidatePath('/admin/finance');
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function editExpenseAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'fin.expense_edit');
    const id = s(fd, 'id', 40), title = s(fd, 'title', 160), amount = Number(s(fd, 'amount', 20));
    if (!UUID.test(id) || title.length < 2 || !Number.isFinite(amount) || amount < 0) throw bad('Check the expense details.');
    const e = await q1<{ status: string }>(`SELECT status FROM expenses WHERE id = $1`, [id]);
    if (!e) throw bad('Unknown expense.');
    if (e.status === 'approved' && !u.isOwner) throw new Forbidden('Approved expenses are locked.');
    await q(`UPDATE expenses SET title = $2, amount = $3, status = 'pending', approved_by = NULL WHERE id = $1`, [id, title, amount]);
    await audit(u, 'expense.edited', 'expense', id, { amount });
    revalidatePath('/admin/finance');
    return { ok: true, message: 'Saved. It needs approval again.' };
  } catch (e) { return fail(e); }
}

export async function saveCompanyAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'admin.settings');
    const cur = await getCompany();
    const tax = Number(s(fd, 'taxPercent', 6) || 0);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) throw bad('Tax must be between 0 and 100.');
    await saveCompany({ ...cur, name: s(fd, 'name', 80) || cur.name, tagline: s(fd, 'tagline', 80), address: s(fd, 'address', 240), phone: s(fd, 'phone', 40), email: s(fd, 'email', 120), website: s(fd, 'website', 120),
      bank: s(fd, 'bank', 400), mobileBanking: s(fd, 'mobileBanking', 200), tradeLicense: s(fd, 'tradeLicense', 60), tin: s(fd, 'tin', 40), bin: s(fd, 'bin', 40), signatoryName: s(fd, 'signatoryName', 80), signatoryTitle: s(fd, 'signatoryTitle', 80) || 'Authorised signatory', quotationValidDays: Math.min(365, Math.max(1, Math.round(Number(s(fd, 'quotationValidDays', 4)) || 15))), invoiceFooter: s(fd, 'invoiceFooter', 200), defaultTerms: s(fd, 'defaultTerms', 1500), defaultPaymentTerms: s(fd, 'defaultPaymentTerms', 500), taxLabel: s(fd, 'taxLabel', 20) || 'VAT', taxPercent: tax });
    await audit(u, 'settings.company_saved', 'settings', 'company');
    revalidatePath('/admin/settings');
    return { ok: true, message: 'Company details saved. New PDFs use them.' };
  } catch (e) { return fail(e); }
}
