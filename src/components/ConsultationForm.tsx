'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { services } from '@/config/site';

type Status = 'idle' | 'submitting' | 'success' | 'error' | 'unconfigured';

export function ConsultationForm({ defaultService = '' }: { defaultService?: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '').trim();
    const er: Record<string, string> = {};
    if (v('name').length < 2) er.name = 'Enter your full name.';
    if (!/^\+?[\d\s\-()]{7,20}$/.test(v('phone'))) er.phone = 'Enter a valid phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) er.email = 'Enter a valid email address.';
    if (v('address').length < 3) er.address = 'Enter the project address or preferred location.';
    if (!f.get('consent')) er.consent = 'Please agree to be contacted.';
    setErrors(er);
    if (Object.keys(er).length) return;

    setStatus('submitting'); setMsg('');
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: v('name'), phone: v('phone'), email: v('email'), address: v('address'), segment: v('segment'), service: v('service'), budget: v('budget'), message: v('message'), consent: true, website: v('website') }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setStatus('success'); (e.target as HTMLFormElement).reset(); return; }
      setStatus(data.unconfigured ? 'unconfigured' : 'error');
      setMsg(data.error || 'Something went wrong. Please try again.');
    } catch {
      setStatus('error'); setMsg('Network error. Please check your connection and try again.');
    }
  }

  const Err = ({ k }: { k: string }) => (errors[k] ? <span className="err" role="alert">{errors[k]}</span> : null);

  if (status === 'success') {
    return <div className="form" role="status"><div className="field--full"><h3>Thank you.</h3><p>Your request has been received and passed to the studio. We will get in touch using the details you provided.</p></div></div>;
  }
  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-label="Book a consultation">
      <div className="field"><label htmlFor="c-name">Full name</label><input id="c-name" name="name" type="text" autoComplete="name" aria-invalid={!!errors.name} /><Err k="name" /></div>
      <div className="field"><label htmlFor="c-phone">Phone number</label><input id="c-phone" name="phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} /><Err k="phone" /></div>
      <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} /><Err k="email" /></div>
      <div className="field"><label htmlFor="c-address">Project address / location</label><input id="c-address" name="address" type="text" autoComplete="address-line1" aria-invalid={!!errors.address} /><Err k="address" /></div>
      <div className="field">
        <span className="label" id="c-seg">This project is for</span>
        <div className="seg" role="radiogroup" aria-labelledby="c-seg">
          <label><input type="radio" name="segment" value="home" defaultChecked /><span>Home</span></label>
          <label><input type="radio" name="segment" value="office" /><span>Office</span></label>
          <label><input type="radio" name="segment" value="showroom" /><span>Showroom</span></label>
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-service">Interested service</label>
        <select id="c-service" name="service" defaultValue={defaultService}>
          <option value="">Not sure yet</option>
          {services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          <option value="complete">Complete interior</option>
        </select>
      </div>
      <div className="field field--full"><label htmlFor="c-budget">Budget range (optional)</label><input id="c-budget" name="budget" type="text" placeholder="e.g. a range you have in mind" /></div>
      <div className="field field--full"><label htmlFor="c-msg">Project description (optional)</label><textarea id="c-msg" name="message" maxLength={1000} /></div>
      <div className="hp" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="field--full"><label className="check"><input type="checkbox" name="consent" aria-invalid={!!errors.consent} /><span>I agree to be contacted about my enquiry and to my details being used for that purpose, as described in the <Link href="/privacy" style={{ textDecoration: 'underline' }}>privacy policy</Link>.</span></label><Err k="consent" /></div>
      {(status === 'error' || status === 'unconfigured') && <p className={`notice ${status === 'error' ? 'notice--error' : 'notice--warn'} field--full`} role="alert">{msg}</p>}
      <div className="field--full"><button className="btn btn--solid" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Sending…' : 'Book a consultation'}</button></div>
    </form>
  );
}
