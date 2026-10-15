import type { MetadataRoute } from 'next';
import { projects, services, site } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/services', ...services.map((s) => `/services/${s.slug}`), '/about', '/projects', ...projects.map((p) => `/projects/${p.slug}`), '/contact', '/calculate-budget', '/privacy', '/terms'];
  return paths.map((p) => ({ url: `${site.url}${p}`, lastModified: new Date() }));
}
