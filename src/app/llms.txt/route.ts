import { projects, services, site } from '@/config/site';

/** A short, factual summary for AI assistants and crawlers (llms.txt convention). Generated from the same content as the site. */
export function GET() {
  const lines = [
    `# ${site.brand.name}`,
    '',
    `> ${site.brand.name} is an interior design studio for homes, offices and showrooms. This file summarises what the website offers. Prices on the site are indicative, not quotations.`,
    '',
    '## Services',
    ...services.map((s) => `- [${s.name}](${site.url}/services/${s.slug}): ${s.intro}`),
    '',
    '## Key pages',
    `- [Home](${site.url}/)`,
    `- [About the studio](${site.url}/about)`,
    `- [Projects (concept designs)](${site.url}/projects)`,
    `- [Budget calculator](${site.url}/calculate-budget): a guided estimate; the quotation is emailed as a PDF`,
    `- [Book a consultation](${site.url}/contact)`,
    `- [Photo credits](${site.url}/credits)`,
    '',
    '## Projects',
    ...projects.map((p) => `- [${p.title}](${site.url}/projects/${p.slug}): ${p.status === 'concept' ? 'concept design' : 'completed project'}`),
    '',
    '## Notes',
    '- Projects marked as concept designs are not completed client work.',
    '- Estimates are indicative ranges; final pricing is confirmed in writing after consultation and site assessment.',
    '- Contact details are published on the site only when verified.',
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
