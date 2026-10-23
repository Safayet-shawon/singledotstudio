// Thin fetch wrapper for the Java API. Public calls send no credentials; staff calls send the session cookie and a CSRF token.

const base = () => (window.SDS_CONFIG && window.SDS_CONFIG.apiBase ? window.SDS_CONFIG.apiBase : '').replace(/\/+$/, '');

/** Turns a failed response into an Error whose message is safe to show, and keeps field issues for forms. */
async function toError(res) {
  let data = {};
  try { data = await res.json(); } catch { /* not JSON */ }
  const err = new Error(data.error || (res.status === 429 ? 'Too many requests. Please try again in a few minutes.' : 'Something went wrong. Please try again.'));
  err.status = res.status;
  err.fields = Array.isArray(data.fields) ? data.fields : [];
  return err;
}

async function request(path, options) {
  let res;
  try {
    res = await fetch(base() + path, options);
  } catch {
    const err = new Error('Network error. Please check your connection and try again.');
    err.status = 0;
    err.fields = [];
    throw err;
  }
  if (!res.ok) throw await toError(res);
  return res;
}

/** Public JSON POST (estimates, consultations). */
export async function postPublic(path, body) {
  const res = await request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}

let csrf = null;
async function csrfToken(force = false) {
  if (!csrf || force) {
    const res = await request('/api/v1/admin/auth/csrf', { credentials: 'include' });
    csrf = await res.json();
  }
  return csrf;
}

/** Staff JSON call: session cookie plus CSRF header on changes. */
export async function staff(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const t = await csrfToken();
    headers[t.headerName] = t.token;
  }
  const res = await request(path, { method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body) });
  return raw ? res : res.json();
}

/** Forget the cached CSRF token (after login or logout the server issues a new one). */
export function resetCsrf() { csrf = null; }
