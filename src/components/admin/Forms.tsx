'use client';
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PERM_GROUPS, PRESETS } from '@/server/perms';

export interface R { ok?: boolean; error?: string; message?: string; redirect?: string; note?: string }
type Action = (prev: R, fd: FormData) => Promise<R>;

export function ActionForm({ action, children, submit = 'Save', className = 'ad-form', resetOnOk, extra }: {
  action: Action; children: ReactNode; submit?: string; className?: string; resetOnOk?: boolean; extra?: ReactNode;
}) {
  const [state, run, pending] = useActionState(action, {} as R);
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) { if (resetOnOk) form.current?.reset(); if (state.redirect) router.push(state.redirect); else router.refresh(); }
  }, [state, router, resetOnOk]);
  return (
    <form ref={form} action={run} className={className}>
      {children}
      {state.error && <p className="ad-msg err" role="alert">{state.error}</p>}
      {state.ok && state.message && <p className="ad-msg ok" role="status">{state.message}</p>}
      {state.note && <p className="ad-msg warn" role="status">{state.note}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="submit" className="ad-btn primary" disabled={pending}>{pending ? 'Working…' : submit}</button>
        {extra}
      </div>
    </form>
  );
}

/** Button that runs a server action (optionally after a confirm prompt) and refreshes the page. */
export function ActionButton({ action, label, confirm, tone = '', size = 'sm', redirectTo }: {
  action: () => Promise<R>; label: string; confirm?: string; tone?: '' | 'danger' | 'primary'; size?: '' | 'sm'; redirectTo?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const router = useRouter();
  return (
    <>
      <button type="button" className={`ad-btn ${size} ${tone}`} disabled={pending} onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => { const r = await action(); if (r.error) setErr(r.error); else { setErr(''); if (r.redirect || redirectTo) router.push(r.redirect ?? redirectTo!); else router.refresh(); } });
      }}>{pending ? 'Working…' : label}</button>
      {err && <span className="ad-msg err small" role="alert">{err}</span>}
    </>
  );
}

export function Modal({ trigger, title, children, wide }: { trigger: ReactNode; title: string; children: (close: () => void) => ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  return (
    <>
      <span onClick={() => ref.current?.showModal()} style={{ display: 'inline-flex' }}>{trigger}</span>
      <dialog ref={ref} style={wide ? { width: 'min(820px, 94vw)' } : undefined} onClick={(e) => { if (e.target === ref.current) close(); }}>
        <div style={{ padding: 24, display: 'grid', gap: 16 }}>
          <div className="ad-card__head" style={{ margin: 0 }}><h2>{title}</h2><button type="button" className="ad-btn sm" onClick={close} aria-label="Close">✕</button></div>
          {children(close)}
        </div>
      </dialog>
    </>
  );
}

/** Grouped permission editor. The value is posted as a JSON array in the hidden `perms` field and re-validated on the server. */
export function PermEditor({ initial, grantable, name = 'perms' }: { initial: string[]; grantable: string[] | 'all'; name?: string }) {
  const [sel, setSel] = useState<Set<string>>(new Set(initial));
  const okKey = (k: string) => grantable === 'all' || grantable.includes(k) || initial.includes(k);
  const toggle = (k: string) => setSel((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const group = (keys: string[], on: boolean) => setSel((s) => { const n = new Set(s); keys.filter(okKey).forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
  return (
    <div className="ad-perms">
      <input type="hidden" name={name} value={JSON.stringify([...sel])} />
      <div>
        <span className="ad-label">Start from a preset (you can customise everything afterwards)</span>
        <div className="ad-chips" style={{ marginTop: 8 }}>
          {PRESETS.map((p) => <button key={p.id} type="button" className="ad-chip" onClick={() => setSel(new Set(p.perms.filter(okKey)))}>{p.label}</button>)}
          <button type="button" className="ad-chip" onClick={() => setSel(new Set())}>Clear all</button>
        </div>
      </div>
      {PERM_GROUPS.map((g) => {
        const keys = g.perms.map((p) => p.key);
        const count = keys.filter((k) => sel.has(k)).length;
        return (
          <section key={g.id} className="ad-pgroup">
            <header><span>{g.label} <span className="muted small">({count}/{keys.length})</span></span>
              <span style={{ display: 'flex', gap: 6 }}><button type="button" className="ad-btn sm" onClick={() => group(keys, true)}>All</button><button type="button" className="ad-btn sm" onClick={() => group(keys, false)}>None</button></span>
            </header>
            <div className="list">
              {g.perms.map((p) => {
                const locked = !okKey(p.key);
                return (
                  <label key={p.key} className={`ad-perm${locked ? ' locked' : ''}`} title={locked ? 'You cannot grant a permission you do not hold yourself.' : undefined}>
                    <input type="checkbox" checked={sel.has(p.key)} disabled={locked} onChange={() => toggle(p.key)} />
                    <span>{p.label}{p.hint && <small>{p.hint}</small>}</span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Button that asks for a short note first (e.g. why a revision is needed), then runs the action. */
export function PromptButton({ action, label, question, tone = '' }: { action: (note: string) => Promise<R>; label: string; question: string; tone?: '' | 'danger' | 'primary' }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const router = useRouter();
  return (
    <>
      <button type="button" className={`ad-btn sm ${tone}`} disabled={pending} onClick={() => {
        const note = window.prompt(question);
        if (note === null) return;
        start(async () => { const r = await action(note); if (r.error) setErr(r.error); else { setErr(''); router.refresh(); } });
      }}>{pending ? 'Working…' : label}</button>
      {err && <span className="ad-msg err small" role="alert">{err}</span>}
    </>
  );
}
