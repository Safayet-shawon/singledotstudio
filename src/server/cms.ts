import { unstable_cache } from 'next/cache';
import { q1 } from './db';
import { projects as baseProjects, services, site, type Project } from '@/config/site';

import { FONTS, type BodyFont, type HeadingFont } from './fonts';
export { FONTS };
export type { BodyFont, HeadingFont };

export interface Comparison { id: string; service: string; label: string; before: string; after: string }

export interface SiteContent {
  hero: { quote: string; budgetQuote: string; slides: string[] };
  contact: { phone: string; email: string; address: string; hours: string };
  founder: { name: string; title: string; quote: string };
  stats: { completed: number | null; running: number | null; cities: number | null };
  seo: { title: string; description: string };
  footer: { blurb: string };
  services: Record<string, { intro: string }>;
  portfolio: Project[];
  comparisons: Comparison[]; // before/after pairs shown on the service pages (media ids)
  images: Record<string, string>; // image slot -> media id
  typography: { heading: HeadingFont; body: BodyFont; headingWeight: 400 | 500 | 600; bodyWeight: 300 | 400 | 500 };
}

export const DEFAULT_SLIDES = ['home-poster', 'living-dining-poster', 'kitchen-poster', 'bedroom-poster', 'bathroom-poster', 'office-poster'];

export function defaultContent(): SiteContent {
  return {
    hero: { quote: site.heroQuote, budgetQuote: site.budgetQuote, slides: DEFAULT_SLIDES },
    contact: { phone: site.contact.phone ?? '', email: site.contact.email ?? '', address: site.contact.address ?? '', hours: site.contact.hours ?? '' },
    founder: { name: site.owner.name, title: site.owner.title, quote: site.owner.quote },
    stats: { completed: null, running: null, cities: null },
    seo: { title: `${site.brand.name} | ${site.brand.tagline}`, description: `${site.brand.name} designs kitchens, bedrooms, bathrooms, living spaces and offices. Book a consultation or calculate an indicative budget.` },
    footer: { blurb: site.heroQuote },
    services: Object.fromEntries(services.map((s) => [s.slug, { intro: s.intro }])),
    portfolio: baseProjects.map((p) => ({ ...p })),
    comparisons: [],
    images: {},
    typography: { heading: 'cormorant', body: 'nunito', headingWeight: 500, bodyWeight: 400 },
  };
}

type Plain = Record<string, unknown>;
const isObj = (v: unknown): v is Plain => !!v && typeof v === 'object' && !Array.isArray(v);
/** Overlay stored content onto the defaults, key by key, ignoring anything of the wrong shape. */
export function mergeContent(base: SiteContent, over: unknown): SiteContent {
  if (!isObj(over)) return base;
  const out: Plain = { ...base };
  for (const k of Object.keys(base) as (keyof SiteContent)[]) {
    const b = base[k] as unknown, o = over[k];
    if (o === undefined) continue;
    if (Array.isArray(b)) { if (Array.isArray(o)) out[k] = o; }
    else if (isObj(b) && isObj(o)) out[k] = k === 'services' || k === 'images' ? { ...b, ...o } : { ...b, ...Object.fromEntries(Object.entries(o).filter(([kk]) => kk in b)) };
  }
  return out as unknown as SiteContent;
}

async function readPublished(): Promise<SiteContent> {
  try {
    const row = await q1<{ published: unknown }>(`SELECT published FROM cms WHERE key = 'site'`);
    return mergeContent(defaultContent(), row?.published);
  } catch { return defaultContent(); }
}
/** Published content for the public website. Cached, and refreshed when someone publishes. */
export const getContent = unstable_cache(readPublished, ['cms-site-v1'], { tags: ['cms'], revalidate: 600 });

export async function getDraftContent(): Promise<{ draft: SiteContent; published: SiteContent; dirty: boolean }> {
  const row = await q1<{ draft: unknown; published: unknown }>(`SELECT draft, published FROM cms WHERE key = 'site'`);
  const published = mergeContent(defaultContent(), row?.published);
  const draft = mergeContent(published, row?.draft);
  return { draft, published, dirty: JSON.stringify(draft) !== JSON.stringify(published) };
}

/** Image to show for a slot: a CMS replacement when one is published, otherwise the bundled file. */
export const mediaUrl = (id: string) => `/cms-media/${id}`;

/** Every named image slot the public site uses, for the media manager. */
export function imageSlots(c: SiteContent) {
  const slots: { slot: string; label: string }[] = [
    ...DEFAULT_SLIDES.map((s) => ({ slot: s, label: `Hero slide: ${s.replace('-poster', '').replace('-', ' ')}` })),
    { slot: 'about-poster', label: 'About page hero' }, { slot: 'services-poster', label: 'Services page hero' },
    ...services.flatMap((s) => [{ slot: `service-${s.slug}`, label: `${s.name} card` }, { slot: `${s.slug}-poster`, label: `${s.name} page hero` }, { slot: `service-${s.slug}-detail`, label: `${s.name} detail image` }]),
    { slot: 'about-studio', label: 'About: studio image' }, { slot: 'why-us', label: 'Why choose us image' }, { slot: 'owner-portrait', label: 'Founder portrait' },
    ...c.portfolio.map((p) => ({ slot: p.image, label: `Portfolio: ${p.title}` })),
  ];
  const seen = new Set<string>();
  return slots.filter((s) => (seen.has(s.slot) ? false : (seen.add(s.slot), true)));
}
