'use client';
import { useEffect, useState } from 'react';

/**
 * Entry screen shown once per page load: the studio mark draws itself, the dot drops in, then the screen lifts away.
 * It is CSS-driven (so it also hides itself without JavaScript) and skipped quickly for reduced-motion visitors.
 */
export function Splash() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const quick = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setGone(true), quick ? 300 : 3100);
    return () => window.clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash__inner">
        <svg className="splash__mark" viewBox="660 520 280 350">
          <path className="splash__arch" d="M700 838V690c0-40 20-77 55-95M900 838V690c0-40-20-77-55-95" fill="none" stroke="#f7f2e9" strokeWidth="18" strokeLinecap="round" pathLength="1" />
          <circle className="splash__dot" cx="800" cy="577" r="27" fill="#d98a57" />
          <circle className="splash__ring" cx="800" cy="577" r="27" fill="none" stroke="#d98a57" strokeWidth="3" />
        </svg>
        <div className="splash__name">Single Dot Studio</div>
        <div className="splash__tag">Interiors · Design &amp; Build</div>
        <div className="splash__bar"><i /></div>
      </div>
    </div>
  );
}
