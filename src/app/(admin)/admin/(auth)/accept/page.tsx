import { findInvite } from '@/server/auth';
import { acceptInviteAction } from '@/server/actions/auth';
import { ActionForm } from '@/components/admin/Forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up your account' };

export default async function AcceptPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? '';
  const inv = token ? await findInvite(token) : null;
  if (!inv) return <div className="ad-auth"><div className="ad-card"><h2>Invitation not valid</h2><p className="muted">This link is invalid or has expired. Ask your administrator to send a new invitation.</p></div></div>;
  return (
    <div className="ad-auth">
      <div className="ad-card">
        <h1>Welcome, {inv.name.split(' ')[0]}</h1>
        <p className="muted">Choose a password for {inv.email}.</p>
        <ActionForm action={acceptInviteAction} submit="Activate my account">
          <input type="hidden" name="token" value={token} />
          <div className="ad-field"><label htmlFor="p">Password</label><input id="p" name="password" type="password" autoComplete="new-password" required /></div>
          <div className="ad-field"><label htmlFor="p2">Repeat password</label><input id="p2" name="password2" type="password" autoComplete="new-password" required /></div>
          <p className="muted small">At least 10 characters with letters and a number.</p>
        </ActionForm>
      </div>
    </div>
  );
}
