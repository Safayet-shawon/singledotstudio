import { redirect } from 'next/navigation';
import { dbConfigured, q1 } from '@/server/db';
import { getUser } from '@/server/auth';
import { loginAction } from '@/server/actions/auth';
import { ActionForm } from '@/components/admin/Forms';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (!dbConfigured()) return <div className="ad-auth"><div className="ad-card"><h2>Database not connected</h2><p className="muted">The management system needs a Postgres database. Connect one in Vercel (Storage) and redeploy.</p></div></div>;
  if (await getUser()) redirect('/admin');
  const first = await q1<{ n: string }>(`SELECT count(*)::text AS n FROM users`);
  if (first && Number(first.n) === 0) redirect('/admin/setup');
  return (
    <div className="ad-auth">
      <div className="ad-card">
        <div style={{ marginBottom: 22 }}>
          <svg viewBox="660 520 280 350" width="36" height="44" aria-hidden="true"><path d="M700 838V690c0-40 20-77 55-95M900 838V690c0-40-20-77-55-95" fill="none" stroke="#123d2b" strokeWidth="20" strokeLinecap="round" /><circle cx="800" cy="577" r="28" fill="#16a34a" /></svg>
          <h1 style={{ marginTop: 12 }}>Welcome back</h1>
          <p className="muted">Sign in to the Single Dot Studio workspace.</p>
        </div>
        <ActionForm action={loginAction} submit="Sign in">
          <div className="ad-field"><label htmlFor="e">Email</label><input id="e" name="email" type="email" autoComplete="username" required /></div>
          <div className="ad-field"><label htmlFor="p">Password</label><input id="p" name="password" type="password" autoComplete="current-password" required /></div>
        </ActionForm>
        <p className="muted small" style={{ marginTop: 18 }}>Accounts are created by the studio administrator. <Link href="/">Back to website</Link></p>
      </div>
    </div>
  );
}
