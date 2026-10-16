import Link from 'next/link';
import { site } from '@/config/site';

/** Single Dot Studio mark: arch in the current text colour (adapts to light/dark headers) with the copper dot. */
export function Brand() {
  const b = site.brand;
  return (
    <Link href="/" className="brand" aria-label={`${b.name}, home`}>
      <svg className="brand__logo" viewBox="660 520 280 350" aria-hidden="true">
        <path d="M700 838V690c0-40 20-77 55-95M900 838V690c0-40-20-77-55-95" fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round" />
        <circle cx="800" cy="577" r="27" fill="#c97a4a" />
      </svg>
      <span>
        <span className="brand__name">{b.name}</span>
        <span className="brand__tag">{b.tagline}</span>
      </span>
    </Link>
  );
}
