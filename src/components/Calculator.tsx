'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { EstimateRating } from './EstimateRating';
import { pricing } from '@/lib/pricing';
import { store, KEYS } from '@/lib/storage';
import {
  completeSelection, computeEstimate, defaultSelection, formatMoney, itemsFor, maxQty, isResidential,
  type Estimate, type EstimateInput, type PackageKey, type PropertyType,
} from '@/lib/estimate';

const WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
const STEPS = ['Property', 'Spaces', 'Package', 'Details'];
const PKG_ORDER: PackageKey[] = ['essential', 'premium', 'luxury', 'bestfit'];

interface Result {
  reference: string;
  estimate: Estimate;
  pdfBase64: string;
  customerEmail: 'sent' | 'not_configured' | 'failed';
  teamNotified: boolean;
}
interface State {
  step: number;
  propertyType: PropertyType | null;
  sqft: string;
  bhk: number | null;
  custom: boolean;
  items: Record<string, number>;
  itemsKey: string;
  pkg: PackageKey | null;
  extras: string[];
  target: string;
  name: string; phone: string; email: string; address: string; consent: boolean;
  result: Result | null;
}
const initial: State = { step: 1, propertyType: null, sqft: '', bhk: null, custom: false, items: {}, itemsKey: '', pkg: null, extras: [], target: '', name: '', phone: '', email: '', address: '', consent: false, result: null };

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

export default function Calculator({ variant, onClose }: { variant: 'dialog' | 'page'; onClose?: () => void }) {
  const [s, setS] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [hp, setHp] = useState('');
  const headRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<State>) => setS((o) => ({ ...o, ...p }));

  useEffect(() => {
    const d = store.get<State>(KEYS.draft);
    if (d && typeof d.step === 'number') setS({ ...initial, ...d });
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) store.set(KEYS.draft, s);
  }, [s, ready]);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
    bodyRef.current?.scrollTo({ top: 0 });
  }, [s.step, !!s.result]);

  const type = s.propertyType;
  const resid = type ? isResidential(type) : true;
  const bhk = resid ? s.bhk ?? 0 : 1;
  const defs = useMemo(() => (type ? itemsFor(pricing, type) : []), [type]);

  const input = (pkg: PackageKey): EstimateInput | null =>
    type && Number(s.sqft) > 0 ? { propertyType: type, sqft: Number(s.sqft), bhk: bhk || 1, items: s.items, package: pkg, extras: s.extras, targetBudget: s.target ? Number(s.target) : null } : null;
  const live = useMemo(() => {
    const i = input(s.pkg ?? 'premium');
    if (!i) return null;
    try { return computeEstimate(i, pricing); } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.propertyType, s.sqft, s.bhk, s.items, s.pkg, s.extras, s.target]);
  const m = (n: number) => formatMoney(n, pricing);

  function validateStep(step: number) {
    const e: Record<string, string> = {};
    if (step === 1) {
      const n = Number(s.sqft);
      if (!type) e.type = 'Please choose a property type.';
      if (!s.sqft || !Number.isFinite(n) || n < pricing.limits.minSqft || n > pricing.limits.maxSqft) e.sqft = `Enter a size between ${pricing.limits.minSqft} and ${pricing.limits.maxSqft} sq ft.`;
      if (resid && !s.bhk) e.bhk = 'Please choose a BHK configuration.';
    }
    if (step === 2 && Object.keys(s.items).length === 0) e.items = 'Select at least one space to continue.';
    if (step === 3 && !s.pkg) e.pkg = 'Please choose a package.';
    if (step === 4) {
      if (s.name.trim().length < 2) e.name = 'Enter your full name.';
      if (!/^\+?[\d\s\-()]{7,20}$/.test(s.phone.trim())) e.phone = 'Enter a valid phone number.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) e.email = 'Enter a valid email address.';
      if (!s.consent) e.consent = 'Please confirm you agree to be contacted.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(s.step)) return;
    if (s.step === 1) {
      const key = `${type}-${bhk}`;
      if (key !== s.itemsKey) return set({ step: 2, items: defaultSelection(pricing, type!, bhk || 1), itemsKey: key });
    }
    set({ step: s.step + 1 });
  }

  const setQty = (key: string, q: number) => {
    const items = { ...s.items };
    if (q <= 0) delete items[key]; else items[key] = q;
    set({ items });
  };
  const complete = Object.keys(s.items).length > 0 && defs.every((d) => (s.items[d.key] ?? 0) >= 1 || maxQty(d, bhk || 1) === 0);

  async function submit() {
    if (!validateStep(4)) return;
    const i = input(s.pkg!);
    if (!i) return;
    setSubmitting(true);
    setServerError('');
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateInput: i, name: s.name, phone: s.phone, email: s.email, address: s.address, consent: s.consent, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      store.set(KEYS.prompt, 'completed');
      set({ result: data as Result });
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function downloadPdf(r: Result) {
    const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${r.reference}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  const reset = () => { store.remove(KEYS.draft); setS(initial); setErrors({}); setServerError(''); };

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="err" role="alert">{errors[k]}</p> : null);

  /* ---------- result ---------- */
  if (s.result) {
    const r = s.result, e = r.estimate;
    const msg = `Hello, I used the budget calculator (${r.reference}). ${resid ? `${e.input.bhk} BHK, ` : 'Office, '}${e.input.sqft} sq ft, ${pricing.packages[e.tier].label} package, estimated ${formatMoney(e.low, pricing)} to ${formatMoney(e.high, pricing)}. I'd like to discuss my project. - ${s.name}`;
    return (
      <div className={`calc-panel${variant === 'page' ? ' calc-panel--page' : ''}`}>
        <div className="calc__head">
          <h2 ref={headRef} tabIndex={-1}>Your estimate is ready</h2>
          {variant === 'dialog' && <button type="button" className="calc__close" aria-label="Close calculator" onClick={onClose}><Icon name="close" size={24} /></button>}
        </div>
        <div className="calc__body" ref={bodyRef}>
          <div className="stack">
            <div className="summary">
              <span className="label">Reference {r.reference}</span>
              <p className="big" style={{ margin: '6px 0' }}>{m(e.low)} to {m(e.high)}</p>
              <p className="hint">{pricing.packages[e.input.package].label}{e.input.package === 'bestfit' ? `, recommended: ${pricing.packages[e.tier].label}` : ''}. Indicative estimate, not a quotation.</p>
            </div>
            <div role="status" className="stack">
              {r.customerEmail === 'sent' && <p className="notice">We emailed the PDF to {s.email}.</p>}
              {r.customerEmail === 'not_configured' && <p className="notice notice--warn">Email delivery is not configured on this site yet, so the PDF was not emailed. Please download it below.</p>}
              {r.customerEmail === 'failed' && <p className="notice notice--error">We could not email the PDF. Please download it below.</p>}
              {!r.teamNotified && <p className="notice notice--warn">Your details were not forwarded to the studio (lead delivery is not configured). Use the contact options on the site to reach us.</p>}
              {r.teamNotified && <p className="notice">Your request has been passed to the studio.</p>}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn--solid" onClick={() => downloadPdf(r)}><Icon name="download" size={18} /> Download PDF</button>
              {WHATSAPP ? (
                <a className="btn" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> Share on WhatsApp</a>
              ) : (
                <span className="hint" style={{ alignSelf: 'center' }}>WhatsApp sharing is not configured yet.</span>
              )}
            </div>
            <EstimateRating />
            <ul className="plain-list" style={{ fontSize: '0.9rem' }}>{pricing.exclusions.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
        <div className="calc__foot">
          <button type="button" className="btn" onClick={reset}>Start a new estimate</button>
          {variant === 'dialog' && <button type="button" className="btn btn--solid" onClick={onClose}>Close</button>}
        </div>
      </div>
    );
  }

  /* ---------- steps ---------- */
  return (
    <div className={`calc-panel${variant === 'page' ? ' calc-panel--page' : ''}`}>
      <div className="calc__head">
        <div>
          <span className="eyebrow" style={{ marginBottom: 6 }}>Step {s.step} of 4</span>
          <h2 ref={headRef} tabIndex={-1}>{['Tell us about the property', 'Choose the spaces', 'Select a package', 'Where should we send it?'][s.step - 1]}</h2>
        </div>
        {variant === 'dialog' && <button type="button" className="calc__close" aria-label="Close calculator" onClick={onClose}><Icon name="close" size={24} /></button>}
      </div>
      <ol className="progress" aria-label="Progress">
        {STEPS.map((l, i) => <li key={l} className={i + 1 < s.step ? 'is-done' : i + 1 === s.step ? 'is-current' : ''} aria-current={i + 1 === s.step ? 'step' : undefined}>{i + 1}. {l}</li>)}
      </ol>

      <div className="calc__body" ref={bodyRef}>
        {s.step === 1 && (
          <div className="stack">
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label">Property type</legend>
              <div className="opts" role="group" aria-label="Property type">
                {([['apartment', 'Apartment'], ['villa', 'Independent house / villa'], ['office', 'Office']] as const).map(([k, l]) => (
                  <button key={k} type="button" className="opt" aria-pressed={type === k} onClick={() => set({ propertyType: k, bhk: k === 'office' ? 1 : s.bhk })}>
                    <TypeSvg type={k} /><strong>{l}</strong>
                  </button>
                ))}
              </div>
              <Err k="type" />
            </fieldset>
            <div className="field">
              <label htmlFor="bc-sqft">{resid ? 'Carpet area (sq ft)' : 'Office area (sq ft)'}</label>
              <input id="bc-sqft" type="number" inputMode="numeric" min={pricing.limits.minSqft} max={pricing.limits.maxSqft} value={s.sqft} aria-invalid={!!errors.sqft} aria-describedby="bc-sqft-e" onChange={(e) => set({ sqft: e.target.value })} placeholder="e.g. 1200" />
              <div id="bc-sqft-e"><Err k="sqft" /></div>
            </div>
            {resid && (
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="label">Configuration</legend>
                <div className="opts" role="group" aria-label="BHK configuration">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} type="button" className="opt" aria-pressed={!s.custom && s.bhk === n} onClick={() => set({ bhk: n, custom: false })}>
                      <PlanSvg bhk={n} /><strong>{n} BHK{n === 4 ? ' or larger' : ''}</strong>
                    </button>
                  ))}
                  <button type="button" className="opt" aria-pressed={s.custom} onClick={() => set({ custom: true, bhk: Math.max(5, s.bhk ?? 5) })}>
                    <PlanSvg bhk={6} /><strong>Custom</strong>
                  </button>
                </div>
                {s.custom && (
                  <div className="field" style={{ marginTop: 14, maxWidth: 240 }}>
                    <label htmlFor="bc-bhk">Number of bedrooms (BHK)</label>
                    <input id="bc-bhk" type="number" min={1} max={pricing.limits.maxBhk} value={s.bhk ?? ''} onChange={(e) => set({ bhk: Math.min(pricing.limits.maxBhk, Math.max(1, Math.floor(Number(e.target.value)) || 1)) })} />
                  </div>
                )}
                <p className="hint">Plans are illustrative only.</p>
                <Err k="bhk" />
              </fieldset>
            )}
          </div>
        )}

        {s.step === 2 && (
          <div className="stack">
            <p className="hint">Tick the spaces you want designed. Adjust quantities where relevant.</p>
            <div className="spaces" role="group" aria-label="Spaces">
              <div className="space" data-on={complete}>
                <button type="button" className="space__main" role="checkbox" aria-checked={complete} onClick={() => set({ items: complete ? {} : completeSelection(pricing, type!, bhk || 1) })}>
                  <span className="space__box">{complete && <Icon name="check" size={14} />}</span><strong>{resid ? 'Complete home interior' : 'Complete office interior'}</strong>
                </button>
              </div>
              {defs.map((d) => {
                const max = maxQty(d, bhk || 1);
                if (max === 0) return null;
                const q = s.items[d.key] ?? 0;
                return (
                  <div key={d.key} className="space" data-on={q > 0}>
                    <button type="button" className="space__main" role="checkbox" aria-checked={q > 0} onClick={() => setQty(d.key, q > 0 ? 0 : d.key === 'workstation' ? 10 : 1)}>
                      <span className="space__box">{q > 0 && <Icon name="check" size={14} />}</span><span>{d.label}</span>
                    </button>
                    {max > 1 && q > 0 && (
                      <div className="qty" role="group" aria-label={`${d.label} quantity`}>
                        <button type="button" aria-label="Decrease" onClick={() => setQty(d.key, q - (d.key === 'workstation' ? 5 : 1))}>−</button>
                        <span aria-live="polite">{q}</span>
                        <button type="button" aria-label="Increase" onClick={() => setQty(d.key, Math.min(max, q + (d.key === 'workstation' ? 5 : 1)))}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <Err k="items" />
          </div>
        )}

        {s.step === 3 && (
          <div className="stack">
            <div className="pkgs" role="radiogroup" aria-label="Package">
              {PKG_ORDER.map((k) => {
                const p = pricing.packages[k];
                const est = (() => { const i = input(k); try { return i ? computeEstimate(i, pricing) : null; } catch { return null; } })();
                return (
                  <button key={k} type="button" role="radio" aria-checked={s.pkg === k} className="pkg" onClick={() => set({ pkg: k })}>
                    {k === 'bestfit' && <span className="rec">Recommended for you</span>}
                    <h3>{p.label}</h3>
                    <span className="pkg__price">{est ? `${m(est.low)} – ${m(est.high)}` : '—'}</span>
                    <p><strong>{p.tagline}.</strong> {p.scope}</p>
                    {k === 'bestfit' && est && <p className="rec">Suggests: {pricing.packages[est.tier].label}</p>}
                  </button>
                );
              })}
            </div>
            <Err k="pkg" />
            {s.pkg === 'bestfit' && live && (
              <div className="notice">
                <strong>Why {pricing.packages[live.tier].label}?</strong>
                <ul className="plain-list" style={{ marginTop: 6 }}>{live.rationale.map((r) => <li key={r}>{r}</li>)}</ul>
                <p className="hint" style={{ margin: '8px 0 0' }}>This recommendation uses fixed rules, not AI.</p>
              </div>
            )}
            <div className="field" style={{ maxWidth: 360 }}>
              <label htmlFor="bc-target">Target budget (optional, helps “Best Fit”)</label>
              <input id="bc-target" type="number" inputMode="numeric" min={0} value={s.target} onChange={(e) => set({ target: e.target.value })} placeholder={pricing.currency.symbol} />
            </div>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="label">Optional extras</legend>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {pricing.extras.map((x) => (
                  <label key={x.key} className="check">
                    <input type="checkbox" checked={s.extras.includes(x.key)} onChange={(e) => set({ extras: e.target.checked ? [...s.extras, x.key] : s.extras.filter((k) => k !== x.key) })} />
                    {x.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="hint">Estimates are indicative ranges from a simple area-based model. They exclude: {pricing.exclusions.join('; ').toLowerCase()}. A final quotation is provided after consultation.{pricing.placeholder ? ' Rates shown are placeholders until the studio confirms pricing.' : ''}</p>
          </div>
        )}

        {s.step === 4 && (
          <div className="calc-grid">
            <div className="stack">
              <div className="field"><label htmlFor="bc-name">Full name</label><input id="bc-name" type="text" autoComplete="name" value={s.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} /><Err k="name" /></div>
              <div className="field"><label htmlFor="bc-phone">Phone number</label><input id="bc-phone" type="tel" autoComplete="tel" value={s.phone} aria-invalid={!!errors.phone} onChange={(e) => set({ phone: e.target.value })} /><Err k="phone" /></div>
              <div className="field"><label htmlFor="bc-email">Email address</label><input id="bc-email" type="email" autoComplete="email" value={s.email} aria-invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} /><Err k="email" /></div>
              <div className="field"><label htmlFor="bc-addr">Project address (optional)</label><input id="bc-addr" type="text" autoComplete="street-address" value={s.address} onChange={(e) => set({ address: e.target.value })} /></div>
              <div className="hp" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label></div>
              <label className="check"><input type="checkbox" checked={s.consent} onChange={(e) => set({ consent: e.target.checked })} aria-invalid={!!errors.consent} />
                <span>I agree to be contacted about this estimate and consent to my details being used for that purpose, as described in the privacy policy.</span></label>
              <Err k="consent" />
              {serverError && <p className="notice notice--error" role="alert">{serverError}</p>}
            </div>
            <div className="summary" aria-label="Estimate review">
              <span className="label">Your estimate</span>
              {live ? (
                <>
                  <p className="big" style={{ margin: '6px 0 12px' }}>{m(live.low)} to {m(live.high)}</p>
                  <dl>
                    <dt>Property</dt><dd>{type === 'office' ? 'Office' : `${type === 'villa' ? 'House / villa' : 'Apartment'}, ${bhk} BHK`}, {s.sqft} sq ft</dd>
                    <dt>Package</dt><dd>{pricing.packages[live.input.package].label}{live.input.package === 'bestfit' ? ` (${pricing.packages[live.tier].label})` : ''}</dd>
                  </dl>
                  <ul>
                    {live.lines.map((l) => <li key={l.key}><span>{l.label}{l.qty > 1 ? ` × ${l.qty}` : ''}</span><span>{m(l.amount)}</span></li>)}
                    {live.extras.map((x) => <li key={x.key}><span>{x.label}</span><span>{m(x.amount)}</span></li>)}
                  </ul>
                  <p className="hint" style={{ marginTop: 12 }}>Indicative only. {pricing.placeholder ? 'Placeholder rates. ' : ''}Final quotation after consultation.</p>
                </>
              ) : <p className="hint">Complete the previous steps to see your estimate.</p>}
            </div>
          </div>
        )}
      </div>

      <div className="calc__foot">
        <div>
          {s.step > 1 ? <button type="button" className="btn" onClick={() => set({ step: s.step - 1 })}>Back</button> : <button type="button" className="btn" onClick={reset} aria-label="Clear calculator">Reset</button>}
        </div>
        {s.step > 1 && s.step < 4 && live && <span className="calc__live" aria-live="polite">Estimate so far <b>{m(live.low)} – {m(live.high)}</b></span>}
        {s.step < 4 ? (
          <button type="button" className="btn btn--solid" onClick={next}>Continue <Icon name="arrow" size={16} /></button>
        ) : (
          <button type="button" className="btn btn--solid" onClick={submit} disabled={submitting}>{submitting ? 'Preparing your PDF…' : 'Get my estimate PDF'}</button>
        )}
      </div>
    </div>
  );
}
