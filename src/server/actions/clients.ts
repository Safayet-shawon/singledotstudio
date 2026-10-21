'use server';
import { revalidatePath } from 'next/cache';
import { q, q1 } from '../db';
import { assertAny, assertCan, can, Forbidden } from '../auth';
import { canViewClient } from '../access';
import { audit } from '../audit';
import { bad, fail, me, s, UUID } from '../util';
import type { R } from '@/components/admin/Forms';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function createClientAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'client.create');
    const name = s(fd, 'name', 100), email = s(fd, 'email', 120);
    if (name.length < 2) throw bad('Enter the client name.');
    if (email && !EMAIL.test(email)) throw bad('Enter a valid email address.');
    const r = await q1<{ id: string }>(`INSERT INTO clients (name, company, phone, email, address, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [name, s(fd, 'company', 100) || null, s(fd, 'phone', 30) || null, email || null, s(fd, 'address', 300) || null, s(fd, 'notes', 2000) || null, u.id]);
    await audit(u, 'client.created', 'client', r!.id, { name });
    revalidatePath('/admin/clients');
    return { ok: true, redirect: `/admin/clients/${r!.id}` };
  } catch (e) { return fail(e); }
}

export async function updateClientAction(_: R, fd: FormData): Promise<R> {
  try {
    const u = await me();
    assertCan(u, 'client.edit');
    const id = s(fd, 'id', 40);
    if (!UUID.test(id) || !(await canViewClient(u, id))) throw new Forbidden('You do not have access to this client.');
    const name = s(fd, 'name', 100);
    if (name.length < 2) throw bad('Enter the client name.');
    const status = ['active', 'prospect', 'inactive'].includes(s(fd, 'status', 20)) ? s(fd, 'status', 20) : 'active';
    if (can(u, 'client.view_contact')) {
      const email = s(fd, 'email', 120);
      if (email && !EMAIL.test(email)) throw bad('Enter a valid email address.');
      await q(`UPDATE clients SET name=$2, company=$3, phone=$4, email=$5, address=$6, status=$7, notes=$8 WHERE id=$1`, [id, name, s(fd, 'company', 100) || null, s(fd, 'phone', 30) || null, email || null, s(fd, 'address', 300) || null, status, s(fd, 'notes', 2000) || null]);
    } else {
      // Without contact access, only non-contact fields can change; contact details stay untouched.
      await q(`UPDATE clients SET name=$2, company=$3, status=$4, notes=$5 WHERE id=$1`, [id, name, s(fd, 'company', 100) || null, status, s(fd, 'notes', 2000) || null]);
    }
    await audit(u, 'client.updated', 'client', id);
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true, message: 'Client saved.' };
  } catch (e) { return fail(e); }
}

/** Who may open this client. Only administrators with full client scope manage this. */
export async function setClientAccessAction(clientId: string, userId: string, on: boolean): Promise<R> {
  try {
    const u = await me();
    assertAny(u, ['client.view_all']);
    if (!UUID.test(clientId) || !UUID.test(userId)) throw bad('Unknown record.');
    if (on) await q(`INSERT INTO client_access (client_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [clientId, userId]);
    else await q(`DELETE FROM client_access WHERE client_id = $1 AND user_id = $2`, [clientId, userId]);
    await audit(u, on ? 'client.access_granted' : 'client.access_revoked', 'client', clientId, { userId });
    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}
