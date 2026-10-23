// Header: solid-on-scroll, services dropdown and the mobile drawer. Listeners live as long as the page, which is a single document.

export function initNavigation() {
  const header = document.querySelector('.header');
  const drawer = document.getElementById('drawer');
  const menuBtn = document.querySelector('.menu-btn');
  const group = document.querySelector('.nav__group');
  const ddBtn = group && group.querySelector('button');
  const dd = group && group.querySelector('.dropdown');
  if (!header) return;

  const alwaysSolid = header.classList.contains('is-solid');
  const onScroll = () => { if (!alwaysSolid) header.classList.toggle('is-solid', window.scrollY > 40); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setDropdown = (open) => {
    if (!dd) return;
    dd.classList.toggle('is-open', open);
    ddBtn.setAttribute('aria-expanded', String(open));
  };
  if (ddBtn) {
    ddBtn.addEventListener('click', (e) => { e.stopPropagation(); setDropdown(!dd.classList.contains('is-open')); });
    document.addEventListener('click', (e) => { if (group && !group.contains(e.target)) setDropdown(false); });
  }

  const setDrawer = (open) => {
    drawer.classList.toggle('is-open', open);
    drawer.inert = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) drawer.querySelector('[data-drawer-close]').focus(); else menuBtn.focus({ preventScroll: true });
  };
  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', () => setDrawer(true));
    drawer.querySelector('[data-drawer-close]').addEventListener('click', () => setDrawer(false));
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
  }
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    setDropdown(false);
    if (drawer && drawer.classList.contains('is-open')) setDrawer(false);
  });
}
