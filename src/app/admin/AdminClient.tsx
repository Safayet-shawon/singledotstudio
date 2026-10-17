'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (res.ok) router.refresh(); else setErr((await res.json().catch(() => ({}))).error || 'Could not sign in.');
  }
  return (
    <form onSubmit={go} className="stack" style={{ maxWidth: 360, marginTop: 20 }}>
      <div className="field"><label htmlFor="ad-pw">Password</label><input id="ad-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn btn--solid" disabled={busy || !pw}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}

export function AdminLogout() {
  const router = useRouter();
  return <button type="button" className="btn" onClick={async () => { await fetch('/api/admin/login', { method: 'DELETE' }); router.refresh(); }}>Sign out</button>;
}
