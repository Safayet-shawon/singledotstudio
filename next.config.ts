import type { NextConfig } from 'next';

const dev = process.env.NODE_ENV !== 'production';

// Content-Security-Policy. Scripts need 'unsafe-inline' because Next injects inline bootstrap scripts; a nonce-based policy
// would force every page to render per request. Everything else is locked to this site.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const config: NextConfig = {
  serverExternalPackages: ['pdfkit', 'nodemailer', '@electric-sql/pglite'],
  outputFileTracingIncludes: {
    '/api/estimate': ['./node_modules/pdfkit/js/data/**/*'],
    '/admin/documents/[id]/pdf': ['./node_modules/pdfkit/js/data/**/*'],
  },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }, { key: 'X-Robots-Tag', value: 'noindex' }] },
      { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};
export default config;
