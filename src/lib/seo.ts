import { site } from '@/config/site';

/** Builders for schema.org JSON-LD. Only facts that are visible on the site are included; unverified details are left out. */
export const abs = (path: string) => `${site.url}${path}`;

export function organizationLd() {
  const sameAs = site.social.map((s) => s.href);
  return [
    {
      '@context': 'https://schema.org', '@type': 'Organization', name: site.brand.name, url: abs('/'), logo: abs('/logo-mark.svg'), slogan: site.brand.tagline,
      description: 'Interior design studio for homes, offices and showrooms.',
      ...(sameAs.length ? { sameAs } : {}),
    },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: site.brand.name, url: abs('/') },
  ];
}

export const breadcrumbLd = (items: [string, string][]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
});

export const faqLd = (faqs: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

/** Plain-language answers shown on the services page and published as FAQ structured data. */
export const SITE_FAQ = [
  { q: `What does ${site.brand.name} design?`, a: 'Interiors for homes, offices and showrooms: kitchens, bedrooms, bathrooms, living and dining spaces, offices and showrooms, from a single room to a complete fit-out.' },
  { q: 'How can I get a budget estimate?', a: 'Use the free budget calculator. Choose Home, Office or Showroom, your size and rooms, and a package. Your quotation is emailed to you as a PDF.' },
  { q: 'Is the estimate a final price?', a: 'No. It is an indicative range based on the details you enter. The final price is confirmed in writing after a consultation and site assessment.' },
  { q: 'How do I book a consultation?', a: 'Use the Book a consultation form on the contact page. Tell us about your space and the studio will get in touch using your details.' },
  { q: 'Are the projects on the site completed client work?', a: 'The projects shown are concept designs that show the studio’s direction. Real projects will replace them as they are approved for publishing.' },
];
