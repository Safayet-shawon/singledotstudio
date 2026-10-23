'use client';
import { useState } from 'react';

type Item = { label: string; src: string; alt: string; before?: string; sample?: boolean };

/** Drag-to-compare slider with a filter for the space shown. The "before" side is a stripped-back rendering of the
 *  same photo, so the sample is clearly illustrative until real before/after photos are added. */
export function BeforeAfter({ items }: { items: Item[] }) {
  const [i, setI] = useState(0);
  const [pos, setPos] = useState(50);
  const it = items[i];
  if (!it) return null;
  return (
    <div className="ba">
      {items.length > 1 && (
        <div className="ba__filter" role="tablist" aria-label="Choose a space">
          {items.map((x, n) => (
            <button key={x.label} type="button" role="tab" aria-selected={n === i} className={n === i ? 'is-on' : ''} onClick={() => { setI(n); setPos(50); }}>{x.label}</button>
          ))}
        </div>
      )}
      <div className="ba__stage" style={{ ['--pos' as string]: `${pos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ba__img" src={it.src} alt={`${it.alt}, after`} loading="lazy" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`ba__img ba__img--before${it.sample ? ' is-sample' : ' is-real'}`} src={it.before ?? it.src} alt={`${it.alt}, before`} loading="lazy" draggable={false} aria-hidden="true" />
        <span className="ba__tag ba__tag--l">Before</span>
        <span className="ba__tag ba__tag--r">After</span>
        <span className="ba__line" aria-hidden="true"><i /></span>
        <input className="ba__range" type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Slide to compare before and after" />
      </div>
      {it.sample && <p className="ba__note">Sample comparison with stock photos. Real project photos are added soon.</p>}
    </div>
  );
}
