'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { Ico } from './Ico';

export interface ShellNav { href: string; label: string; icon: string }
export interface ShellNote { id: number; title: string; body: string | null; link: string | null; read: boolean; at: string }

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', f); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('keydown', k); };
  }, [open, close]);
  return ref;
}

export function Shell({ nav, user, notes, unread, logout, markRead, children }: {
  nav: ShellNav[]; user: { name: string; sub: string; initials: string; photo: string | null };
  notes: ShellNote[]; unread: number; logout: () => Promise<void>; markRead: () => Promise<void>; children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [, start] = useTransition();
  const bellRef = useOutside(bell, () => setBell(false));
  const menuRef = useOutside(menu, () => setMenu(false));

  useEffect(() => { try { setCollapsed(localStorage.getItem('ad-collapsed') === '1'); } catch { /* ignore */ } }, []);
  useEffect(() => { setOpen(false); setBell(false); setMenu(false); }, [path]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem('ad-collapsed', c ? '0' : '1'); } catch { /* ignore */ } return !c; });

  const active = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/'));
  const current = [...nav].sort((a, b) => b.href.length - a.href.length).find((n) => active(n.href));
  const deeper = current && path !== current.href;

  return (
    <div className={`ad-app${collapsed ? ' is-collapsed' : ''}${open ? ' is-open' : ''}`}>
      <aside className="ad-side" aria-label="Main navigation">
        <Link href="/admin" className="ad-brand">
          <svg viewBox="660 520 280 350" aria-hidden="true"><path d="M700 838V690c0-40 20-77 55-95M900 838V690c0-40-20-77-55-95" fill="none" stroke="#fff" strokeWidth="20" strokeLinecap="round" /><circle cx="800" cy="577" r="28" fill="#4ade80" /></svg>
          <span><b>Single Dot</b><small>Studio OS</small></span>
        </Link>
        <nav className="ad-nav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? 'is-on' : ''} aria-current={active(n.href) ? 'page' : undefined} title={n.label}>
              <Ico n={n.icon} /><span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="ad-side__foot">
          <button type="button" className="ad-collapse" onClick={toggle} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}><Ico n="chev" /><span>Collapse</span></button>
          <Link href="/" className="ad-collapse" style={{ textDecoration: 'none' }} target="_blank"><Ico n="globe" /><span>View website</span></Link>
        </div>
      </aside>
      <div className="ad-scrim" onClick={() => setOpen(false)} />

      <div className="ad-main">
        <header className="ad-top">
          <button type="button" className="ad-burger" aria-label="Open menu" onClick={() => setOpen(true)}><Ico n="menu" /></button>
          <div className="ad-crumb">
            <small>{deeper ? <><Link href={current!.href}>{current!.label}</Link> / Details</> : 'Single Dot Studio'}</small>
            <h1>{current?.label ?? 'Admin'}</h1>
          </div>
          <form className="ad-search" action="/admin/search" role="search">
            <Ico n="search" s={18} /><input type="search" name="q" placeholder="Search projects, tasks, clients…" aria-label="Search" />
          </form>
          <div className="ad-pop-wrap" ref={bellRef} style={{ marginLeft: 'auto' }}>
            <button type="button" className="ad-iconbtn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={bell} onClick={() => setBell((b) => !b)}>
              <Ico n="bell" />{unread > 0 && <span className="ad-dot">{unread > 9 ? '9+' : unread}</span>}
            </button>
            {bell && (
              <div className="ad-pop" role="menu" style={{ width: 340 }}>
                <div className="ad-card__head" style={{ margin: '4px 8px 6px' }}><b>Notifications</b>{unread > 0 && <button type="button" className="ad-btn sm" onClick={() => start(async () => { await markRead(); router.refresh(); })}>Mark all read</button>}</div>
                {notes.length === 0 ? <p className="muted small" style={{ padding: '8px 12px' }}>You are all caught up.</p> : notes.map((n) => (
                  <Link key={n.id} href={n.link ?? '/admin'} style={{ opacity: n.read ? 0.65 : 1 }}>
                    <b style={{ display: 'block', fontSize: '0.88rem' }}>{n.title}</b>
                    {n.body && <span className="muted small">{n.body}</span>}
                    <span className="muted small" style={{ display: 'block' }}>{n.at}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="ad-pop-wrap" ref={menuRef}>
            <button type="button" className="ad-me" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <span className="ad-avatar">{user.photo ? <img src={user.photo} alt="" /> : user.initials}</span>
              <span><b>{user.name}</b><small>{user.sub}</small></span>
            </button>
            {menu && (
              <div className="ad-pop" role="menu" style={{ minWidth: 220 }}>
                <Link href="/admin/profile">My profile</Link>
                <button type="button" className="item" onClick={() => start(async () => { await logout(); router.push('/admin/login'); router.refresh(); })}>Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main key={path} className="ad-content">{children}</main>
      </div>
    </div>
  );
}
