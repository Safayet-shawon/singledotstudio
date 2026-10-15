'use client';
import { useEffect, useRef, useState } from 'react';

interface Stat { key: string; label: string; value: number | null }

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value); // server/no-JS: show the final value
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setN(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1600;
      const step = (t: number) => {
        const p = Math.min((t - t0) / dur, 1);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>{n}</span>;
}

export function Stats({ stats }: { stats: Stat[] }) {
  return (
    <div className="stats">
      {stats.map((s) => (
        <div className="stat" key={s.key}>
          <div className="stat__num">{s.value === null ? 'XX' : <><Counter value={s.value} />+</>}</div>
          <div className="stat__label">{s.label}</div>
          {s.value === null && <span className="stat__tag">Placeholder: add the real figure in config</span>}
        </div>
      ))}
    </div>
  );
}
