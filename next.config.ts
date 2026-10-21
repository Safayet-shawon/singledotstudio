import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['pdfkit', 'nodemailer', '@electric-sql/pglite'],
  outputFileTracingIncludes: {
    '/api/estimate': ['./node_modules/pdfkit/js/data/**/*'],
    '/admin/documents/[id]/pdf': ['./node_modules/pdfkit/js/data/**/*'],
  },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};
export default config;
