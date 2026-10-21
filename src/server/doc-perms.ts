import { can, canAny, type User } from './auth';
import { isInvoiceKind } from './doc-math';

export type DocAct = 'create' | 'edit' | 'approve';

/** Create, edit and approve are separate permissions for each of quotations and invoices. */
export function docAllowed(u: User, type: string, act: DocAct) {
  if (u.isOwner) return true;
  const inv = isInvoiceKind(type);
  const k = inv ? 'invoice' : 'quote';
  if (act === 'create') return canAny(u, [`fin.${k}_create`, inv ? 'client.gen_invoice' : 'client.gen_quote', 'client.create_docs']);
  return can(u, `fin.${k}_${act}`);
}
