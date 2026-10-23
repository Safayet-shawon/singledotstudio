// Consultation form: validates in the browser for fast feedback, then posts to the API, which validates again.
import { postPublic } from './api-client.js';

const PHONE = /^\+?[\d\s\-()]{7,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(field, message) {
  const wrap = field.closest('.field') || field.closest('.field--full') || field.parentElement;
  let el = wrap.querySelector('.err');
  if (!message) { if (el) el.remove(); field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); return; }
  if (!el) { el = document.createElement('span'); el.className = 'err'; el.setAttribute('role', 'alert'); el.id = `${field.id || field.name}-err`; wrap.appendChild(el); }
  el.textContent = message;
  field.setAttribute('aria-invalid', 'true');
  field.setAttribute('aria-describedby', el.id);
}

export function initConsultForms() {
  document.querySelectorAll('[data-consult-form]').forEach((form) => {
    const banner = form.querySelector('[data-form-error]');
    const submit = form.querySelector('button[type=submit]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const v = (k) => String(f.get(k) ?? '').trim();
      const checks = {
        name: v('name').length < 2 ? 'Enter your full name.' : '',
        phone: PHONE.test(v('phone')) ? '' : 'Enter a valid phone number.',
        email: EMAIL.test(v('email')) ? '' : 'Enter a valid email address.',
        address: v('address').length < 3 ? 'Enter the project address or preferred location.' : '',
        consent: f.get('consent') ? '' : 'Please agree to be contacted.',
      };
      let first = null;
      for (const [k, msg] of Object.entries(checks)) {
        const input = form.elements[k];
        setError(input, msg);
        if (msg && !first) first = input;
      }
      if (first) { first.focus(); return; }

      banner.hidden = true;
      submit.disabled = true;
      submit.textContent = 'Sending…';
      try {
        await postPublic('/api/v1/consultations', {
          name: v('name'), phone: v('phone'), email: v('email'), address: v('address'), segment: v('segment'),
          service: v('service'), budget: v('budget'), message: v('message'), consent: true, website: v('website'),
        });
        const done = document.createElement('div');
        done.className = 'form';
        done.setAttribute('role', 'status');
        done.innerHTML = '<div class="field--full"><h3>Thank you.</h3><p>Your request has been received and passed to the studio. We will get in touch using the details you provided.</p></div>';
        form.replaceWith(done);
      } catch (err) {
        err.fields.forEach((fi) => { const input = form.elements[fi.field]; if (input) setError(input, fi.message.charAt(0).toUpperCase() + fi.message.slice(1) + '.'); });
        banner.textContent = err.message;
        banner.hidden = false;
        submit.disabled = false;
        submit.textContent = 'Book a consultation';
      }
    });
  });
}
