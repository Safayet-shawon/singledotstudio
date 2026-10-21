import { q } from './db';
import type { User } from './auth';

/** Append-only audit trail. Never pass passwords, tokens or other credentials in `detail`. */
export async function audit(actor: Pick<User, 'id' | 'name'> | null, action: string, entity?: string, entityId?: string, detail?: Record<string, unknown>) {
  await q(`INSERT INTO audit_log (actor_id, actor_name, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5,$6)`, [actor?.id ?? null, actor?.name ?? null, action, entity ?? null, entityId ?? null, detail ? JSON.stringify(detail) : null]);
}

/** In-app notification. This is not an email: nothing is claimed as delivered outside the app. */
export async function notify(userIds: string[], kind: string, title: string, body?: string, link?: string) {
  const ids = [...new Set(userIds)];
  for (const id of ids) await q(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5)`, [id, kind, title, body ?? null, link ?? null]);
}
