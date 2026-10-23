// Page motion and small interactive widgets: splash, scroll reveal, hero carousel, services switcher, project gallery
// (filter + drifting marquee) and the before/after slider. Everything respects prefers-reduced-motion, pauses off-screen
// and works without hover.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initSplash() {
  const splash = document.querySelector('.splash');
  if (splash) window.setTimeout(() => splash.remove(), reduced.matches ? 300 : 3100);
}

export function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => io.observe(el));
}

export function initCarousel() {
  const root = document.querySelector('[data-carousel]');
  if (!root) return;
  const slides = [...root.querySelectorAll('.carousel__slide')];
  if (slides.length < 2) return;
  let i = 0, paused = false, timer = null;
  const dots = document.createElement('div');
  dots.className = 'carousel__dots';
  const show = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle('is-on', k === i); if (k === i) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true'); });
    [...dots.children].forEach((d, k) => { d.classList.toggle('is-on', k === i); d.setAttribute('aria-current', String(k === i)); });
  };
  const mk = (cls, label, text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label); b.textContent = text; b.addEventListener('click', fn); return b; };
  slides.forEach((_, k) => { const d = mk('', `Show image ${k + 1}`, '', () => show(k)); dots.appendChild(d); });
  const pause = mk('carousel__pause', 'Pause slideshow', '❚❚', () => {
    paused = !paused;
    pause.textContent = paused ? '▶' : '❚❚';
    pause.setAttribute('aria-label', paused ? 'Resume slideshow' : 'Pause slideshow');
    schedule();
  });
  const ui = document.createElement('div');
  ui.className = 'carousel__ui';
  ui.append(mk('carousel__arrow', 'Previous image', '‹', () => show(i - 1)), dots, mk('carousel__arrow', 'Next image', '›', () => show(i + 1)), pause);
  root.appendChild(ui);
  const schedule = () => {
    window.clearInterval(timer);
    if (!paused && !reduced.matches) timer = window.setInterval(() => { if (!document.hidden) show(i + 1); }, 6500);
  };
  show(0);
  schedule();
}

export function initSwitcher() {
  document.querySelectorAll('[data-switcher]').forEach((root) => {
    const tabs = [...root.querySelectorAll('[data-seg]')];
    const set = (seg) => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.seg === seg)));
      const panel = root.querySelector('[role=tabpanel]');
      if (panel) panel.setAttribute('aria-labelledby', `seg-${seg}`);
      root.querySelectorAll('.svc').forEach((c) => { c.hidden = c.dataset.audience !== seg; });
      root.querySelectorAll('[data-areas]').forEach((a) => { a.hidden = a.dataset.areas !== seg; });
    };
    tabs.forEach((t) => t.addEventListener('click', () => set(t.dataset.seg)));
    set('home');
  });
}

// --------------------------------------------------------------------------------------------- gallery

const SPEED = 40; // px per second

function startMarquee(wrap) {
  const track = wrap.querySelector('.marquee__track');
  const set = track.querySelector('.marquee__set');
  track.querySelectorAll('[data-clone]').forEach((n) => n.remove());
  const copies = set.children.length < 5 ? 3 : 2;
  for (let c = 1; c < copies; c++) {
    const clone = set.cloneNode(true);
    clone.dataset.clone = '1';
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    track.appendChild(clone);
  }
  [track, set, ...track.querySelectorAll('[data-clone]')].forEach((n) => { if (n !== track) { n.style.display = 'flex'; n.style.gap = 'inherit'; n.style.paddingRight = 'clamp(14px, 1.8vw, 24px)'; } });

  const s = { x: 0, hover: false, drag: false, moved: 0, startX: 0, startPos: 0, focus: false, userPaused: false, visible: true };
  const apply = () => {
    const w = set.offsetWidth;
    if (w > 0) { s.x = ((s.x % w) + w) % w - w; if (s.x === -w) s.x = 0; }
    track.style.transform = `translate3d(${s.x}px,0,0)`;
  };
  const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; });
  io.observe(wrap);
  let last = performance.now();
  let raf = requestAnimationFrame(function tick(now) {
    const dt = Math.min(now - last, 64) / 1000;
    last = now;
    if (!s.hover && !s.drag && !s.focus && !s.userPaused && !reduced.matches && s.visible && !document.hidden) { s.x += SPEED * dt; apply(); }
    raf = requestAnimationFrame(tick);
  });
  new ResizeObserver(apply).observe(set);

  wrap.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    s.drag = true; s.moved = 0; s.startX = e.clientX; s.startPos = s.x;
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add('is-dragging');
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!s.drag) return;
    const dx = e.clientX - s.startX;
    s.moved = Math.max(s.moved, Math.abs(dx));
    s.x = s.startPos + dx;
    apply();
  });
  const end = (e) => { if (!s.drag) return; s.drag = false; wrap.releasePointerCapture(e.pointerId); wrap.classList.remove('is-dragging'); };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') s.hover = true; });
  wrap.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') s.hover = false; });
  wrap.addEventListener('focusin', (e) => { s.focus = e.target.matches(':focus-visible'); });
  wrap.addEventListener('focusout', () => { s.focus = false; });
  wrap.addEventListener('click', (e) => { if (s.moved > 6) { e.preventDefault(); e.stopPropagation(); s.moved = 0; } }, true);
  wrap.addEventListener('dragstart', (e) => e.preventDefault());
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { s.x += (e.key === 'ArrowLeft' ? 1 : -1) * wrap.clientWidth * 0.4; apply(); e.preventDefault(); }
  });

  return {
    nudge: (dir) => { s.x += dir * wrap.clientWidth * 0.6; apply(); },
    toggle: () => { s.userPaused = !s.userPaused; return s.userPaused; },
    stop: () => { cancelAnimationFrame(raf); io.disconnect(); },
  };
}

export function initGallery() {
  document.querySelectorAll('[data-gallery]').forEach((root) => {
    const wrap = root.querySelector('.marquee');
    const set = wrap.querySelector('.marquee__set');
    const all = [...set.children].map((n) => n.cloneNode(true));
    let ctl = startMarquee(wrap);

    const controls = document.createElement('div');
    controls.className = 'marquee-controls';
    const btn = (label, svg, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', label); b.innerHTML = svg; b.addEventListener('click', fn); return b; };
    const ico = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const prev = btn('Scroll gallery backward', ico('<path d="M15 5l-7 7 7 7"/>'), () => ctl.nudge(1));
    const next = btn('Scroll gallery forward', ico('<path d="M9 5l7 7-7 7"/>'), () => ctl.nudge(-1));
    const pauseBtn = btn('Pause automatic scrolling', ico('<path d="M8 5v14M16 5v14"/>'), () => {
      const p = ctl.toggle();
      pauseBtn.setAttribute('aria-pressed', String(p));
      pauseBtn.setAttribute('aria-label', p ? 'Resume automatic scrolling' : 'Pause automatic scrolling');
      pauseBtn.innerHTML = ico(p ? '<path d="M8 5l11 7-11 7z"/>' : '<path d="M8 5v14M16 5v14"/>');
    });
    const note = document.createElement('span');
    note.textContent = reduced.matches ? 'Automatic motion is off (reduced motion).' : 'Pauses on hover. Drag to explore.';
    controls.append(prev, next, pauseBtn, note);
    root.appendChild(controls);

    const empty = document.createElement('p');
    empty.className = 'notice';
    empty.textContent = 'No projects in this category yet.';
    empty.hidden = true;
    wrap.after(empty);

    root.querySelectorAll('[data-filter]').forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      const shown = all.filter((c) => f === 'all' || (f === 'residential' ? c.dataset.category !== 'office' && c.dataset.category !== 'showroom' : c.dataset.category === f));
      ctl.stop();
      set.replaceChildren(...shown.map((c) => c.cloneNode(true)));
      wrap.hidden = controls.hidden = shown.length === 0;
      empty.hidden = shown.length !== 0;
      if (shown.length) ctl = startMarquee(wrap);
    }));
  });
}

// ----------------------------------------------------------------------------------------- before / after

export function initBeforeAfter() {
  document.querySelectorAll('[data-ba]').forEach((root) => {
    let items;
    try { items = JSON.parse(root.dataset.ba); } catch { return; }
    const stage = root.querySelector('.ba__stage');
    const after = stage.querySelector('.ba__img:not(.ba__img--before)');
    const before = stage.querySelector('.ba__img--before');
    const range = stage.querySelector('.ba__range');
    const set = (v) => { stage.style.setProperty('--pos', `${v}%`); };
    range.addEventListener('input', () => set(range.value));
    root.querySelectorAll('.ba__filter button').forEach((b) => b.addEventListener('click', () => {
      const it = items[Number(b.dataset.i)];
      root.querySelectorAll('.ba__filter button').forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', String(on)); });
      after.src = it.after; after.alt = `${it.alt}, after`;
      before.src = it.before; before.alt = `${it.alt}, before`;
      range.value = 50; set(50);
      if (stage.getAttribute('role') === 'tabpanel') stage.setAttribute('aria-labelledby', b.id);
    }));
  });
}
