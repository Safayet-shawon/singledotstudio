'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { homeAreas } from '@/config/site';

export interface ServiceCard { slug: string; audience: 'home' | 'office'; node: ReactNode }

export function ServicesSwitcher({ cards, officeAreas }: { cards: ServiceCard[]; officeAreas: string[] }) {
  const [seg, setSeg] = useState<'home' | 'office'>('home');
  const visible = cards.filter((c) => (seg === 'home' ? c.audience === 'home' : c.audience === 'office'));
  return (
    <div>
      <div className="switch" role="tablist" aria-label="Project type">
        {(['home', 'office'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={seg === k} onClick={() => setSeg(k)}>{k === 'home' ? 'Home' : 'Office'}</button>
        ))}
      </div>
      <div className="svc-grid" role="tabpanel">{visible.map((c) => <div key={c.slug} style={{ display: 'contents' }}>{c.node}</div>)}</div>
      <div className="areas" aria-label={seg === 'home' ? 'Residential areas we design' : 'Office areas we design'}>
        {(seg === 'home' ? homeAreas : officeAreas).map((a) => <span key={a} className="chip">{a}</span>)}
        {seg === 'office' && <Link className="chip" href="/services/office">See office services →</Link>}
      </div>
    </div>
  );
}
