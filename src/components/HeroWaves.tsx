'use client';
import { useEffect, useState } from 'react';
import PatternWaves from './reactbits/PatternWaves';
import './HeroWaves.css';

/**
 * Subtle, low-opacity watery layer over the hero media (React Bits PatternWaves, "ocean" preset).
 * Transparent background so the photo stays visible; pointer-events are off so links and buttons stay clickable.
 * Rendered only when WebGL2 + motion are allowed.
 */
export function HeroWaves() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    setOn(!reduce && !saver);
  }, []);
  if (!on) return null;
  return (
    <div className="hero-waves" aria-hidden="true">
      <PatternWaves
        preset="ocean"
        color="#ffffff"
        backgroundColor="rgba(0,0,0,0)"
        opacity={0.9}
        speed={0.45}
        spacing={10}
        depth={0.55}
        shine={1}
        fade="edges"
        fadeSize={0.4}
        interactive
        cursorStrength={0.45}
      />
    </div>
  );
}
