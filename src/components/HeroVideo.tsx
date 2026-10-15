'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/** Muted looping background video with poster, reduced-motion / data-saver respect and a pause control. */
export function HeroVideo({ src, poster }: { src: string; poster?: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saver) { setAllowed(false); return; }
    const v = ref.current;
    if (!v) return;
    v.play().catch(() => {}); // autoplay may be blocked: the poster simply stays visible
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) v.pause(); else if (v.dataset.userPaused !== '1') v.play().catch(() => {}); });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  if (!allowed) return poster ? <img src={poster} alt="" /> : null;
  return (
    <>
      <video ref={ref} src={src} poster={poster ?? undefined} muted loop playsInline preload="metadata" aria-hidden="true" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <button type="button" className="vid-toggle" aria-label={playing ? 'Pause background video' : 'Play background video'}
        onClick={() => { const v = ref.current; if (!v) return; if (v.paused) { v.dataset.userPaused = '0'; v.play(); } else { v.dataset.userPaused = '1'; v.pause(); } }}>
        <Icon name={playing ? 'pause' : 'play'} size={16} />
      </button>
    </>
  );
}
