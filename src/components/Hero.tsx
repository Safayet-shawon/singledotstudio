import type { ReactNode } from 'react';
import { findVideo } from '@/lib/media';
import { resolveImage } from '@/server/cms-image';
import { HeroVideo } from './HeroVideo';
import { HeroCarousel } from './HeroCarousel';
import { HeroWaves } from './HeroWaves';

const showNotes = process.env.NEXT_PUBLIC_SHOW_PLACEHOLDER_NOTES !== 'false';

export async function Hero({ slot, compact, children, aside, slides }: { slot: string; compact?: boolean; children: ReactNode; aside?: ReactNode; slides?: string[] }) {
  const video = findVideo(slot);
  const poster = await resolveImage(`${slot}-poster`);
  const photos = (await Promise.all((slides ?? []).map((n) => resolveImage(n)))).filter((x): x is string => !!x);
  return (
    <section className={`hero${compact ? ' hero--compact' : ''}`} aria-label="Introduction">
      <div className="hero__media">
        {photos.length > 1 ? <HeroCarousel slides={photos} /> : video ? <HeroVideo src={video} poster={poster} /> : poster ? <img className="kenburns" src={poster} alt="" /> : <div className="scene" aria-hidden="true" />}
        <HeroWaves />
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
