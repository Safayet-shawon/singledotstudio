'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Brand } from './Brand';

const SEGMENT_LINKS = [{ label: 'Home', href: '/services' }, { label: 'Office', href: '/services/office' }, { label: 'Showroom', href: '/services/showroom' }];

const lightPages = ['/privacy', '/terms', '/calculate-budget', '/projects', '/contact'];
const hasDarkHero = (p: string) => !lightPages.some((x) => p === x || p.startsWith(x + '/')) && p !== '/_not-found';

export function Header() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dd, setDd] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const solid = scrolled || !hasDarkHero(path);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 40);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => { setOpen(false); setDd(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setDd(false); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const cur = (href: string) => ((href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined);

  return (
    <>
      <header className={`header${solid ? ' is-solid' : ''}`}>
        <div className="container header__inner">
          <Brand />
          <nav className="nav" aria-label="Primary">
            <Link href="/" aria-current={cur('/')}>Home</Link>
            <div className="nav__group">
              <button type="button" aria-expanded={dd} aria-haspopup="true" onClick={() => setDd((v) => !v)} aria-current={path.startsWith('/services') ? 'page' : undefined}>
                Our Services <Icon name="down" size={14} />
              </button>
              <div className={`dropdown${dd ? ' is-open' : ''}`}>
                {SEGMENT_LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
              </div>
            </div>
            <Link href="/about" aria-current={cur('/about')}>More About Us</Link>
          </nav>
          <Link href="/contact" className="btn header__cta">Get in Touch</Link>
          <button ref={menuBtn} type="button" className="menu-btn" aria-label="Open menu" aria-expanded={open} aria-controls="drawer" onClick={() => setOpen(true)}>
            <Icon name="menu" size={26} />
          </button>
        </div>
      </header>
      <div id="drawer" className={`drawer${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu" inert={!open}>
        <div className="drawer__top">
          <Brand />
          <button type="button" className="calc__close" aria-label="Close menu" onClick={() => { setOpen(false); menuBtn.current?.focus(); }}><Icon name="close" size={26} /></button>
        </div>
        <nav aria-label="Mobile">
          <Link className="big" href="/">Home</Link>
          <Link className="big" href="/services">Our Services</Link>
          <div className="sub">{SEGMENT_LINKS.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}</div>
          <Link className="big" href="/projects">Projects</Link>
          <Link className="big" href="/about">More About Us</Link>
          <Link className="big" href="/contact">Get in Touch</Link>
        </nav>
      </div>
    </>
  );
}
