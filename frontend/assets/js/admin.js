// Staff area: sign in, then browse quotation requests and consultations. All data and permissions live on the server;
// this page only shows what the API returns to a signed-in session.
import { staff, resetCsrf } from './api-client.js';
import { initNavigation } from './navigation.js';

initNavigation();
const root = document.getElementById('admin-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (iso) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const money = (n) => `BDT ${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function loginView(message = '') {
  root.innerHTML = `<form class="form" id="login" style="max-width:420px" novalidate aria-label="Staff sign in">
    <div class="field field--full"><label for="a-email">Email</label><input id="a-email" name="email" type="email" autocomplete="username" required></div>
    <div class="field field--full"><label for="a-pass">Password</label><input id="a-pass" name="password" type="password" autocomplete="current-password" required></div>
    <p class="notice notice--error field--full" role="alert" ${message ? '' : 'hidden'}>${esc(message)}</p>
    <div class="field--full"><button class="btn btn--solid" type="submit">Sign in</button></div></form>`;
  const form = root.querySelector('#login');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      resetCsrf();
      await staff('/api/v1/admin/auth/login', { method: 'POST', body: { email: form.email.value.trim(), password: form.password.value } });
      resetCsrf();
      await listView();
    } catch (err) {
      loginView(err.status === 401 ? 'Invalid email or password.' : err.message);
    }
  });
}

async function listView() {
  const [me, est, con] = await Promise.all([
    staff('/api/v1/admin/auth/me'), staff('/api/v1/admin/estimates?size=50'), staff('/api/v1/admin/consultations?size=50'),
  ]);
  const estRows = est.items.map((e) => `<details class="lead"><summary><span class="lead__ref">${esc(e.reference)}</span><span>${esc(e.name)}</span><span class="lead__kind lead__kind--quotation">Quotation</span><time>${esc(when(e.createdAt))}</time></summary>
    <div class="lead__body"><dl><dt>Phone</dt><dd>${esc(e.phone)}${e.whatsapp ? ' (WhatsApp)' : ''}</dd><dt>Email</dt><dd>${esc(e.email)}</dd><dt>Address</dt><dd>${esc(e.address || '-')}</dd>
    <dt>Property</dt><dd>${esc(e.property)}</dd><dt>Package</dt><dd>${esc(e.tier)}</dd><dt>Estimate</dt><dd>${money(e.low)} to ${money(e.high)} (total ${money(e.total)})</dd><dt>Emails</dt><dd>${esc(e.mail)}</dd></dl>
    <button type="button" class="btn" data-pdf="${esc(e.id)}" data-ref="${esc(e.reference)}">Download PDF</button></div></details>`).join('');
  const conRows = con.items.map((c) => `<details class="lead"><summary><span class="lead__ref">${esc(c.reference)}</span><span>${esc(c.name)}</span><span class="lead__kind lead__kind--consultation">Consultation</span><time>${esc(when(c.createdAt))}</time></summary>
    <div class="lead__body"><dl><dt>Phone</dt><dd>${esc(c.phone)}</dd><dt>Email</dt><dd>${esc(c.email)}</dd><dt>Address</dt><dd>${esc(c.address)}</dd><dt>Segment</dt><dd>${esc(c.segment)}</dd>
    <dt>Service</dt><dd>${esc(c.service || '-')}</dd><dt>Budget</dt><dd>${esc(c.budget || '-')}</dd><dt>Message</dt><dd>${esc(c.message || '-')}</dd><dt>Emails</dt><dd>${esc(c.mail)}</dd></dl></div></details>`).join('');
  root.innerHTML = `<p class="muted">Signed in as <strong>${esc(me.email)}</strong>. ${est.total} quotation request(s), ${con.total} consultation request(s), newest first.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 24px"><button class="btn" type="button" data-logout>Sign out</button><button class="btn" type="button" data-revoke>Sign out everywhere</button></div>
    <h2 style="font-size:1.6rem;margin-bottom:12px">Quotation requests</h2><div class="leads">${estRows || '<p class="notice">Nothing yet.</p>'}</div>
    <h2 style="font-size:1.6rem;margin:28px 0 12px">Consultation requests</h2><div class="leads">${conRows || '<p class="notice">Nothing yet.</p>'}</div>`;
  root.querySelector('[data-logout]').addEventListener('click', async () => { await staff('/api/v1/admin/auth/logout', { method: 'POST' }).catch(() => {}); resetCsrf(); loginView(); });
  root.querySelector('[data-revoke]').addEventListener('click', async () => {
    if (!confirm('Sign out of every device?')) return;
    await staff('/api/v1/admin/auth/sessions/revoke-all', { method: 'POST' }).catch(() => {});
    resetCsrf(); loginView();
  });
  root.querySelectorAll('[data-pdf]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const res = await staff(`/api/v1/admin/estimates/${b.dataset.pdf}/pdf`, { raw: true });
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `${b.dataset.ref}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) { alert(err.message); } finally { b.disabled = false; }
  }));
}

staff('/api/v1/admin/auth/me').then(listView).catch(() => loginView());
