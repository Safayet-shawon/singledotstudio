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
        opacity={0.6}
        speed={0.3}
        spacing={11}
        depth={0.38}
        shine={0.8}
        fade="edges"
        fadeSize={0.6}
        interactive
        cursorStrength={0.3}
      />
    </div>
  );
}
