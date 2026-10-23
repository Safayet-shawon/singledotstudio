'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { pricing } from '@/lib/pricing';
import { store, KEYS } from '@/lib/storage';
import { itemsFor, maxQty, isResidential, type EstimateInput, type PackageKey, type PropertyType } from '@/lib/estimate';

const TYPE_LABEL: Record<PropertyType, string> = { apartment: 'Home', villa: 'Home', office: 'Office', showroom: 'Showroom' };
const RANGES = [
  { id: '600-899', label: '600-899', mid: 750 }, { id: '900-1199', label: '900-1199', mid: 1050 },
  { id: '1200-1349', label: '1200-1349', mid: 1275 }, { id: '1350-1499', label: '1350-1499', mid: 1425 },
  { id: '1500-1649', label: '1500-1649', mid: 1575 }, { id: '1650-1799', label: '1650-1799', mid: 1725 },
  { id: '1800-1949', label: '1800-1949', mid: 1875 }, { id: '1950-2099', label: '1950-2099', mid: 2025 },
  { id: '2100-2249', label: '2100-2249', mid: 2175 }, { id: '2250-2399', label: '2250-2399', mid: 2325 },
  { id: '2400-2549', label: '2400-2549', mid: 2475 }, { id: '2550-2699', label: '2550-2699', mid: 2625 },
  { id: '2700+', label: '2700+', mid: 2850 },
];
const BHKS = [1, 2, 3, 4, 5, 6];
const OPTIONAL = new Set(['foyer', 'wardrobe', 'study', 'balcony', 'ceiling']);
const PKGS: { key: PackageKey; tone: string }[] = [
  { key: 'essential', tone: 'c1' }, { key: 'premium', tone: 'c2' }, { key: 'luxury', tone: 'c3' }, { key: 'bestfit', tone: 'c4' },
];
const STEP_NAMES = ['Space', 'Rooms', 'Package', 'Details'];

interface Result { reference: string; customerEmail: 'sent' | 'sample' | 'not_configured' | 'failed'; teamNotified: boolean }
interface State {
  step: number; type: PropertyType | null; range: string | null; custom: string; bhk: number | null;
  items: Record<string, number>; extras: string[]; pkg: PackageKey | null;
  name: string; email: string; phone: string; whatsapp: boolean; address: string; consent: boolean;
}
const initial: State = { step: 1, type: null, range: null, custom: '', bhk: null, items: {}, extras: [], pkg: null, name: '', email: '', phone: '', whatsapp: false, address: '', consent: false };

export default function Calculator({ variant, onClose }: { variant: 'dialog' | 'page'; onClose?: () => void }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [hp, setHp] = useState('');
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const bodyRef = useRef<HTMLDivElement>(null);
  const set = useCallback((p: Partial<State>) => setS((o) => ({ ...o, ...p })), []);

  useEffect(() => {
    const d = store.get<State>(KEYS.draft);
    if (d && typeof d.step === 'number') setS({ ...initial, ...d });
    setReady(true);
  }, []);
  useEffect(() => { if (ready && !result) store.set(KEYS.draft, s); }, [s, ready, result]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [s.step, result]);

  const type = s.type;
  const resid = type ? isResidential(type) : true;
  const bhk = resid ? s.bhk ?? 0 : 1;
  const sqft = s.custom.trim() ? Number(s.custom) : RANGES.find((r) => r.id === s.range)?.mid ?? 0;
  const sizeLabel = s.custom.trim() ? `${Math.round(Number(s.custom))} sq ft` : s.range ?? '';
  const defs = useMemo(() => (type ? itemsFor(pricing, type) : []), [type]);
  const roomDefs = defs.filter((d) => maxQty(d, bhk || 1) > 0);

  // Guided order: the next unfinished group glows, later groups wait in the shadow, finished groups stay visible and editable.
  const sizeOk = sqft >= pricing.limits.minSqft && sqft <= pricing.limits.maxSqft;
  const stage1 = !type ? 0 : !sizeOk ? 1 : resid && !s.bhk ? 2 : 3;
  const stage2 = Object.keys(s.items).length === 0 ? 0 : 1;
  const sec = (n: number, stage: number) => `cqw-sec ${stage === n ? 'is-active' : n < stage ? 'is-done' : 'is-locked'}`;

  function validate(step: number) {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!type) e.type = 'Please choose what you are designing.';
      if (!(sqft >= pricing.limits.minSqft && sqft <= pricing.limits.maxSqft)) e.size = s.custom.trim() ? `Enter a size between ${pricing.limits.minSqft} and ${pricing.limits.maxSqft} sq ft.` : 'Please select your size.';
      if (resid && !s.bhk) e.bhk = 'Please choose how many bedrooms (BHK).';
    }
    if (step === 2 && Object.keys(s.items).length === 0) e.items = 'Please select at least one room.';
    if (step === 3 && !s.pkg) e.pkg = 'Please select a package.';
    if (step === 4) {
      if (s.name.trim().length < 2) e.name = 'Enter your full name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) e.email = 'Enter a valid email address.';
      if (!/^\+?[\d\s\-()]{7,20}$/.test(s.phone.trim())) e.phone = 'Enter a valid phone number.';
      if (!s.consent) e.consent = 'Please confirm you agree to be contacted.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  const next = () => { if (validate(s.step)) { setDir('fwd'); set({ step: s.step + 1 }); } };
  const prev = () => { setErrors({}); setDir('back'); set({ step: Math.max(1, s.step - 1) }); };

  const toggleItem = (key: string, max: number) => {
    const items = { ...s.items };
    if (items[key]) delete items[key];
    else items[key] = key === 'workstation' ? 10 : key === 'child' || key === 'toilet' ? max : 1;
    set({ items });
  };
  const setQty = (key: string, q: number, max: number) => {
    const items = { ...s.items };
    if (q <= 0) delete items[key]; else items[key] = Math.min(max, q);
    set({ items });
  };

  async function submit() {
    if (!validate(4) || !type || !s.pkg) return;
    const estimateInput: EstimateInput = { propertyType: type, sqft, bhk: bhk || 1, items: s.items, package: s.pkg, extras: s.extras, targetBudget: null, sizeLabel };
    setSubmitting(true); setServerError('');
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateInput, name: s.name, phone: s.phone, whatsapp: s.whatsapp, email: s.email, address: s.address, consent: s.consent, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      store.set(KEYS.prompt, 'completed'); store.remove(KEYS.draft);
      setResult(data as Result);
    } catch (e) { setServerError((e as Error).message); } finally { setSubmitting(false); }
  }
  const reset = () => { store.remove(KEYS.draft); setS(initial); setErrors({}); setServerError(''); setResult(null); setDir('back'); };
  const err = (k: string) => (errors[k] ? <p className="err" role="alert">{errors[k]}</p> : null);

  const titles: Record<number, ReactNode> = {
    1: <>Tell us about your <em>{type === 'office' ? 'office' : type === 'showroom' ? 'showroom' : 'home'}</em></>,
    2: <>Which spaces should we <em>design</em>?</>,
    3: <>Choose the <em>package</em> that suits you</>,
    4: <>Where should we send your <em>quotation</em>?</>,
  };

  // A plain render helper (not a component) so typing never remounts the inputs.
  const frame = (children: ReactNode, foot: ReactNode) => (
    <div className={`calc-panel cqw${variant === 'page' ? ' calc-panel--page' : ''}`}>
      <div className="cqw-head">
        <span className="cqw-kicker">Interior budget calculator</span>
        {variant === 'dialog' && <button type="button" className="calc__close cqw-x" aria-label="Close" onClick={onClose}><Icon name="close" size={24} /></button>}
        {!result && <><ol className="cqw-steps" aria-label={`Step ${s.step} of 4`}>{STEP_NAMES.map((n, i) => <li key={n} className={s.step === i + 1 ? 'is-now' : s.step > i + 1 ? 'is-done' : ''} aria-current={s.step === i + 1 ? 'step' : undefined}><i>{s.step > i + 1 ? <Icon name="check" size={12} /> : i + 1}</i><span>{n}</span></li>)}</ol><h2>{titles[s.step]}</h2></>}
        {result && <h2>Thank <b>you</b></h2>}
      </div>
      <div className="cqw-body" ref={bodyRef}>{children}</div>
      <div className="cqw-foot">{foot}</div>
    </div>
  );

  /* ---------- result ---------- */
  if (result) {
    return frame(
      <div className="cqw-done">
        <span className="cqw-done__icon"><Icon name="check" size={36} /></span>
        <h3>Your quotation request is in</h3>
        {result.customerEmail === 'sent'
          ? <p>We have emailed your quotation to <strong>{s.email}</strong>. Please check your inbox, and the spam folder if you do not see it.</p>
          : <p>We received your request and will email your quotation to <strong>{s.email}</strong> shortly.</p>}
        <p className="hint">Reference {result.reference}</p>
      </div>,
      <><button type="button" className="cqw-btn ghost" onClick={reset}>New request</button>{variant === 'dialog' && <button type="button" className="cqw-btn" onClick={onClose}>Close</button>}</>,
    );
  }

  /* ---------- steps ---------- */
  const foot = (
    <>
      {s.step > 1 ? <button type="button" className="cqw-btn ghost" onClick={prev}><Icon name="prev" size={16} /> Prev</button> : <span />}
      {s.step < 4
        ? <button type="button" className="cqw-btn" onClick={next}>Next <Icon name="arrow" size={16} /></button>
        : <button type="button" className="cqw-btn" onClick={submit} disabled={submitting}>{submitting ? 'Sending…' : 'Send my quotation'} {!submitting && <Icon name="arrow" size={16} />}</button>}
    </>
  );

  return frame(
      <div key={s.step} className={`cqw-page ${dir}`}>
        {s.step === 1 && (
          <>
            <section className={sec(0, stage1)}>
              <p className="cqw-sub cqw-sub--first">1 · What are you designing?</p>
              <div className="cqw-types" role="group" aria-label="Property type">
                {(['apartment', 'office', 'showroom'] as const).map((k) => (
                  <button key={k} type="button" className="cqw-pill" aria-pressed={type === k} onClick={() => set({ type: k, bhk: isResidential(k) ? s.bhk : 1, items: type === k ? s.items : {} })}>{TYPE_LABEL[k]}</button>
                ))}
              </div>
              {err('type')}
            </section>
            <section className={sec(1, stage1)} inert={stage1 < 1}>
              <p className="cqw-sub">2 · {resid ? 'Carpet area' : type === 'showroom' ? 'Showroom area' : 'Office area'} in sq ft</p>
              <div className="cqw-sizes" role="radiogroup" aria-label="Size in square feet">
                {RANGES.map((r, i) => {
                  const on = !s.custom.trim() && s.range === r.id;
                  return (
                    <button key={r.id} type="button" role="radio" aria-checked={on} className={`cqw-size${on ? ' is-on' : ''}`} style={{ ['--i' as string]: i }} onClick={() => set({ range: r.id, custom: '' })}>{r.label}</button>
                  );
                })}
              </div>
              <div className="cqw-custom">
                <label htmlFor="cqw-sq">Or type your exact size (sq ft)</label>
                <input id="cqw-sq" type="number" inputMode="numeric" placeholder="e.g. 1420" value={s.custom} onChange={(e) => set({ custom: e.target.value, range: e.target.value ? null : s.range })} />
              </div>
              {err('size')}
            </section>
            {resid && (
              <section className={sec(2, stage1)} inert={stage1 < 2}>
                <p className="cqw-sub">3 · Bedrooms (BHK)</p>
                <div className="cqw-bhks" role="radiogroup" aria-label="BHK type">
                  {BHKS.map((n) => <button key={n} type="button" role="radio" aria-checked={s.bhk === n} className={`cqw-bhk${s.bhk === n ? ' is-on' : ''}`} onClick={() => set({ bhk: n })}>{n}{n === 6 ? '+' : ''}<small>BHK</small></button>)}
                </div>
                {err('bhk')}
              </section>
            )}
          </>
        )}

        {s.step === 2 && (
          <>
            <section className={sec(0, stage2)}>
            <div className="cqw-grid cqw-rooms" role="group" aria-label="Rooms to design">
              {roomDefs.filter((d) => !OPTIONAL.has(d.key)).map((d, i) => <RoomOption key={d.key} i={i} label={d.label} qty={s.items[d.key] ?? 0} max={maxQty(d, bhk || 1)} onToggle={() => toggleItem(d.key, maxQty(d, bhk || 1))} onQty={(q) => setQty(d.key, q, maxQty(d, bhk || 1))} />)}
            </div>
            {err('items')}
            </section>
            <section className={sec(1, stage2)} inert={stage2 < 1}>
            <p className="cqw-sub">Add-on</p>
            <div className="cqw-chips">
              {pricing.extras.filter((x) => x.key === 'smart').map((x) => <button key={x.key} type="button" className="cqw-chip" aria-pressed={s.extras.includes(x.key)} onClick={() => set({ extras: s.extras.includes(x.key) ? s.extras.filter((k) => k !== x.key) : [...s.extras, x.key] })}>{x.label}</button>)}
            </div>
            </section>
          </>
        )}

        {s.step === 3 && (
          <>
            <div className="cqw-pkgs" role="radiogroup" aria-label="Package">
              {PKGS.map(({ key, tone }, i) => {
                const p = pricing.packages[key];
                const on = s.pkg === key;
                return (
                  <div key={key} className={`cqw-pkg cqw-pkg--${tone}${on ? ' is-on' : ''}`} style={{ ['--i' as string]: i }} onClick={() => set({ pkg: key })}>
                    <span className="cqw-pkg__fill" aria-hidden="true"><i /></span>
                    <h3 className="cqw-pkg__name">{p.label}</h3>
                    <div className="cqw-pkg__blob">
                      <svg viewBox="0 0 280 140" preserveAspectRatio="none" aria-hidden="true">
                        <defs><linearGradient id={`pg-${key}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--c1)' }} /><stop offset="1" style={{ stopColor: 'var(--c2)' }} /></linearGradient></defs>
                        <path d="M0 22C0 8 8 0 24 0h232c16 0 24 8 24 22v34c0 30-40 28-86 14-48-15-86-20-130 24-26 26-64 32-64 8z" fill={`url(#pg-${key})`} />
                      </svg>
                      <p className="cqw-pkg__tag">{key === 'bestfit' ? 'Designed around you' : p.tagline}</p>
                    </div>
                    <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                    <div className="cqw-pkg__ribbon"><button type="button" role="radio" aria-checked={on} className="cqw-select" onClick={(e) => { e.stopPropagation(); set({ pkg: key }); }}>{on ? 'Selected ✓' : 'Select'}</button></div>
                  </div>
                );
              })}
            </div>
            {err('pkg')}
          </>
        )}

        {s.step === 4 && (
          <div className="cqw-details">
            <aside className="cqw-art" aria-hidden="true">
              <div className="cqw-art__top">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-mark.svg" alt="" width={34} height={42} />
                <p>Almost there.<br />Let&apos;s shape <b>your space</b>.</p>
              </div>
              <svg className="cqw-scene" viewBox="0 0 420 330" role="presentation">
                <ellipse className="sc-rug" cx="250" cy="318" rx="130" ry="10" />
                <g className="sc-arch">
                  <path className="sc-win" d="M40 318V160c0-62 38-104 90-120 52 16 90 58 90 120v158z" />
                  <path className="sc-arch__line" pathLength="1" d="M40 318V160c0-62 38-104 90-120 52 16 90 58 90 120v158" />
                  <path className="sc-pane" d="M130 52v266M62 190h136" />
                </g>
                <circle className="sc-dot" cx="130" cy="22" r="13" />
                <g className="sc-frame"><rect x="262" y="96" width="78" height="56" rx="3" /><path d="M270 144l20-22 14 14 12-12 24 20z" /><circle cx="318" cy="112" r="5" /></g>
                <g className="sc-chair"><rect className="sc-back" x="262" y="188" width="86" height="64" rx="22" /><rect className="sc-seat" x="250" y="236" width="110" height="38" rx="14" /><rect className="sc-arm" x="244" y="222" width="20" height="52" rx="10" /><rect className="sc-arm" x="346" y="222" width="20" height="52" rx="10" /><path className="sc-leg" d="M268 274l-6 40M342 274l6 40" /></g>
                <g className="sc-lamp"><circle className="sc-glow" cx="396" cy="170" r="34" /><path className="sc-leg" d="M396 318V182" /><path className="sc-shade" d="M380 184l8-30h16l8 30z" /></g>
                <g className="sc-plant"><path className="sc-pot" d="M8 318l6-38h34l6 38z" /><g className="sc-leaves"><ellipse cx="31" cy="238" rx="9" ry="34" transform="rotate(-8 31 238)" /><ellipse cx="14" cy="252" rx="8" ry="26" transform="rotate(-38 14 252)" /><ellipse cx="50" cy="250" rx="8" ry="26" transform="rotate(34 50 250)" /></g></g>
                <path className="sc-floor" d="M0 318h420" />
              </svg>
            </aside>
            <form className="cqw-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <div className="cqw-form__full cqw-form__head">
                <h3>Your details</h3>
                <p>{TYPE_LABEL[type ?? 'apartment']} · {sizeLabel}{sizeLabel.endsWith('sq ft') ? '' : ' sq ft'}{resid && bhk ? ` · ${bhk} BHK` : ''} · {s.pkg === 'bestfit' ? 'Custom Package' : s.pkg ? pricing.packages[s.pkg].label : ''}</p>
              </div>
              <div className="cqw-f"><label htmlFor="cqw-name">Full name</label><span className="cqw-in"><Icon name="user" size={17} /><input id="cqw-name" type="text" autoComplete="name" placeholder="Your name" value={s.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} /></span>{err('name')}</div>
              <div className="cqw-f"><label htmlFor="cqw-email">Email address</label><span className="cqw-in"><Icon name="mail" size={17} /><input id="cqw-email" type="email" autoComplete="email" placeholder="you@example.com" value={s.email} aria-invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} /></span>{err('email')}</div>
              <div className="cqw-f">
                <label htmlFor="cqw-phone">Phone number</label>
                <span className="cqw-in"><Icon name="phone" size={17} /><input id="cqw-phone" type="tel" autoComplete="tel" placeholder="+880 1XXX XXXXXX" value={s.phone} aria-invalid={!!errors.phone} onChange={(e) => set({ phone: e.target.value })} /></span>
                <label className="cqw-wa"><input type="checkbox" checked={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.checked })} /><span>This is my <b>WhatsApp</b> number</span></label>
                {err('phone')}
              </div>
              <div className="cqw-f"><label htmlFor="cqw-addr">Project address / area</label><span className="cqw-in"><Icon name="pin" size={17} /><input id="cqw-addr" type="text" autoComplete="street-address" placeholder="Area, city" value={s.address} onChange={(e) => set({ address: e.target.value })} /></span></div>
              <div className="hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label></div>
              <label className="cqw-consent cqw-form__full"><input type="checkbox" checked={s.consent} onChange={(e) => set({ consent: e.target.checked })} aria-invalid={!!errors.consent} /><span>I agree to be contacted about this quotation, as described in the privacy policy.</span></label>
              <div className="cqw-form__full">{err('consent')}</div>
              {serverError && <p className="notice notice--error cqw-form__full" role="alert">{serverError}</p>}
            </form>
          </div>
        )}
      </div>,
    foot,
  );
}

function RoomOption({ label, qty, max, onToggle, onQty, i }: { label: string; qty: number; max: number; onToggle: () => void; onQty: (q: number) => void; i: number }) {
  const on = qty > 0;
  return (
    <div className={`cqw-opt cqw-room${on ? ' is-on' : ''}`} style={{ ['--i' as string]: i }}>
      <button type="button" role="checkbox" aria-checked={on} className="cqw-room__main" onClick={onToggle}>
        <span className="cqw-box" aria-hidden="true">{on && <Icon name="check" size={13} />}</span>
        <span>{label}</span>
      </button>
      {on && max > 1 && (
        <div className="qty" role="group" aria-label={`${label} quantity`}>
          <button type="button" aria-label="Decrease" onClick={() => onQty(qty - (label.startsWith('Workstation') ? 5 : 1))}>−</button>
          <span aria-live="polite">{qty}</span>
          <button type="button" aria-label="Increase" onClick={() => onQty(qty + (label.startsWith('Workstation') ? 5 : 1))}>+</button>
        </div>
      )}
    </div>
  );
}
