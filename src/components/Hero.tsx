import type { ReactNode } from 'react';
import { findImage, findVideo } from '@/lib/media';
import { HeroVideo } from './HeroVideo';

const showNotes = process.env.NEXT_PUBLIC_SHOW_PLACEHOLDER_NOTES !== 'false';

export function Hero({ slot, compact, children, aside }: { slot: string; compact?: boolean; children: ReactNode; aside?: ReactNode }) {
  const video = findVideo(slot);
  const poster = findImage(`${slot}-poster`);
  return (
    <section className={`hero${compact ? ' hero--compact' : ''}`} aria-label="Introduction">
      <div className="hero__media">
        {video ? <HeroVideo src={video} poster={poster} /> : poster ? <img className="kenburns" src={poster} alt="" /> : <div className="scene" aria-hidden="true" />}
      </div>
      {!video && !poster && showNotes && <p className="placeholder-note">Hero video not generated yet (slot: {slot}). See README, Generating videos.</p>}
      <div className="container">
        <div className="hero__inner">
          <div>{children}</div>
          {aside}
        </div>
      </div>
    </section>
  );
}
