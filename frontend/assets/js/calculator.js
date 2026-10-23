// Four-step budget calculator. The browser only collects choices; the server calculates the price and emails the quotation.
import { postPublic } from './api-client.js';

const DRAFT_KEY = 'bc-draft-v3';
const PROMPT_KEY = 'bc-prompt-v1';
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage may be blocked */ } },
  remove(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const TYPE_LABEL = { apartment: 'Home', office: 'Office', showroom: 'Showroom' };
const RANGES = [['600-899', 750], ['900-1199', 1050], ['1200-1349', 1275], ['1350-1499', 1425], ['1500-1649', 1575], ['1650-1799', 1725], ['1800-1949', 1875],
  ['1950-2099', 2025], ['2100-2249', 2175], ['2250-2399', 2325], ['2400-2549', 2475], ['2550-2699', 2625], ['2700+', 2850]];
const BHKS = [1, 2, 3, 4, 5, 6];
const OPTIONAL = new Set(['foyer', 'wardrobe', 'study', 'balcony', 'ceiling']);
const PKGS = [['essential', 'c1'], ['premium', 'c2'], ['luxury', 'c3'], ['bestfit', 'c4']];
const STEP_NAMES = ['Space', 'Rooms', 'Package', 'Details'];

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', prev: '<path d="M15 5l-7 7 7 7"/>', arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>', close: '<path d="M5 5l14 14M19 5L5 19"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 7l9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A15 15 0 014 5a1 1 0 011-1z"/>', pin: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
};
const icon = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SCENE = `<svg class="cqw-scene" viewBox="0 0 420 330" role="presentation"><ellipse class="sc-rug" cx="250" cy="318" rx="130" ry="10"/>
<g class="sc-arch"><path class="sc-win" d="M40 318V160c0-62 38-104 90-120 52 16 90 58 90 120v158z"/><path class="sc-arch__line" pathLength="1" d="M40 318V160c0-62 38-104 90-120 52 16 90 58 90 120v158"/><path class="sc-pane" d="M130 52v266M62 190h136"/></g>
<circle class="sc-dot" cx="130" cy="22" r="13"/><g class="sc-frame"><rect x="262" y="96" width="78" height="56" rx="3"/><path d="M270 144l20-22 14 14 12-12 24 20z"/><circle cx="318" cy="112" r="5"/></g>
<g class="sc-chair"><rect class="sc-back" x="262" y="188" width="86" height="64" rx="22"/><rect class="sc-seat" x="250" y="236" width="110" height="38" rx="14"/><rect class="sc-arm" x="244" y="222" width="20" height="52" rx="10"/><rect class="sc-arm" x="346" y="222" width="20" height="52" rx="10"/><path class="sc-leg" d="M268 274l-6 40M342 274l6 40"/></g>
<g class="sc-lamp"><circle class="sc-glow" cx="396" cy="170" r="34"/><path class="sc-leg" d="M396 318V182"/><path class="sc-shade" d="M380 184l8-30h16l8 30z"/></g>
<g class="sc-plant"><path class="sc-pot" d="M8 318l6-38h34l6 38z"/><g class="sc-leaves"><ellipse cx="31" cy="238" rx="9" ry="34" transform="rotate(-8 31 238)"/><ellipse cx="14" cy="252" rx="8" ry="26" transform="rotate(-38 14 252)"/><ellipse cx="50" cy="250" rx="8" ry="26" transform="rotate(34 50 250)"/></g></g><path class="sc-floor" d="M0 318h420"/></svg>`;

const initial = () => ({ step: 1, type: null, range: null, custom: '', bhk: null, items: {}, extras: [], pkg: null, name: '', email: '', phone: '', whatsapp: false, address: '', consent: false });

let dataPromise = null;
const loadData = () => (dataPromise ||= fetch('/assets/data/calculator.json').then((r) => { if (!r.ok) throw new Error('data'); return r.json(); }));

class Calculator {
  constructor(mount, data, { variant, onClose }) {
    this.root = mount;
    this.d = data;
    this.variant = variant;
    this.onClose = onClose;
    this.dir = 'fwd';
    this.result = null;
    this.s = this.loadDraft();
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('change', (e) => this.onInput(e));
    this.root.addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
    this.render();
  }

  loadDraft() {
    const d = store.get(DRAFT_KEY);
    const s = { ...initial(), ...(d && typeof d.step === 'number' ? d : {}) };
    if (s.type === 'villa') s.type = 'apartment';
    return s;
  }

  saveDraft() {
    // Contact details are never written to the browser; only the choices are.
    const { name, email, phone, whatsapp, address, consent, ...choices } = this.s;
    store.set(DRAFT_KEY, choices);
  }

  // ------------------------------------------------------------------------------------------ derived values
  get resid() { return this.s.type === null || this.s.type === 'apartment'; }
  get sqft() { return this.s.custom.trim() ? Number(this.s.custom) : (RANGES.find((r) => r[0] === this.s.range) || [0, 0])[1]; }
  get sizeLabel() { return this.s.custom.trim() ? `${Math.round(Number(this.s.custom))} sq ft` : this.s.range || ''; }
  get sizeOk() { const l = this.d.limits; return this.sqft >= l.minSqft && this.sqft <= l.maxSqft; }
  bhkValue() { return this.resid ? this.s.bhk || 0 : 1; }
  rule(v, bhk) { return typeof v === 'number' ? v : v === 'bhk' ? bhk : v === 'bhk-1' ? Math.max(0, bhk - 1) : 0; }
  maxQty(item) { return this.rule(item.maxQty, this.bhkValue() || 1); }
  rooms() {
    const group = this.s.type === 'office' ? 'office' : this.s.type === 'showroom' ? 'showroom' : 'residential';
    return this.d.items.filter((i) => i.group === group && this.maxQty(i) > 0 && !OPTIONAL.has(i.key));
  }
  stage1() { return !this.s.type ? 0 : !this.sizeOk ? 1 : this.resid && !this.s.bhk ? 2 : 3; }
  stage2() { return Object.keys(this.s.items).length === 0 ? 0 : 1; }
  secClass(n, stage) { return `cqw-sec ${stage === n ? 'is-active' : n < stage ? 'is-done' : 'is-locked'}`; }
  pkgLabel() { return this.s.pkg === 'bestfit' ? 'Custom Package' : this.s.pkg ? this.d.packages[this.s.pkg].label : ''; }

  // ------------------------------------------------------------------------------------------------ rendering
  titles() {
    const t = this.s.type === 'office' ? 'office' : this.s.type === 'showroom' ? 'showroom' : 'home';
    return [`Tell us about your <em>${t}</em>`, 'Which spaces should we <em>design</em>?', 'Choose the <em>package</em> that suits you', 'Where should we send your <em>quotation</em>?'];
  }

  render() {
    const s = this.s;
    const head = this.result
      ? '<h2>Thank <b>you</b></h2>'
      : `<ol class="cqw-steps" aria-label="Step ${s.step} of 4">${STEP_NAMES.map((n, i) => `<li class="${s.step === i + 1 ? 'is-now' : s.step > i + 1 ? 'is-done' : ''}"${s.step === i + 1 ? ' aria-current="step"' : ''}><i>${s.step > i + 1 ? icon('check', 12) : i + 1}</i><span>${n}</span></li>`).join('')}</ol><h2>${this.titles()[s.step - 1]}</h2>`;
    const close = this.variant === 'dialog' ? `<button type="button" class="calc__close cqw-x" aria-label="Close" data-act="close">${icon('close', 24)}</button>` : '';
    const foot = this.result
      ? `<button type="button" class="cqw-btn ghost" data-act="reset">New request</button>${this.variant === 'dialog' ? '<button type="button" class="cqw-btn" data-act="close">Close</button>' : ''}`
      : `${s.step > 1 ? `<button type="button" class="cqw-btn ghost" data-act="prev">${icon('prev', 16)} Prev</button>` : '<span></span>'}${s.step < 4
        ? `<button type="button" class="cqw-btn" data-act="next">Next ${icon('arrow', 16)}</button>`
        : `<button type="button" class="cqw-btn" data-act="submit" data-submit>Send my quotation ${icon('arrow', 16)}</button>`}`;
    this.root.innerHTML = `<div class="calc-panel cqw${this.variant === 'page' ? ' calc-panel--page' : ''}"><div class="cqw-head"><span class="cqw-kicker">Interior budget calculator</span>${close}${head}</div>`
      + `<div class="cqw-body" data-body>${this.result ? this.doneHtml() : `<div class="cqw-page ${this.dir}" data-page>${this.stepHtml()}</div>`}</div><div class="cqw-foot">${foot}</div></div>`;
    this.body = this.root.querySelector('[data-body]');
    this.body.scrollTo({ top: 0 });
    this.sync();
  }

  stepHtml() {
    const s = this.s;
    if (s.step === 1) {
      const pills = ['apartment', 'office', 'showroom'].map((k) => `<button type="button" class="cqw-pill" data-act="type" data-v="${k}" aria-pressed="false">${TYPE_LABEL[k]}</button>`).join('');
      const sizes = RANGES.map((r, i) => `<button type="button" role="radio" class="cqw-size" style="--i:${i}" data-act="range" data-v="${r[0]}" aria-checked="false">${r[0]}</button>`).join('');
      const bhks = BHKS.map((n) => `<button type="button" role="radio" class="cqw-bhk" data-act="bhk" data-v="${n}" aria-checked="false">${n}${n === 6 ? '+' : ''}<small>BHK</small></button>`).join('');
      return `<section data-sec="0"><p class="cqw-sub cqw-sub--first">1 · What are you designing?</p><div class="cqw-types" role="group" aria-label="Property type">${pills}</div><div data-err="type"></div></section>`
        + `<section data-sec="1"><p class="cqw-sub" data-size-label></p><div class="cqw-sizes" role="radiogroup" aria-label="Size in square feet">${sizes}</div>`
        + `<div class="cqw-custom"><label for="cqw-sq">Or type your exact size (sq ft)</label><input id="cqw-sq" type="number" inputmode="numeric" placeholder="e.g. 1420" value="${esc(s.custom)}"></div><div data-err="size"></div></section>`
        + `<section data-sec="2"><p class="cqw-sub">3 · Bedrooms (BHK)</p><div class="cqw-bhks" role="radiogroup" aria-label="BHK type">${bhks}</div><div data-err="bhk"></div></section>`;
    }
    if (s.step === 2) {
      const rooms = this.rooms().map((d, i) => this.roomHtml(d, i)).join('');
      const extras = this.d.extras.filter((x) => x.key === 'smart').map((x) => `<button type="button" class="cqw-chip" data-act="extra" data-k="${x.key}" aria-pressed="false">${esc(x.label)}</button>`).join('');
      return `<section data-sec="0"><div class="cqw-grid cqw-rooms" role="group" aria-label="Rooms to design">${rooms}</div><div data-err="items"></div></section>`
        + `<section data-sec="1"><p class="cqw-sub">Add-on</p><div class="cqw-chips">${extras}</div></section>`;
    }
    if (s.step === 3) {
      const cards = PKGS.map(([key, tone], i) => {
        const p = this.d.packages[key];
        return `<div class="cqw-pkg cqw-pkg--${tone}" style="--i:${i}" data-act="pkg" data-v="${key}"><span class="cqw-pkg__fill" aria-hidden="true"><i></i></span><h3 class="cqw-pkg__name">${esc(p.label)}</h3>`
          + `<div class="cqw-pkg__blob"><svg viewBox="0 0 280 140" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pg-${key}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--c1)"/><stop offset="1" style="stop-color:var(--c2)"/></linearGradient></defs>`
          + `<path d="M0 22C0 8 8 0 24 0h232c16 0 24 8 24 22v34c0 30-40 28-86 14-48-15-86-20-130 24-26 26-64 32-64 8z" fill="url(#pg-${key})"/></svg><p class="cqw-pkg__tag">${esc(key === 'bestfit' ? 'Designed around you' : p.tagline)}</p></div>`
          + `<ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><div class="cqw-pkg__ribbon"><button type="button" role="radio" aria-checked="false" class="cqw-select" data-act="pkg" data-v="${key}">Select</button></div></div>`;
      }).join('');
      return `<div class="cqw-pkgs" role="radiogroup" aria-label="Package">${cards}</div><div data-err="pkg"></div>`;
    }
    const size = this.sizeLabel.endsWith('sq ft') ? this.sizeLabel : `${this.sizeLabel} sq ft`;
    const line = `${TYPE_LABEL[s.type || 'apartment']} · ${size}${this.resid && this.bhkValue() ? ` · ${this.bhkValue()} BHK` : ''} · ${this.pkgLabel()}`;
    const field = (id, label, type, name, ic, ph, ac) => `<div class="cqw-f"><label for="${id}">${label}</label><span class="cqw-in">${icon(ic, 17)}<input id="${id}" name="${name}" type="${type}" autocomplete="${ac}" placeholder="${ph}" value="${esc(s[name])}"></span><div data-err="${name}"></div></div>`;
    return `<div class="cqw-details"><aside class="cqw-art" aria-hidden="true"><div class="cqw-art__top"><img src="/assets/images/logo-mark.svg" alt="" width="34" height="42"><p>Almost there.<br>Let's shape <b>your space</b>.</p></div>${SCENE}</aside>`
      + `<form class="cqw-form" novalidate><div class="cqw-form__full cqw-form__head"><h3>Your details</h3><p>${esc(line)}</p></div>`
      + field('cqw-name', 'Full name', 'text', 'name', 'user', 'Your name', 'name') + field('cqw-email', 'Email address', 'email', 'email', 'mail', 'you@example.com', 'email')
      + `<div class="cqw-f"><label for="cqw-phone">Phone number</label><span class="cqw-in">${icon('phone', 17)}<input id="cqw-phone" name="phone" type="tel" autocomplete="tel" placeholder="+880 1XXX XXXXXX" value="${esc(s.phone)}"></span>`
      + `<label class="cqw-wa"><input type="checkbox" name="whatsapp"${s.whatsapp ? ' checked' : ''}><span>This is my <b>WhatsApp</b> number</span></label><div data-err="phone"></div></div>`
      + field('cqw-addr', 'Project address / area', 'text', 'address', 'pin', 'Area, city', 'street-address')
      + '<div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>'
      + `<label class="cqw-consent cqw-form__full"><input type="checkbox" name="consent"${s.consent ? ' checked' : ''}><span>I agree to be contacted about this quotation, as described in the <a href="/privacy/" target="_blank" rel="noopener" style="text-decoration:underline">privacy policy</a>.</span></label>`
      + '<div class="cqw-form__full" data-err="consent"></div><p class="notice notice--error cqw-form__full" role="alert" hidden data-server-error></p></form></div>';
  }

  roomHtml(d, i) {
    const q = this.s.items[d.key] || 0;
    const max = this.maxQty(d);
    const step = d.key === 'workstation' ? 5 : 1;
    const qty = q > 0 && max > 1
      ? `<div class="qty" role="group" aria-label="${esc(d.label)} quantity"><button type="button" aria-label="Decrease" data-act="qty" data-k="${d.key}" data-d="${-step}">−</button><span aria-live="polite">${q}</span><button type="button" aria-label="Increase" data-act="qty" data-k="${d.key}" data-d="${step}">+</button></div>` : '';
    return `<div class="cqw-opt cqw-room${q > 0 ? ' is-on' : ''}" style="--i:${i}" data-room="${d.key}"><button type="button" role="checkbox" aria-checked="${q > 0}" class="cqw-room__main" data-act="room" data-k="${d.key}"><span class="cqw-box" aria-hidden="true">${q > 0 ? icon('check', 13) : ''}</span><span>${esc(d.label)}</span></button>${qty}</div>`;
  }

  doneHtml() {
    const r = this.result;
    const msg = r.customerEmail === 'queued'
      ? `We are emailing your quotation to <strong>${esc(this.s.email)}</strong>. Please check your inbox, and the spam folder if you do not see it.`
      : `We received your request and will email your quotation to <strong>${esc(this.s.email)}</strong> shortly.`;
    return `<div class="cqw-done"><span class="cqw-done__icon">${icon('check', 36)}</span><h3>Your quotation request is in</h3><p>${msg}</p><p class="hint">Reference ${esc(r.reference)}</p></div>`;
  }

  /** Updates classes and attributes in place, so sections animate when they light up and nothing flickers. */
  sync() {
    const s = this.s;
    const q = (sel) => [...this.body.querySelectorAll(sel)];
    if (this.result) return;
    if (s.step === 1) {
      q('.cqw-pill').forEach((b) => b.setAttribute('aria-pressed', String(s.type === b.dataset.v)));
      q('.cqw-size').forEach((b) => { const on = !s.custom.trim() && s.range === b.dataset.v; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); });
      q('.cqw-bhk').forEach((b) => { const on = s.bhk === Number(b.dataset.v); b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); });
      const stage = this.stage1();
      q('[data-sec]').forEach((sec) => {
        const n = Number(sec.dataset.sec);
        sec.className = this.secClass(n, stage);
        sec.inert = n > stage;
        if (n === 2) sec.hidden = !this.resid;
      });
      const lab = this.body.querySelector('[data-size-label]');
      if (lab) lab.textContent = `2 · ${this.resid ? 'Carpet area' : s.type === 'showroom' ? 'Showroom area' : 'Office area'} in sq ft`;
    } else if (s.step === 2) {
      const stage = this.stage2();
      q('[data-sec]').forEach((sec) => { const n = Number(sec.dataset.sec); sec.className = this.secClass(n, stage); sec.inert = n > stage; });
      q('[data-act=extra]').forEach((b) => b.setAttribute('aria-pressed', String(s.extras.includes(b.dataset.k))));
    } else if (s.step === 3) {
      q('.cqw-pkg').forEach((c) => {
        const on = s.pkg === c.dataset.v;
        c.classList.toggle('is-on', on);
        const b = c.querySelector('.cqw-select');
        b.setAttribute('aria-checked', String(on));
        b.textContent = on ? 'Selected ✓' : 'Select';
      });
    }
  }

  showErrors(errors) {
    this.body.querySelectorAll('[data-err]').forEach((n) => { n.innerHTML = ''; });
    Object.entries(errors).forEach(([k, m]) => {
      const n = this.body.querySelector(`[data-err="${k}"]`);
      if (n) n.innerHTML = `<p class="err" role="alert">${esc(m)}</p>`;
    });
  }

  // ------------------------------------------------------------------------------------------------- events
  set(patch) { Object.assign(this.s, patch); this.saveDraft(); this.sync(); }

  onClick(e) {
    const t = e.target.closest('[data-act]');
    if (!t || !this.root.contains(t)) return;
    const s = this.s;
    const act = t.dataset.act;
    if (act === 'close') return this.onClose && this.onClose();
    if (act === 'reset') { store.remove(DRAFT_KEY); this.s = initial(); this.result = null; this.dir = 'back'; return this.render(); }
    if (act === 'next') { if (this.validate(s.step)) { this.dir = 'fwd'; this.s.step += 1; this.saveDraft(); this.render(); } return; }
    if (act === 'prev') { this.dir = 'back'; this.s.step = Math.max(1, s.step - 1); this.saveDraft(); return this.render(); }
    if (act === 'submit') return this.submit();
    if (act === 'type') return this.set({ type: t.dataset.v, bhk: t.dataset.v === 'apartment' ? s.bhk : 1, items: s.type === t.dataset.v ? s.items : {} });
    if (act === 'range') { const sq = this.body.querySelector('#cqw-sq'); if (sq) sq.value = ''; return this.set({ range: t.dataset.v, custom: '' }); }
    if (act === 'bhk') return this.set({ bhk: Number(t.dataset.v) });
    if (act === 'extra') return this.set({ extras: s.extras.includes(t.dataset.k) ? s.extras.filter((k) => k !== t.dataset.k) : [...s.extras, t.dataset.k] });
    if (act === 'pkg') return this.set({ pkg: t.dataset.v });
    if (act === 'room' || act === 'qty') {
      const d = this.d.items.find((i) => i.key === t.dataset.k);
      const items = { ...s.items };
      if (act === 'room') {
        if (items[d.key]) delete items[d.key];
        else items[d.key] = d.key === 'workstation' ? 10 : d.key === 'child' || d.key === 'toilet' ? this.maxQty(d) : 1;
      } else {
        const q = (items[d.key] || 0) + Number(t.dataset.d);
        if (q <= 0) delete items[d.key]; else items[d.key] = Math.min(this.maxQty(d), q);
      }
      this.s.items = items;
      this.saveDraft();
      const wrap = this.body.querySelector(`[data-room="${d.key}"]`);
      const idx = this.rooms().findIndex((r) => r.key === d.key);
      const tmp = document.createElement('div');
      tmp.innerHTML = this.roomHtml(d, idx);
      const fresh = tmp.firstElementChild;
      fresh.style.animation = 'none';
      wrap.replaceWith(fresh);
      this.sync();
      const again = this.body.querySelector(`[data-room="${d.key}"] [data-act="${act}"]${act === 'qty' ? `[data-d="${t.dataset.d}"]` : ''}`);
      if (again) again.focus({ preventScroll: true });
    }
  }

  onInput(e) {
    const t = e.target;
    if (t.id === 'cqw-sq') return this.set({ custom: t.value, range: t.value ? null : this.s.range });
    if (this.s.step === 4 && t.name) {
      if (t.type === 'checkbox') this.s[t.name] = t.checked; else if (t.name !== 'website') this.s[t.name] = t.value;
    }
  }

  validate(step) {
    const s = this.s, e = {};
    if (step === 1) {
      if (!s.type) e.type = 'Please choose what you are designing.';
      if (!this.sizeOk) e.size = s.custom.trim() ? `Enter a size between ${this.d.limits.minSqft} and ${this.d.limits.maxSqft} sq ft.` : 'Please select your size.';
      if (this.resid && !s.bhk) e.bhk = 'Please choose how many bedrooms (BHK).';
    }
    if (step === 2 && Object.keys(s.items).length === 0) e.items = 'Please select at least one room.';
    if (step === 3 && !s.pkg) e.pkg = 'Please select a package.';
    if (step === 4) {
      if (s.name.trim().length < 2) e.name = 'Enter your full name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) e.email = 'Enter a valid email address.';
      if (!/^\+?[\d\s\-()]{7,20}$/.test(s.phone.trim())) e.phone = 'Enter a valid phone number.';
      if (!s.consent) e.consent = 'Please confirm you agree to be contacted.';
    }
    this.showErrors(e);
    return Object.keys(e).length === 0;
  }

  async submit() {
    const s = this.s;
    if (!this.validate(4)) return;
    const btn = this.root.querySelector('[data-submit]');
    const errBox = this.body.querySelector('[data-server-error]');
    errBox.hidden = true;
    btn.disabled = true;
    btn.firstChild.textContent = 'Sending… ';
    try {
      const website = (this.body.querySelector('input[name=website]') || {}).value || '';
      const res = await postPublic('/api/v1/estimates', {
        estimateInput: { propertyType: s.type, sqft: this.sqft, bhk: this.bhkValue() || 1, items: s.items, package: s.pkg, extras: s.extras, sizeLabel: this.sizeLabel },
        name: s.name.trim(), phone: s.phone.trim(), whatsapp: s.whatsapp, email: s.email.trim(), address: s.address.trim(), consent: true, website,
      });
      store.set(PROMPT_KEY, 'completed');
      store.remove(DRAFT_KEY);
      this.result = res;
      this.render();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.hidden = false;
      btn.disabled = false;
      btn.firstChild.textContent = 'Send my quotation ';
    }
  }
}

// ------------------------------------------------------------------------------------- mounting (dialog and page)

export function initCalculator() {
  const pageMount = document.querySelector('[data-calc-page]');
  if (pageMount) {
    loadData().then((d) => { pageMount.innerHTML = ''; new Calculator(pageMount, d, { variant: 'page' }); })
      .catch(() => { pageMount.innerHTML = '<p class="notice notice--error">The calculator could not be loaded. Please refresh the page.</p>'; });
    return;
  }
  const dialog = document.getElementById('calc-dialog');
  if (!dialog) return;
  let calc = null, lastFocus = null;
  const close = () => { if (dialog.open) dialog.close(); };
  const open = async () => {
    lastFocus = document.activeElement;
    if (!store.get(PROMPT_KEY)) store.set(PROMPT_KEY, 'opened');
    document.querySelector('.teaser')?.remove();
    try {
      const d = await loadData();
      dialog.innerHTML = '';
      calc = new Calculator(dialog, d, { variant: 'dialog', onClose: close });
      dialog.showModal();
    } catch {
      alert('The calculator could not be loaded. Please try again.');
    }
  };
  dialog.addEventListener('close', () => { dialog.innerHTML = ''; calc = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  document.querySelectorAll('[data-open-calc]').forEach((b) => b.addEventListener('click', open));

  // One-time, non-modal prompt: once shown, dismissed, opened or completed it never appears again in this browser.
  if (!store.get(PROMPT_KEY)) {
    window.setTimeout(() => {
      if (store.get(PROMPT_KEY) || dialog.open) return;
      store.set(PROMPT_KEY, 'seen');
      const t = document.createElement('div');
      t.className = 'teaser';
      t.setAttribute('role', 'region');
      t.setAttribute('aria-label', 'Budget calculator suggestion');
      t.innerHTML = `<p>Planning a project? Get your quotation in a few quick steps.</p><button type="button" class="btn btn--solid" style="min-height:40px;padding:0.6em 1.2em">Try it</button><button type="button" class="x" aria-label="Dismiss suggestion">${icon('close', 16)}</button>`;
      t.querySelector('.btn').addEventListener('click', open);
      t.querySelector('.x').addEventListener('click', () => { store.set(PROMPT_KEY, 'dismissed'); t.remove(); });
      document.body.appendChild(t);
    }, 12000);
  }
}
