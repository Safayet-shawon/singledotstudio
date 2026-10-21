import Link from 'next/link';
import type { ReactNode } from 'react';
import { CountUp } from './Charts';
import { Ico } from './Ico';
import { statusLabel } from '@/server/perms';

export function Stat({ label, value, icon, href, sub, tone = '', money, i = 0 }: { label: string; value: number; icon: string; href?: string; sub?: string; tone?: '' | 'warn' | 'bad'; money?: boolean; i?: number }) {
  const body = (
    <>
      <small><span className="ico"><Ico n={icon} s={18} /></span>{label}</small>
      <b><CountUp value={value} format={money ? 'money' : 'int'} /></b>
      {sub && <span className="sub">{sub}</span>}
    </>
  );
  const props = { className: `ad-card ad-stat ${tone}`, style: { ['--i' as string]: i } };
  return href ? <Link href={href} {...props}>{body}</Link> : <div {...props}>{body}</div>;
}

export function Card({ title, action, children, i = 0, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; i?: number; className?: string }) {
  return (
    <section className={`ad-card ${className}`} style={{ ['--i' as string]: i }}>
      {(title || action) && <div className="ad-card__head">{title && <h3>{title}</h3>}{action}</div>}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="ad-empty"><b>{title}</b>{children}</div>;
}

export const bdt = (n: number) => `৳${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(n)}`;
export const day = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }) : '-');
export const when = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }) : '-');

const TONE: Record<string, string> = { completed: 'green', paid: 'green', approved: 'green', active: 'green', in_progress: 'blue', submitted: 'amber', revision: 'red', assigned: '', overdue: 'red', cancelled: 'red', draft: '', sent: 'blue', pending: 'amber', partial: 'amber', inactive: 'red', invited: 'amber', planning: '' };
export function StatusBadge({ s, label }: { s: string; label?: string }) {
  const text = label ?? ({ in_progress: 'In Progress', partial: 'Partially Paid', pending: 'Pending Approval' } as Record<string, string>)[s] ?? statusLabel(s);
  return <span className={`ad-badge ${TONE[s] ?? ''}`}>{text.replace(/^./, (c) => c.toUpperCase())}</span>;
}
export function PriorityBadge({ p }: { p: string }) {
  return <span className={`ad-badge ${p === 'urgent' ? 'red' : p === 'high' ? 'amber' : p === 'low' ? '' : 'blue'}`}>{p}</span>;
}

export function Tabs({ items, current }: { items: { href: string; label: string }[]; current: string }) {
  return <nav className="ad-tabs">{items.map((t) => <Link key={t.href} href={t.href} className={t.href === current ? 'is-on' : ''}>{t.label}</Link>)}</nav>;
}
