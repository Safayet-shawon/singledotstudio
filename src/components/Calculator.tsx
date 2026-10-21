'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { pricing } from '@/lib/pricing';
import { store, KEYS } from '@/lib/storage';
import { itemsFor, maxQty, isResidential, type EstimateInput, type PackageKey, type PropertyType } from '@/lib/estimate';

const TYPE_LABEL: Record<PropertyType, string> = { apartment: 'Apartment', villa: 'House / Villa', office: 'Office' };
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
const PKGS: { key: PackageKey; g: [string, string]; icon: string }[] = [
  { key: 'essential', g: ['#ef4f8a', '#ff8a65'], icon: 'star' },
  { key: 'premium', g: ['#0e9aa7', '#5fd3b0'], icon: 'gem' },
  { key: 'luxury', g: ['#ff9a5a', '#ffd36e'], icon: 'crown' },
];

interface Result { reference: string; customerEmail: 'sent' | 'sample' | 'not_configured' | 'failed'; teamNotified: boolean }
interface State {
  step: number; type: PropertyType | null; range: string | null; custom: string; bhk: number | null;
  items: Record<string, number>; extras: string[]; pkg: PackageKey | null;
  name: string; email: string; phone: string; whatsapp: boolean; address: string; consent: boolean;
}
const initial: State = { step: 1, type: null, range: null, custom: '', bhk: null, items: {}, extras: [], pkg: null, name: '', email: '', phone: '', whatsapp: false, address: '', consent: false };

function PkgIcon({ name }: { name: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true" {...p}>
      {name === 'star' && <path d="M16 4l3.6 7.4 8.1 1.1-5.9 5.7 1.4 8.1L16 22.4 8.8 26.3l1.4-8.1-5.9-5.7 8.1-1.1z" />}
      {name === 'gem' && <path d="M7 6h18l5 7-14 15L2 13zM2 13h28M11 6l-3 7 8 15M21 6l3 7-8 15" />}
      {name === 'crown' && <path d="M4 24l-1-13 7 5 6-9 6 9 7-5-1 13zM4 28h24" />}
      {name === 'pencil' && <path d="M5 27l2-7 14-14 5 5-14 14zM19 8l5 5M7 20l5 5" />}
    </svg>
  );
}

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

  function validate(step: number) {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!type) e.type = 'Please choose what you are designing.';
      if (!(sqft >= pricing.limits.minSqft && sqft <= pricing.limits.maxSqft)) e.size = s.custom.trim() ? `Enter a size between ${pricing.limits.minSqft} and ${pricing.limits.maxSqft} sq ft.` : 'Please select your size.';
      if (resid && !s.bhk) e.bhk = 'Please choose the BHK type from the dropdown on your size.';
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
    1: <>Select Your <b>{resid ? 'Flat' : 'Office'}</b> Size (sq ft){resid ? <> &amp; <em>BHK</em> Type</> : null}</>,
    2: <>Select Which <b>Room</b> You Want to <em>Design</em></>,
    3: <>Pick The <b>Package</b> That Suits You <em>Best</em></>,
    4: <>Where Should We <b>Send</b> Your <em>Quotation</em>?</>,
  };

  // A plain render helper (not a component) so typing never remounts the inputs.
  const frame = (children: ReactNode, foot: ReactNode) => (
    <div className={`calc-panel cqw${variant === 'page' ? ' calc-panel--page' : ''}`}>
      <div className="cqw-head">
        <span className="cqw-kicker">Know Your Perfect Interior Budget</span>
        {variant === 'dialog' && <button type="button" className="calc__close cqw-x" aria-label="Close" onClick={onClose}><Icon name="close" size={24} /></button>}
        {!result && <><span className="cqw-step">Step: {s.step}/4</span><h2>{titles[s.step]}</h2><div className="cqw-bar" aria-hidden="true"><i style={{ width: `${(s.step / 4) * 100}%` }} /></div></>}
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
            <div className="cqw-types" role="group" aria-label="Property type">
              {(['apartment', 'villa', 'office'] as const).map((k) => (
                <button key={k} type="button" className="cqw-pill" aria-pressed={type === k} onClick={() => set({ type: k, bhk: k === 'office' ? 1 : s.bhk, items: type === k ? s.items : {} })}>{TYPE_LABEL[k]}</button>
              ))}
            </div>
            {err('type')}
            <div className="cqw-grid" role="radiogroup" aria-label="Size in square feet">
              {RANGES.map((r, i) => {
                const on = !s.custom.trim() && s.range === r.id;
                return (
                  <div key={r.id} className={`cqw-opt cqw-range${on ? ' is-on' : ''}`} style={{ ['--i' as string]: i }} onClick={() => set({ range: r.id, custom: '' })}>
                    <span className="cqw-radio" aria-hidden="true" />
                    <button type="button" role="radio" aria-checked={on} className="cqw-range__label" onClick={(e) => { e.stopPropagation(); set({ range: r.id, custom: '' }); }}>{r.label}</button>
                    {resid && (
                      <select aria-label={`BHK for ${r.label}`} value={on && s.bhk ? s.bhk : ''} onClick={(e) => e.stopPropagation()} onChange={(e) => set({ range: r.id, custom: '', bhk: Number(e.target.value) || null })}>
                        <option value="">BHK</option>{BHKS.map((n) => <option key={n} value={n}>{n} BHK{n === 6 ? ' +' : ''}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            {err('size')}{err('bhk')}
            <div className="cqw-custom">
              <label htmlFor="cqw-sq">Or type your exact size (sq ft)</label>
              <input id="cqw-sq" type="number" inputMode="numeric" placeholder="e.g. 1420" value={s.custom} onChange={(e) => set({ custom: e.target.value, range: e.target.value ? null : s.range })} />
              {resid && s.custom.trim() !== '' && (
                <select aria-label="BHK type" value={s.bhk ?? ''} onChange={(e) => set({ bhk: Number(e.target.value) || null })}>
                  <option value="">BHK</option>{BHKS.map((n) => <option key={n} value={n}>{n} BHK{n === 6 ? ' +' : ''}</option>)}
                </select>
              )}
            </div>
          </>
        )}

        {s.step === 2 && (
          <>
            <div className="cqw-grid cqw-rooms" role="group" aria-label="Rooms to design">
              {roomDefs.filter((d) => !OPTIONAL.has(d.key)).map((d, i) => <RoomOption key={d.key} i={i} label={d.label} qty={s.items[d.key] ?? 0} max={maxQty(d, bhk || 1)} onToggle={() => toggleItem(d.key, maxQty(d, bhk || 1))} onQty={(q) => setQty(d.key, q, maxQty(d, bhk || 1))} />)}
            </div>
            {resid && roomDefs.some((d) => OPTIONAL.has(d.key)) && (
              <>
                <p className="cqw-sub">Also add (optional)</p>
                <div className="cqw-grid cqw-rooms">
                  {roomDefs.filter((d) => OPTIONAL.has(d.key)).map((d, i) => <RoomOption key={d.key} i={i} label={d.label.replace(' (whole home)', '').replace(' (per unit)', '')} qty={s.items[d.key] ?? 0} max={maxQty(d, bhk || 1)} onToggle={() => toggleItem(d.key, maxQty(d, bhk || 1))} onQty={(q) => setQty(d.key, q, maxQty(d, bhk || 1))} />)}
                </div>
              </>
            )}
            {err('items')}
            <p className="cqw-sub">Add-ons (optional)</p>
            <div className="cqw-chips">
              {pricing.extras.map((x) => <button key={x.key} type="button" className="cqw-chip" aria-pressed={s.extras.includes(x.key)} onClick={() => set({ extras: s.extras.includes(x.key) ? s.extras.filter((k) => k !== x.key) : [...s.extras, x.key] })}>{x.label}</button>)}
            </div>
          </>
        )}

        {s.step === 3 && (
          <>
            <div className="cqw-pkgs" role="radiogroup" aria-label="Package">
              {PKGS.map(({ key, g, icon }, i) => {
                const p = pricing.packages[key];
                const on = s.pkg === key;
                return (
                  <div key={key} className={`cqw-pkg${on ? ' is-on' : ''}`} style={{ ['--i' as string]: i, ['--g1' as string]: g[0], ['--g2' as string]: g[1] }} onClick={() => set({ pkg: key })}>
                    <div className="cqw-pkg__top">
                      <svg className="cqw-pkg__wave" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30c40-30 80-30 120-10s90 28 180-8v58H0z" fill="#fff" fillOpacity=".92" /><path d="M0 44c50-26 90-22 140-4s100 14 160-6v36H0z" fill="#fff" /></svg>
                      <h3>{p.label}</h3><span className="cqw-pkg__icon"><PkgIcon name={icon} /></span>
                    </div>
                    <ul>{p.features.map((f) => <li key={f}><Icon name="check" size={14} />{f}</li>)}</ul>
                    <button type="button" role="radio" aria-checked={on} className="cqw-select" onClick={(e) => { e.stopPropagation(); set({ pkg: key }); }}>{on ? 'Selected ✓' : 'Select'}</button>
                  </div>
                );
              })}
              <div className={`cqw-pkg cqw-pkg--custom${s.pkg === 'bestfit' ? ' is-on' : ''}`} style={{ ['--i' as string]: 3 }} onClick={() => set({ pkg: 'bestfit' })}>
                <span className="cqw-pkg__icon"><PkgIcon name="pencil" /></span>
                <div className="cqw-custom-text"><p>Design a <b>package</b> that fits you best</p><small>Our designers will get in touch to customise your package.</small></div>
                <button type="button" role="radio" aria-checked={s.pkg === 'bestfit'} className="cqw-select" onClick={(e) => { e.stopPropagation(); set({ pkg: 'bestfit' }); }}>{s.pkg === 'bestfit' ? 'Selected ✓' : 'Select'}</button>
              </div>
            </div>
            {err('pkg')}
          </>
        )}

        {s.step === 4 && (
          <form className="cqw-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="field"><label htmlFor="cqw-name">Full name</label><input id="cqw-name" type="text" autoComplete="name" value={s.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} />{err('name')}</div>
            <div className="field"><label htmlFor="cqw-email">Email address</label><input id="cqw-email" type="email" autoComplete="email" value={s.email} aria-invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} />{err('email')}</div>
            <div className="field">
              <label htmlFor="cqw-phone">Phone number</label>
              <input id="cqw-phone" type="tel" autoComplete="tel" value={s.phone} aria-invalid={!!errors.phone} onChange={(e) => set({ phone: e.target.value })} />
              <label className="check cqw-wa"><input type="checkbox" checked={s.whatsapp} onChange={(e) => set({ whatsapp: e.target.checked })} /><span>This is my <b>WhatsApp</b> number</span></label>
              {err('phone')}
            </div>
            <div className="field"><label htmlFor="cqw-addr">Project address / area</label><input id="cqw-addr" type="text" autoComplete="street-address" value={s.address} onChange={(e) => set({ address: e.target.value })} /></div>
            <div className="hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label></div>
            <label className="check cqw-form__full"><input type="checkbox" checked={s.consent} onChange={(e) => set({ consent: e.target.checked })} aria-invalid={!!errors.consent} /><span>I agree to be contacted about this quotation, as described in the privacy policy.</span></label>
            <div className="cqw-form__full">{err('consent')}</div>
            {serverError && <p className="notice notice--error cqw-form__full" role="alert">{serverError}</p>}
          </form>
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
