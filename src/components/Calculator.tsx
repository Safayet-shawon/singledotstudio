'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { pricing } from '@/lib/pricing';
import { store, KEYS } from '@/lib/storage';
import {
  completeSelection, defaultSelection, itemsFor, maxQty, isResidential,
  type EstimateInput, type PackageKey, type PropertyType,
} from '@/lib/estimate';

type SecId = 'type' | 'area' | 'config' | 'spaces' | 'package' | 'details';
const PKG_ORDER: PackageKey[] = ['essential', 'premium', 'luxury', 'bestfit'];
const TYPE_LABEL: Record<PropertyType, string> = { apartment: 'Apartment', villa: 'Independent house / villa', office: 'Office' };

interface Result { reference: string; customerEmail: 'sent' | 'not_configured' | 'failed'; teamNotified: boolean }
interface State {
  done: SecId[];
  propertyType: PropertyType | null;
  sqft: string;
  bhk: number | null;
  custom: boolean;
  items: Record<string, number>;
  itemsKey: string;
  extras: string[];
  pkg: PackageKey | null;
  name: string; phone: string; email: string; address: string; consent: boolean;
}
const initial: State = { done: [], propertyType: null, sqft: '', bhk: null, custom: false, items: {}, itemsKey: '', extras: [], pkg: null, name: '', phone: '', email: '', address: '', consent: false };

function PlanSvg({ bhk }: { bhk: number }) {
  const rooms = Math.min(bhk, 6);
  const cols = rooms > 3 ? 3 : 2;
  const rows = Math.ceil(rooms / cols);
  const rw = 34 / cols, rh = 26 / rows;
  return (
    <svg width="64" height="48" viewBox="0 0 64 48" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
      <rect x="2" y="2" width="60" height="44" />
      <path d="M26 2v44M26 18h36" />
      <text x="14" y="26" fontSize="6" textAnchor="middle" fill="currentColor" stroke="none">LV</text>
      <text x="44" y="12" fontSize="5" textAnchor="middle" fill="currentColor" stroke="none">K</text>
      {Array.from({ length: rooms }).map((_, i) => (
        <rect key={i} x={26 + (i % cols) * rw} y={18 + Math.floor(i / cols) * rh} width={rw} height={rh} />
      ))}
    </svg>
  );
}
function TypeSvg({ type }: { type: PropertyType }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 } as const;
  return (
    <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true">
      {type === 'apartment' && <g {...p}><rect x="16" y="4" width="32" height="40" /><path d="M22 12h6M36 12h6M22 22h6M36 22h6M22 32h6M36 32h6M29 44V38h6v6" /></g>}
      {type === 'villa' && <g {...p}><path d="M6 24L32 6l26 18M12 22v22h40V22M26 44V30h12v14" /></g>}
      {type === 'office' && <g {...p}><rect x="8" y="10" width="48" height="30" /><path d="M8 20h48M20 40v4M44 40v4M16 28h8M30 28h8M44 28h4" /></g>}
    </svg>
  );
}
const Lock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
);

export default function Calculator({ variant, onClose }: { variant: 'dialog' | 'page'; onClose?: () => void }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [hp, setHp] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<Partial<Record<SecId, HTMLElement | null>>>({});
  const timer = useRef<number | undefined>(undefined);
  const set = useCallback((p: Partial<State>) => setS((o) => ({ ...o, ...p })), []);

  useEffect(() => {
    const d = store.get<State>(KEYS.draft);
    if (d && Array.isArray(d.done)) setS({ ...initial, ...d });
    setReady(true);
    return () => window.clearTimeout(timer.current);
  }, []);
  useEffect(() => { if (ready && !result) store.set(KEYS.draft, s); }, [s, ready, result]);

  const type = s.propertyType;
  const resid = type ? isResidential(type) : true;
  const bhk = resid ? s.bhk ?? 0 : 1;
  const defs = useMemo(() => (type ? itemsFor(pricing, type) : []), [type]);

  const order: SecId[] = useMemo(() => (resid ? ['type', 'area', 'config', 'spaces', 'package', 'details'] : ['type', 'area', 'spaces', 'package', 'details']), [resid]);
  const active: SecId | null = order.find((id) => !s.done.includes(id)) ?? null;

  const markDone = (id: SecId, delay = 0) => {
    const run = () => setS((o) => (o.done.includes(id) ? o : { ...o, done: [...o.done, id] }));
    if (delay) { window.clearTimeout(timer.current); timer.current = window.setTimeout(run, delay); } else run();
  };
  const reopen = (id: SecId) => { setErrors({}); setS((o) => { const i = order.indexOf(id); return { ...o, done: o.done.filter((d) => order.indexOf(d) < i) }; }); };

  // Default spaces whenever property type / configuration changes.
  useEffect(() => {
    if (active !== 'spaces' || !type) return;
    const key = `${type}-${bhk}`;
    if (key !== s.itemsKey) setS((o) => ({ ...o, items: defaultSelection(pricing, type, bhk || 1), itemsKey: key }));
  }, [active, type, bhk, s.itemsKey]);

  // The newly unlocked section pops in and the previous one scrolls up out of view.
  useEffect(() => {
    if (!ready || !active) return;
    const el = secRefs.current[active];
    const t = window.setTimeout(() => {
      const body = bodyRef.current;
      if (!el || !body) return;
      // Scroll only the calculator body (scrollIntoView would also move the dialog/page).
      body.scrollTo({ top: body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 10, behavior: 'smooth' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [active, ready]);
  useEffect(() => { if (result) bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [result]);

  const err = (k: string) => (errors[k] ? <p className="err" role="alert">{errors[k]}</p> : null);

  function continueArea() {
    const n = Number(s.sqft);
    if (!s.sqft || !Number.isFinite(n) || n < pricing.limits.minSqft || n > pricing.limits.maxSqft) return setErrors({ sqft: `Enter a size between ${pricing.limits.minSqft} and ${pricing.limits.maxSqft} sq ft.` });
    setErrors({}); markDone('area');
  }
  function continueConfig() {
    if (!s.bhk) return setErrors({ bhk: 'Please choose a configuration.' });
    setErrors({}); markDone('config');
  }
  function continueSpaces() {
    if (Object.keys(s.items).length === 0) return setErrors({ items: 'Select at least one space.' });
    setErrors({}); markDone('spaces');
  }
  const setQty = (key: string, q: number) => {
    const items = { ...s.items };
    if (q <= 0) delete items[key]; else items[key] = q;
    set({ items });
  };
  const complete = Object.keys(s.items).length > 0 && defs.every((d) => (s.items[d.key] ?? 0) >= 1 || maxQty(d, bhk || 1) === 0);

  async function submit() {
    const e: Record<string, string> = {};
    if (s.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!/^\+?[\d\s\-()]{7,20}$/.test(s.phone.trim())) e.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) e.email = 'Enter a valid email address.';
    if (!s.consent) e.consent = 'Please confirm you agree to be contacted.';
    setErrors(e);
    if (Object.keys(e).length || !type || !s.pkg) return;
    const estimateInput: EstimateInput = { propertyType: type, sqft: Number(s.sqft), bhk: bhk || 1, items: s.items, package: s.pkg, extras: s.extras, targetBudget: null };
    setSubmitting(true); setServerError('');
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateInput, name: s.name, phone: s.phone, email: s.email, address: s.address, consent: s.consent, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      store.set(KEYS.prompt, 'completed');
      store.remove(KEYS.draft);
      setResult(data as Result);
    } catch (er) {
      setServerError((er as Error).message);
    } finally {
      setSubmitting(false);
    }
  }
  const reset = () => { store.remove(KEYS.draft); setS(initial); setErrors({}); setServerError(''); setResult(null); bodyRef.current?.scrollTo({ top: 0 }); };

  /* ---------- section content ---------- */
  const titles: Record<SecId, string> = { type: 'What are we designing?', area: 'How big is the space?', config: 'Choose the configuration', spaces: 'Which spaces do you want designed?', package: 'Pick your package', details: 'Where should we send your quotation?' };
  const labels: Record<SecId, string> = { type: 'Property', area: 'Area', config: 'Configuration', spaces: 'Spaces', package: 'Package', details: 'Your details' };
  const summary = (id: SecId): string => {
    switch (id) {
      case 'type': return type ? TYPE_LABEL[type] : '';
      case 'area': return `${s.sqft} sq ft`;
      case 'config': return `${s.bhk} BHK`;
      case 'spaces': return `${Object.keys(s.items).length} space${Object.keys(s.items).length === 1 ? '' : 's'}${s.extras.length ? ` + ${s.extras.length} add-on${s.extras.length === 1 ? '' : 's'}` : ''}`;
      case 'package': return s.pkg ? pricing.packages[s.pkg].label : '';
      case 'details': return s.name;
    }
  };

  const content = (id: SecId): ReactNode => {
    switch (id) {
      case 'type':
        return (
          <>
            <div className="cq-opts" role="group" aria-label="Property type">
              {(['apartment', 'villa', 'office'] as const).map((k) => (
                <button key={k} type="button" className="cq-opt" aria-pressed={type === k}
                  onClick={() => { set({ propertyType: k, bhk: k === 'office' ? 1 : s.bhk, custom: false }); markDone('type', 450); }}>
                  <TypeSvg type={k} /><strong>{TYPE_LABEL[k]}</strong><span className="cq-tick"><Icon name="check" size={14} /></span>
                </button>
              ))}
            </div>
            {err('type')}
          </>
        );
      case 'area':
        return (
          <form className="cq-row" onSubmit={(e) => { e.preventDefault(); continueArea(); }}>
            <div className="field" style={{ flex: 1, maxWidth: 360 }}>
              <label htmlFor="cq-sqft">{resid ? 'Carpet area (sq ft)' : 'Office area (sq ft)'}</label>
              <input id="cq-sqft" type="number" inputMode="numeric" value={s.sqft} aria-invalid={!!errors.sqft} placeholder="e.g. 1200" onChange={(e) => set({ sqft: e.target.value })} />
              {err('sqft')}
            </div>
            <button type="submit" className="btn btn--solid">Continue <Icon name="arrow" size={16} /></button>
          </form>
        );
      case 'config':
        return (
          <>
            <div className="cq-opts cq-opts--5" role="group" aria-label="BHK configuration">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button" className="cq-opt" aria-pressed={!s.custom && s.bhk === n}
                  onClick={() => { set({ bhk: n, custom: false }); markDone('config', 450); }}>
                  <PlanSvg bhk={n} /><strong>{n} BHK{n === 4 ? ' or larger' : ''}</strong><span className="cq-tick"><Icon name="check" size={14} /></span>
                </button>
              ))}
              <button type="button" className="cq-opt" aria-pressed={s.custom} onClick={() => set({ custom: true, bhk: Math.max(5, s.bhk ?? 5) })}>
                <PlanSvg bhk={6} /><strong>Custom</strong><span className="cq-tick"><Icon name="check" size={14} /></span>
              </button>
            </div>
            {s.custom && (
              <div className="cq-row" style={{ marginTop: 16 }}>
                <div className="field" style={{ maxWidth: 240 }}>
                  <label htmlFor="cq-bhk">Number of bedrooms</label>
                  <input id="cq-bhk" type="number" min={1} max={pricing.limits.maxBhk} value={s.bhk ?? ''} onChange={(e) => set({ bhk: Math.min(pricing.limits.maxBhk, Math.max(1, Math.floor(Number(e.target.value)) || 1)) })} />
                </div>
                <button type="button" className="btn btn--solid" onClick={continueConfig}>Continue <Icon name="arrow" size={16} /></button>
              </div>
            )}
            {err('bhk')}
          </>
        );
      case 'spaces':
        return (
          <>
            <div className="cq-spaces" role="group" aria-label="Spaces">
              <button type="button" className="cq-opt cq-opt--row" role="checkbox" aria-checked={complete} aria-pressed={complete} onClick={() => set({ items: complete ? {} : completeSelection(pricing, type!, bhk || 1) })}>
                <strong>{resid ? 'Complete home interior' : 'Complete office interior'}</strong><span className="cq-tick"><Icon name="check" size={14} /></span>
              </button>
              {defs.map((d) => {
                const max = maxQty(d, bhk || 1);
                if (max === 0) return null;
                const q = s.items[d.key] ?? 0;
                const step = d.key === 'workstation' ? 5 : 1;
                return (
                  <div key={d.key} className="cq-space">
                    <button type="button" className="cq-opt cq-opt--row" role="checkbox" aria-checked={q > 0} aria-pressed={q > 0} onClick={() => setQty(d.key, q > 0 ? 0 : d.key === 'workstation' ? 10 : 1)}>
                      <span>{d.label}</span><span className="cq-tick"><Icon name="check" size={14} /></span>
                    </button>
                    {max > 1 && q > 0 && (
                      <div className="qty" role="group" aria-label={`${d.label} quantity`}>
                        <button type="button" aria-label="Decrease" onClick={() => setQty(d.key, q - step)}>−</button>
                        <span aria-live="polite">{q}</span>
                        <button type="button" aria-label="Increase" onClick={() => setQty(d.key, Math.min(max, q + step))}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="cq-addons">
              {pricing.extras.map((x) => (
                <button key={x.key} type="button" className="cq-chip" aria-pressed={s.extras.includes(x.key)} onClick={() => set({ extras: s.extras.includes(x.key) ? s.extras.filter((k) => k !== x.key) : [...s.extras, x.key] })}>
                  {x.label}
                </button>
              ))}
            </div>
            {err('items')}
            <div style={{ marginTop: 18 }}><button type="button" className="btn btn--solid" onClick={continueSpaces}>Continue <Icon name="arrow" size={16} /></button></div>
          </>
        );
      case 'package':
        return (
          <div className="cq-pkgs" role="radiogroup" aria-label="Package">
            {PKG_ORDER.map((k) => {
              const p = pricing.packages[k];
              const sel = s.pkg === k;
              return (
                <div key={k} className={`cq-pkg${sel ? ' is-on' : ''}${k === 'premium' ? ' is-pop' : ''}`}>
                  {k === 'premium' && <span className="cq-pkg__tag">Most popular</span>}
                  {k === 'bestfit' && <span className="cq-pkg__tag cq-pkg__tag--alt">We choose for you</span>}
                  <h3>{p.label}</h3>
                  <p className="cq-pkg__line">{p.tagline}</p>
                  <ul>{p.features.map((f) => <li key={f}><Icon name="check" size={14} />{f}</li>)}</ul>
                  <button type="button" role="radio" aria-checked={sel} className={`btn${sel ? ' btn--solid' : ''}`} onClick={() => { set({ pkg: k }); markDone('package', 500); }}>{sel ? 'Selected' : 'Choose'}</button>
                </div>
              );
            })}
          </div>
        );
      case 'details':
        return (
          <form className="cq-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="field"><label htmlFor="cq-name">Full name</label><input id="cq-name" type="text" autoComplete="name" value={s.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} />{err('name')}</div>
            <div className="field"><label htmlFor="cq-phone">Phone number</label><input id="cq-phone" type="tel" autoComplete="tel" value={s.phone} aria-invalid={!!errors.phone} onChange={(e) => set({ phone: e.target.value })} />{err('phone')}</div>
            <div className="field"><label htmlFor="cq-email">Email address</label><input id="cq-email" type="email" autoComplete="email" value={s.email} aria-invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} />{err('email')}</div>
            <div className="field"><label htmlFor="cq-addr">Project address (optional)</label><input id="cq-addr" type="text" autoComplete="street-address" value={s.address} onChange={(e) => set({ address: e.target.value })} /></div>
            <div className="hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label></div>
            <label className="check cq-form__full"><input type="checkbox" checked={s.consent} onChange={(e) => set({ consent: e.target.checked })} aria-invalid={!!errors.consent} /><span>I agree to be contacted about this quotation, as described in the privacy policy.</span></label>
            <div className="cq-form__full">{err('consent')}</div>
            {serverError && <p className="notice notice--error cq-form__full" role="alert">{serverError}</p>}
            <div className="cq-form__full"><button type="submit" className="btn btn--solid" disabled={submitting}>{submitting ? 'Sending…' : 'Send my quotation'}</button></div>
          </form>
        );
    }
  };

  /* ---------- render ---------- */
  const doneCount = order.filter((id) => s.done.includes(id)).length;
  const head = (
    <div className="cq-head">
      <div>
        <span className="eyebrow" style={{ marginBottom: 4 }}>{result ? 'All done' : `Step ${Math.min(doneCount + 1, order.length)} of ${order.length}`}</span>
        <h2>{result ? 'Thank you' : 'Get your quotation'}</h2>
      </div>
      <div className="cq-head__actions">
        {!result && doneCount > 0 && <button type="button" className="cq-link" onClick={reset}>Start over</button>}
        {variant === 'dialog' && <button type="button" className="calc__close" aria-label="Close" onClick={onClose}><Icon name="close" size={24} /></button>}
      </div>
      <div className="cq-bar" aria-hidden="true"><i style={{ width: `${result ? 100 : (doneCount / order.length) * 100}%` }} /></div>
    </div>
  );

  if (result) {
    return (
      <div className={`calc-panel cq${variant === 'page' ? ' calc-panel--page' : ''}`}>
        {head}
        <div className="cq-body" ref={bodyRef}>
          <div className="cq-done">
            <span className="cq-done__icon"><Icon name="check" size={34} /></span>
            <h3>Your quotation request is in</h3>
            {result.customerEmail === 'sent'
              ? <p>We have emailed your quotation to <strong>{s.email}</strong>. Please check your inbox, and the spam folder if you do not see it.</p>
              : <p>We received your request and will email your quotation to <strong>{s.email}</strong> shortly.</p>}
            <p className="hint">Reference {result.reference}</p>
            <div className="cq-row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn" onClick={reset}>New request</button>
              {variant === 'dialog' && <button type="button" className="btn btn--solid" onClick={onClose}>Close</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`calc-panel cq${variant === 'page' ? ' calc-panel--page' : ''}`}>
      {head}
      <div className="cq-body" ref={bodyRef}>
        {order.map((id, i) => {
          const isDone = s.done.includes(id);
          const isActive = id === active;
          if (isDone) {
            return (
              <section key={id} className="cq-sec is-done" ref={(el) => { secRefs.current[id] = el; }} aria-label={labels[id]}>
                <span className="cq-sec__n"><Icon name="check" size={14} /></span>
                <span className="cq-sec__label">{labels[id]}</span>
                <strong className="cq-sec__val">{summary(id)}</strong>
                <button type="button" className="cq-link" onClick={() => reopen(id)}>Change</button>
              </section>
            );
          }
          if (isActive) {
            return (
              <section key={id} className="cq-sec is-active" ref={(el) => { secRefs.current[id] = el; }} aria-current="step" aria-labelledby={`cq-h-${id}`}>
                <div className="cq-sec__head"><span className="cq-sec__n">{i + 1}</span><h3 id={`cq-h-${id}`}>{titles[id]}</h3></div>
                {content(id)}
              </section>
            );
          }
          return (
            <section key={id} className="cq-sec is-locked" ref={(el) => { secRefs.current[id] = el; }} aria-label={`${labels[id]} (not available yet)`} aria-disabled="true">
              <span className="cq-sec__n">{i + 1}</span>
              <span className="cq-sec__label">{labels[id]}</span>
              <span className="cq-sec__lock"><Lock /> Not available yet</span>
            </section>
          );
        })}
        <div className="cq-spacer" aria-hidden="true" />
      </div>
    </div>
  );
}
