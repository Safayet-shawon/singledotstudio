'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { R } from './Forms';

export function MemberAdd({ projectId, people, action }: { projectId: string; people: { id: string; name: string }[]; action: (projectId: string, userId: string, role: 'manager' | 'member' | 'remove') => Promise<R> }) {
  const [user, setUser] = useState('');
  const [role, setRole] = useState<'member' | 'manager'>('member');
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
      <select value={user} onChange={(e) => setUser(e.target.value)} style={{ flex: 1, minWidth: 160 }} aria-label="Person to add"><option value="">Add a team member…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <select value={role} onChange={(e) => setRole(e.target.value as 'member' | 'manager')} style={{ width: 130 }} aria-label="Role"><option value="member">Member</option><option value="manager">Manager</option></select>
      <button type="button" className="ad-btn sm primary" disabled={!user || pending} onClick={() => start(async () => { const r = await action(projectId, user, role); if (r.error) setErr(r.error); else { setErr(''); setUser(''); router.refresh(); } })}>Add</button>
      {err && <span className="ad-msg err small" role="alert">{err}</span>}
    </div>
  );
}
