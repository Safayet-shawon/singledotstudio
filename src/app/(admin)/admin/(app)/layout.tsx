import { requireUser, canAny } from '@/server/auth';
import { NAV } from '@/server/perms';
import { q } from '@/server/db';
import { logoutAction, markNotificationsRead } from '@/server/actions/auth';
import { Shell, type ShellNote } from '@/components/admin/Shell';

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' });

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const nav = NAV.filter((n) => !n.any || canAny(u, n.any)).map(({ href, label, icon }) => ({ href, label, icon }));
  const rows = await q<{ id: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string }>(
    `SELECT id::text, title, body, link, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 8`, [u.id]);
  const unread = await q<{ n: string }>(`SELECT count(*)::text AS n FROM notifications WHERE user_id = $1 AND NOT read`, [u.id]);
  const notes: ShellNote[] = rows.map((r) => ({ id: Number(r.id), title: r.title, body: r.body, link: r.link, read: r.read, at: fmt(new Date(r.created_at)) }));
  const initials = u.name.split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('');
  return (
    <Shell nav={nav} user={{ name: u.name, sub: u.isOwner ? 'Main Admin' : u.position ?? 'Team member', initials, photo: u.photoMedia ? `/cms-media/${u.photoMedia}` : null }}
      notes={notes} unread={Number(unread[0]?.n ?? 0)} logout={logoutAction} markRead={markNotificationsRead}>
      {children}
    </Shell>
  );
}
