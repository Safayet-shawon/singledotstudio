'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { categoryFilters, type ProjectCategory } from '@/config/site';

export interface GalleryCard { id: string; category: ProjectCategory; node: ReactNode }

const SPEED = 40; // px per second, left-to-right

export function ProjectGallery({ cards, filters = true }: { cards: GalleryCard[]; filters?: boolean }) {
  const [filter, setFilter] = useState<string>('all');
  const shown = cards.filter((c) => filter === 'all' || (filter === 'residential' ? c.category !== 'office' : c.category === filter));
  return (
    <div>
      {filters && (
        <div className="filters" role="group" aria-label="Filter projects">
          {categoryFilters.map((f) => (
            <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      )}
      {shown.length ? <Marquee key={filter} cards={shown} /> : <p className="notice">No projects in this category yet.</p>}
    </div>
  );
}

function Marquee({ cards }: { cards: GalleryCard[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const st = useRef({ x: 0, hover: false, drag: false, moved: 0, startX: 0, startPos: 0, focus: false, userPaused: false, reduce: false, visible: true });
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const copies = cards.length < 5 ? 3 : 2;

  const apply = useCallback(() => {
    const w = setRef.current?.offsetWidth ?? 0;
    const s = st.current;
    if (w > 0) { s.x = ((s.x % w) + w) % w - w; if (s.x === -w) s.x = 0; } // keep within [-w, 0)
    if (track.current) track.current.style.transform = `translate3d(${s.x}px,0,0)`;
  }, []);

  useEffect(() => {
    const s = st.current;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    s.reduce = mq.matches; setReduce(mq.matches);
    const onMq = () => { s.reduce = mq.matches; setReduce(mq.matches); };
    mq.addEventListener('change', onMq);
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; });
    if (wrap.current) io.observe(wrap.current);
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      if (!s.hover && !s.drag && !s.focus && !s.userPaused && !s.reduce && s.visible && !document.hidden) { s.x += SPEED * dt; apply(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(apply);
    if (setRef.current) ro.observe(setRef.current);
    return () => { cancelAnimationFrame(raf); mq.removeEventListener('change', onMq); io.disconnect(); ro.disconnect(); };
  }, [apply]);

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const s = st.current;
    s.drag = true; s.moved = 0; s.startX = e.clientX; s.startPos = s.x;
    wrap.current?.setPointerCapture(e.pointerId);
    wrap.current?.classList.add('is-dragging');
  };
  const move = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = e.clientX - s.startX;
    s.moved = Math.max(s.moved, Math.abs(dx));
    s.x = s.startPos + dx; apply();
  };
  const up = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = false;
    wrap.current?.releasePointerCapture(e.pointerId);
    wrap.current?.classList.remove('is-dragging');
  };
  const nudge = (dir: 1 | -1) => { const w = wrap.current?.clientWidth ?? 300; st.current.x += dir * w * 0.6; apply(); };
  const toggle = () => { st.current.userPaused = !st.current.userPaused; setPaused(st.current.userPaused); };

  return (
    <div>
      <div
        ref={wrap}
        className="marquee"
        role="region"
        aria-roledescription="carousel"
        aria-label="Project gallery. Drag to scroll."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') st.current.hover = true; }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') st.current.hover = false; }}
        onFocusCapture={(e) => { st.current.focus = (e.target as HTMLElement).matches(':focus-visible'); }}
        onBlurCapture={() => { st.current.focus = false; }}
        onClickCapture={(e) => { if (st.current.moved > 6) { e.preventDefault(); e.stopPropagation(); st.current.moved = 0; } }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div ref={track} className="marquee__track">
          {Array.from({ length: copies }).map((_, c) => (
            <div key={c} ref={c === 0 ? setRef : undefined} style={{ display: 'flex', gap: 'inherit', paddingRight: 'clamp(14px, 1.8vw, 24px)' }} {...(c > 0 ? { inert: true, 'aria-hidden': true } : {})}>
              {cards.map((card) => <div key={card.id} style={{ display: 'contents' }}>{card.node}</div>)}
            </div>
          ))}
        </div>
      </div>
      <div className="marquee-controls">
        <button type="button" aria-label="Scroll gallery backward" onClick={() => nudge(1)}><Icon name="prev" size={18} /></button>
        <button type="button" aria-label="Scroll gallery forward" onClick={() => nudge(-1)}><Icon name="next" size={18} /></button>
        <button type="button" aria-label={paused ? 'Resume automatic scrolling' : 'Pause automatic scrolling'} aria-pressed={paused} onClick={toggle}><Icon name={paused ? 'play' : 'pause'} size={16} /></button>
        <span>{reduce ? 'Automatic motion is off (reduced motion).' : 'Pauses on hover. Drag to explore.'}</span>
      </div>
    </div>
  );
}
