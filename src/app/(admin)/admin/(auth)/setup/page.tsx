import { notFound } from 'next/navigation';
import { dbConfigured, q1 } from '@/server/db';
import { setupAction } from '@/server/actions/auth';
import { ActionForm } from '@/components/admin/Forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up Main Admin' };

export default async function SetupPage() {
  if (!dbConfigured()) notFound();
  const c = await q1<{ n: string }>(`SELECT count(*)::text AS n FROM users`);
  if (!c || Number(c.n) > 0) notFound(); // the endpoint disappears once a Main Admin exists
  return (
    <div className="ad-auth">
      <div className="ad-card" style={{ width: 'min(480px,100%)' }}>
        <h1>Create the Main Admin</h1>
        <p className="muted">One-time setup. You need the setup key stored in the server environment (SETUP_TOKEN).</p>
        <ActionForm action={setupAction} submit="Create Main Admin">
          <div className="ad-field"><label htmlFor="t">Setup key</label><input id="t" name="token" type="password" autoComplete="off" required /></div>
          <div className="ad-field"><label htmlFor="n">Full name</label><input id="n" name="name" type="text" autoComplete="name" required /></div>
          <div className="ad-field"><label htmlFor="e">Email</label><input id="e" name="email" type="email" autoComplete="username" required /></div>
          <div className="ad-row">
            <div className="ad-field"><label htmlFor="p">Password</label><input id="p" name="password" type="password" autoComplete="new-password" required /></div>
            <div className="ad-field"><label htmlFor="p2">Repeat password</label><input id="p2" name="password2" type="password" autoComplete="new-password" required /></div>
          </div>
          <p className="muted small">At least 10 characters with letters and a number.</p>
        </ActionForm>
      </div>
    </div>
  );
}
