import Image from 'next/image';
import { findImage } from '@/lib/media';
import { Icon } from './Icon';

const hues = [['#d8cbb4', '#b9a98c'], ['#d2c7b3', '#a59a82'], ['#dcd0ba', '#bcae93'], ['#cfc4ac', '#9d927a'], ['#d9cdb8', '#aea27f']];
const pick = (s: string) => hues[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];

/** Renders public/media/img/<slot>.(webp|jpg|png) when it exists; otherwise a clearly labelled tonal placeholder. */
export function Photo({ slot, alt, sizes = '(max-width: 820px) 100vw, 50vw', priority = false, label }: { slot: string; alt: string; sizes?: string; priority?: boolean; label?: string }) {
  const src = findImage(slot);
  if (src) return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: 'cover' }} />;
  const [a, b] = pick(slot);
  return (
    <div className="ph" style={{ ['--ph-a' as string]: a, ['--ph-b' as string]: b }} role="img" aria-label={`${alt} (placeholder image)`}>
      <div><Icon name="image" size={34} /></div>
      <span className="ph__tag">Photo placeholder: {label ?? slot}</span>
    </div>
  );
}
