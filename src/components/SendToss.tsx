'use client';
import { useEffect, useState, type ReactNode } from 'react';

/** Length of the cartoon, in ms. Keep in step with --toss-T in globals.css. */
const TOSS_MS = 3200;
const HOLD_MS = 1500;

/** A stick figure drawn at its feet (0,0), facing right. Each limb has a class so the stylesheet can animate it. */
function Figure({ p, tone }: { p: 'a' | 'b'; tone: string }) {
  return (
    <g className={`toss-fig toss-fig--${tone}`} fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="0" y1="-66" x2="0" y2="-30" />
      <line x1="0" y1="-60" x2="-12" y2="-42" />
      <g transform="translate(0 -60)"><g className={`toss-${p}-arm`}><line x1="0" y1="0" x2="22" y2="0" /></g></g>
      <g transform="translate(0 -30)"><g className={`toss-${p}-l1`}><line x1="0" y1="0" x2="0" y2="30" /></g></g>
      <g transform="translate(0 -30)"><g className={`toss-${p}-l2`}><line x1="0" y1="0" x2="0" y2="30" /></g></g>
      <circle cx="0" cy="-78" r="12" className="toss-head" />
      <circle cx="5" cy="-80" r="1.6" className="toss-eye" stroke="none" />
      <path d="M2 -73q4 4 8 0" strokeWidth="2" />
    </g>
  );
}

const Ball = () => (
  <>
    <polygon points="-7,-2 -4,-7 1,-6 6,-3 7,2 3,6 -3,6 -6,3" className="toss-ball-shape" />
    <path d="M-4 -1l3 2 2-3 3 3" fill="none" className="toss-ball-line" />
  </>
);

/**
 * Funny "sending" cartoon: one stick man crumples the paper and throws it, the other catches it and walks into the logo.
 * `phase` is 'sending' while the request runs and 'done' once it succeeded; the success text appears when both the cartoon
 * and the request have finished, stays a moment, then `onClose` is called. A native modal <dialog> keeps it above everything,
 * including the calculator dialog.
 */
export function SendToss({ phase, onClose, note }: { phase: 'off' | 'sending' | 'done'; onClose: () => void; note?: ReactNode }) {
  const on = phase !== 'off';
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!on) { setEnded(false); return; }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(() => setEnded(true), reduce ? 0 : TOSS_MS);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.clearTimeout(t); document.body.style.overflow = prev; };
  }, [on]);

  const finished = ended && phase === 'done';
  useEffect(() => {
    if (!finished) return;
    const t = window.setTimeout(onClose, HOLD_MS);
    return () => window.clearTimeout(t);
  }, [finished, onClose]);

  if (!on) return null;
  return (
    <dialog
      className="toss"
      aria-label={finished ? 'Submission done' : 'Sending your request'}
      ref={(el) => { if (el && !el.open) el.showModal(); }}
      onCancel={(e) => { if (!finished) e.preventDefault(); }}
      onClick={(e) => { if (finished && e.target === e.currentTarget) onClose(); }}
    >
      <div className="toss__card" role="status">
        <svg className="toss__svg" viewBox="0 0 460 230" aria-hidden="true">
          <line x1="16" y1="201" x2="444" y2="201" className="toss-ground" />

          {/* thrower */}
          <g transform="translate(80 200)"><g className="toss-a-body"><Figure p="a" tone="a" /></g></g>
          <g transform="translate(100 149)"><rect className="toss-paper" x="-7" y="-9" width="14" height="18" rx="1.5" /></g>

          {/* the logo the paper is delivered to */}
          <g transform="translate(392 208)">
            <g className="toss-logo">
              <g transform="scale(.3) translate(-800 -870)">
                <path d="M700 838V690c0-40 20-77 55-95M900 838V690c0-40-20-77-55-95" fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round" className="toss-arch" />
                <circle cx="800" cy="577" r="27" className="toss-dot" />
                <circle cx="800" cy="577" r="27" fill="none" strokeWidth="6" className="toss-ring" />
              </g>
            </g>
          </g>

          {/* catcher */}
          <g transform="translate(250 200)">
            <g className="toss-b-walk"><g className="toss-b-hop"><g className="toss-b-face"><g className="toss-b-shrink">
              <Figure p="b" tone="b" />
              <g className="toss-carry"><Ball /></g>
            </g></g></g></g>
          </g>

          {/* the paper ball in flight */}
          <g className="toss-ball"><Ball /></g>
        </svg>
        <p className="toss__msg" aria-live="polite">
          {finished
            ? <><span className="toss__tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>Submission done</>
            : <span className="toss__wait">Sending<i>.</i><i>.</i><i>.</i></span>}
        </p>
        {finished && note && <p className="toss__note">{note}</p>}
      </div>
    </dialog>
  );
}
