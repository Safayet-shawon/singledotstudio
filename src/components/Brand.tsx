import Link from 'next/link';
import { site } from '@/config/site';

/** Replaceable logo slot: set site.brand.logo to an image path (e.g. /logo.svg) to swap the temporary wordmark. */
export function Brand() {
  const b = site.brand;
  return (
    <Link href="/" className="brand" aria-label={`${b.name}, home`}>
      {b.logo ? <img className="brand__logo" src={b.logo} alt="" /> : <span className="brand__mark" aria-hidden="true">{b.short}</span>}
      <span>
        <span className="brand__name">{b.name}</span>
        <span className="brand__tag">{b.tagline}</span>
      </span>
    </Link>
  );
}
