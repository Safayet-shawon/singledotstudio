'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ActionButton, ActionForm, PromptButton, type R } from './Forms';
import { Ico } from './Ico';
import { FONTS } from '@/server/fonts';

export function PublishBar({ dirty, canPublish, canDiscard, publish, discard }: { dirty: boolean; canPublish: boolean; canDiscard: boolean; publish: (note: string) => Promise<R>; discard: () => Promise<R> }) {
  return (
    <div className="ad-card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: dirty ? 'var(--amber-bg)' : 'var(--mint)', borderColor: 'transparent' }}>
      <b style={{ flex: 1, minWidth: 200 }}>{dirty ? 'You have unpublished changes' : 'The website is up to date'}</b>
      <span className="muted small" style={{ flex: '2 1 240px' }}>{dirty ? 'Edits are saved as a draft. Visitors see them only after you publish.' : 'Everything saved here is live.'}</span>
      {dirty && canDiscard && <ActionButton action={discard} label="Discard changes" tone="danger" confirm="Discard all unpublished changes?" />}
      {dirty && canPublish && <PromptButton action={publish} label="Publish to website" tone="primary" question="Add a short note for the version history (optional):" />}
    </div>
  );
}

export interface MediaItem { id: string; name: string; alt: string | null }

/** Choose a replacement from the media library for one image slot, or go back to the original. */
export function SlotPicker({ slot, media, current, setSlot, disabled }: { slot: string; media: MediaItem[]; current: string | null; setSlot: (slot: string, id: string | null) => Promise<R>; disabled?: boolean }) {
  const [val, setVal] = useState(current ?? '');
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const router = useRouter();
  const apply = (id: string | null) => start(async () => { const r = await setSlot(slot, id); if (r.error) setErr(r.error); else { setErr(''); router.refresh(); } });
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <select value={val} disabled={disabled || pending} onChange={(e) => { setVal(e.target.value); apply(e.target.value || null); }} aria-label={`Image for ${slot}`}>
        <option value="">Original image</option>{media.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {err && <span className="ad-msg err small">{err}</span>}
    </div>
  );
}

export function SlidesEditor({ initial, options, action }: { initial: string[]; options: { slot: string; label: string }[]; action: (p: R, fd: FormData) => Promise<R> }) {
  const [list, setList] = useState(initial);
  const move = (i: number, d: number) => setList((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const label = (s: string) => options.find((o) => o.slot === s)?.label ?? s;
  return (
    <ActionForm action={action} submit="Save slide order">
      <input type="hidden" name="slides" value={JSON.stringify(list)} />
      <ul className="ad-list">{list.map((s, i) => (
        <li key={s + i}><span>{i + 1}. {label(s)}</span>
          <span style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="ad-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button type="button" className="ad-btn sm" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down">↓</button>
            <button type="button" className="ad-btn sm danger" onClick={() => setList((l) => (l.length > 1 ? l.filter((_, k) => k !== i) : l))} aria-label="Remove">✕</button>
          </span></li>))}</ul>
      <select value="" onChange={(e) => { if (e.target.value) setList((l) => [...l, e.target.value]); }} aria-label="Add a slide">
        <option value="">Add a slide…</option>{options.filter((o) => !list.includes(o.slot)).map((o) => <option key={o.slot} value={o.slot}>{o.label}</option>)}
      </select>
    </ActionForm>
  );
}

interface Entry { slug: string; title: string; category: string; service: string; status: string; location: string | null; image: string; narrative: string; materials: string[]; scope: string[] }
const CATS = ['residential', 'kitchen', 'bedroom', 'bathroom', 'living-dining', 'office'];
const SVCS = ['kitchen', 'bedroom', 'bathroom', 'living-dining', 'office'];

export function PortfolioEditor({ initial, action }: { initial: Entry[]; action: (p: R, fd: FormData) => Promise<R> }) {
  const [items, setItems] = useState<Entry[]>(initial);
  const [open, setOpen] = useState<number | null>(null);
  const set = (i: number, p: Partial<Entry>) => setItems((l) => l.map((e, k) => (k === i ? { ...e, ...p } : e)));
  const move = (i: number, d: number) => setItems((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <ActionForm action={action} submit="Save portfolio">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div style={{ display: 'grid', gap: 10 }}>{items.map((e, i) => (
        <div key={i} className="ad-pgroup">
          <header><button type="button" className="ad-me" onClick={() => setOpen(open === i ? null : i)} style={{ fontWeight: 700 }}><Ico n="chev" s={16} /> {e.title || 'Untitled entry'} <span className="muted small">/{e.slug}</span></button>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="ad-btn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="ad-btn sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="ad-btn sm danger" onClick={() => { if (window.confirm('Remove this entry from the portfolio?')) setItems((l) => l.filter((_, k) => k !== i)); }}>Remove</button>
            </span></header>
          {open === i && (
            <div className="ad-form" style={{ padding: 14 }}>
              <div className="ad-row"><div className="ad-field"><label>Title</label><input type="text" value={e.title} onChange={(x) => set(i, { title: x.target.value })} /></div>
                <div className="ad-field"><label>Location (only if verified)</label><input type="text" value={e.location ?? ''} onChange={(x) => set(i, { location: x.target.value })} /></div></div>
              <div className="ad-row three">
                <div className="ad-field"><label>Category</label><select value={e.category} onChange={(x) => set(i, { category: x.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="ad-field"><label>Service</label><select value={e.service} onChange={(x) => set(i, { service: x.target.value })}>{SVCS.map((c) => <option key={c}>{c}</option>)}</select></div>
                <div className="ad-field"><label>Status</label><select value={e.status} onChange={(x) => set(i, { status: x.target.value })}><option value="concept">Concept design</option><option value="completed">Completed project</option></select></div>
              </div>
              <div className="ad-field"><label>Narrative</label><textarea value={e.narrative} onChange={(x) => set(i, { narrative: x.target.value })} /></div>
              <div className="ad-row">
                <div className="ad-field"><label>Materials (one per line)</label><textarea value={e.materials.join('\n')} onChange={(x) => set(i, { materials: x.target.value.split('\n') })} style={{ minHeight: 80 }} /></div>
                <div className="ad-field"><label>Scope (one per line)</label><textarea value={e.scope.join('\n')} onChange={(x) => set(i, { scope: x.target.value.split('\n') })} style={{ minHeight: 80 }} /></div>
              </div>
              <p className="muted small">Image slot: <code>{e.image}</code>. Replace its picture in the Images tab.</p>
            </div>
          )}
        </div>))}
      </div>
      <button type="button" className="ad-btn sm" onClick={() => { setItems((l) => [...l, { slug: '', title: 'New project', category: 'residential', service: 'living-dining', status: 'concept', location: null, image: '', narrative: '', materials: [], scope: [] }]); setOpen(items.length); }}>+ Add portfolio entry</button>
    </ActionForm>
  );
}

export function TypographyPreview({ initial }: { initial: { heading: string; body: string; hw: number; bw: number } }) {
  const [t, setT] = useState(initial);
  const h = FONTS.heading.find((f) => f.key === t.heading) ?? FONTS.heading[0];
  const b = FONTS.body.find((f) => f.key === t.body) ?? FONTS.body[0];
  return (
    <div className="ad-grid ad-cols-2" style={{ alignItems: 'start' }}>
      <div className="ad-form">
        <div className="ad-field"><label htmlFor="hf">Heading font</label><select id="hf" name="heading" value={t.heading} onChange={(e) => setT({ ...t, heading: e.target.value })}>{FONTS.heading.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></div>
        <div className="ad-field"><label htmlFor="hw">Heading weight</label><select id="hw" name="hw" value={t.hw} onChange={(e) => setT({ ...t, hw: Number(e.target.value) })}><option value={400}>Regular</option><option value={500}>Medium</option><option value={600}>Semibold</option></select></div>
        <div className="ad-field"><label htmlFor="bf">Body font</label><select id="bf" name="body" value={t.body} onChange={(e) => setT({ ...t, body: e.target.value })}>{FONTS.body.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></div>
        <div className="ad-field"><label htmlFor="bw">Body weight</label><select id="bw" name="bw" value={t.bw} onChange={(e) => setT({ ...t, bw: Number(e.target.value) })}><option value={300}>Light</option><option value={400}>Regular</option><option value={500}>Medium</option></select></div>
      </div>
      <div className="ad-doc" style={{ background: '#f7f2e9' }}>
        <p className="muted small">Live preview</p>
        <h2 style={{ fontFamily: h.stack, fontWeight: t.hw, fontSize: '2.1rem', color: '#26231f' }}>Spaces shaped around the way you live</h2>
        <h3 style={{ fontFamily: h.stack, fontWeight: t.hw, color: '#26231f', margin: '14px 0 6px' }}>Considered design, clearly managed</h3>
        <p style={{ fontFamily: b.stack, fontWeight: t.bw, color: '#3a3631' }}>Kitchens planned around how you cook, store and gather, with finishes chosen to last. Warm timber, honest stone and layered light make a home feel calm.</p>
      </div>
    </div>
  );
}
