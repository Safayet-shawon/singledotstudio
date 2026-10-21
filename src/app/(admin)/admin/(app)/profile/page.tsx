import { requireUser } from '@/server/auth';
import { changePasswordAction } from '@/server/actions/auth';
import { ActionForm } from '@/components/admin/Forms';
import { Card } from '@/components/admin/Ui';
import { permLabel } from '@/server/perms';

export const metadata = { title: 'My profile' };

export default async function Profile() {
  const u = await requireUser();
  return (
    <div className="ad-grid" style={{ maxWidth: 760 }}>
      <Card title={u.name}>
        <p className="muted" style={{ margin: 0 }}>{u.isOwner ? 'Main Admin' : u.position ?? 'Team member'}{u.department ? ` · ${u.department}` : ''} · {u.email}</p>
        <p className="small muted">{u.isOwner ? 'You have full access.' : `You have ${u.perms.length} permission${u.perms.length === 1 ? '' : 's'}.`}</p>
        {!u.isOwner && u.perms.length > 0 && <div className="ad-chips">{u.perms.map((p) => <span key={p} className="ad-badge">{permLabel(p)}</span>)}</div>}
      </Card>
      <Card title="Change password">
        <ActionForm action={changePasswordAction} submit="Update password" resetOnOk>
          <div className="ad-field"><label htmlFor="c">Current password</label><input id="c" name="current" type="password" autoComplete="current-password" required /></div>
          <div className="ad-row"><div className="ad-field"><label htmlFor="n">New password</label><input id="n" name="password" type="password" autoComplete="new-password" required /></div><div className="ad-field"><label htmlFor="n2">Repeat</label><input id="n2" name="password2" type="password" autoComplete="new-password" required /></div></div>
        </ActionForm>
      </Card>
    </div>
  );
}
