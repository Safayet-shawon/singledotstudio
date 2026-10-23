'use client';
import { useEffect, useState } from 'react';
import PatternWaves from './reactbits/PatternWaves';
import './HeroWaves.css';

/**
 * Subtle, low-opacity watery layer over the hero media (React Bits PatternWaves, "ocean" preset).
 * Transparent background so the photo stays visible; pointer-events are off so links and buttons stay clickable.
 * Rendered only when WebGL2 + motion are allowed.
 */
/** Skips the shader on devices that would render it in software (headless browsers, crawlers, very old phones): it would freeze the page for seconds. */
function gpuOk() {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    if ((nav.hardwareConcurrency ?? 4) <= 2 || (nav.deviceMemory ?? 4) <= 2) return false;
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    // Also older Intel HD graphics (2013-2016): compiling this shader alone blocks the page for seconds there.
    return !/swiftshader|llvmpipe|software|softpipe|basic render|intel\(r\) hd graphics/i.test(name);
  } catch {
    return false;
  }
}

export function HeroWaves() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saver || !gpuOk()) return;
    // Start after the page has loaded and the browser is idle, so the first paint and first taps are never competing with the shader.
    let t = 0;
    const go = () => { t = window.setTimeout(() => setOn(true), 800); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    return () => { window.clearTimeout(t); window.removeEventListener('load', go); };
  }, []);
  if (!on) return null;
  return (
    <div className="hero-waves" aria-hidden="true">
      <PatternWaves
        preset="ocean"
        color="#ffffff"
        backgroundColor="rgba(0,0,0,0)"
        opacity={0.7}
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
