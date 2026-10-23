'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { homeAreas } from '@/config/site';

export interface ServiceCard { slug: string; audience: 'home' | 'office' | 'showroom'; node: ReactNode }

const LABEL = { home: 'Home', office: 'Office', showroom: 'Showroom' } as const;

export function ServicesSwitcher({ cards, officeAreas, showroomAreas }: { cards: ServiceCard[]; officeAreas: string[]; showroomAreas: string[] }) {
  const [seg, setSeg] = useState<'home' | 'office' | 'showroom'>('home');
  const visible = cards.filter((c) => c.audience === seg);
  const areas = seg === 'home' ? homeAreas : seg === 'office' ? officeAreas : showroomAreas;
  return (
    <div>
      <div className="switch" role="tablist" aria-label="Project type">
        {(['home', 'office', 'showroom'] as const).map((k) => (
          <button key={k} id={`seg-${k}`} type="button" role="tab" aria-controls="svc-panel" aria-selected={seg === k} onClick={() => setSeg(k)}>{LABEL[k]}</button>
        ))}
      </div>
      <div className="svc-grid" role="tabpanel" id="svc-panel" aria-labelledby={`seg-${seg}`}>{visible.map((c) => <div key={c.slug} style={{ display: 'contents' }}>{c.node}</div>)}</div>
      <div className="areas" role="group" aria-label={`${LABEL[seg]} areas we design`}>
        {areas.map((a) => <span key={a} className="chip">{a}</span>)}
        {seg !== 'home' && <Link className="chip" href={`/services/${seg}`}>See {seg} services →</Link>}
      </div>
    </div>
  );
}
