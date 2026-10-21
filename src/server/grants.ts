import { can, Forbidden, type User } from './auth';

/** Anti-escalation: you can only grant what you hold, admin-scope grants need delegate rights, and nobody edits their own access. */
export function checkGrant(actor: User, target: { id: string; isOwner: boolean }, wanted: string[]) {
  if (actor.isOwner) return;
  if (target.id === actor.id) throw new Forbidden('You cannot change your own permissions.');
  if (target.isOwner) throw new Forbidden('The Main Admin account cannot be modified.');
  if (!can(actor, 'admin.edit_permissions')) throw new Forbidden('You are not allowed to edit permissions.');
  for (const k of wanted) {
    if (!actor.perms.includes(k)) throw new Forbidden('You cannot grant a permission you do not hold yourself.');
    if (k.startsWith('admin.') && !can(actor, 'admin.delegates')) throw new Forbidden('Granting administrative permissions needs delegate-management rights.');
  }
}
