// Helpers shared by public API routes: shared rate limit, same-origin check, validation, safe JSON parsing.

import { hit } from '@/server/ratelimit';

export function clientIp(req: Request) {
  return req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/** Shared (database-backed) request limit. Fails open only if the limiter itself is down, so forms keep working. */
export async function rateLimited(req: Request, bucket: string, max: number, windowMs: number) {
  try { return await hit(`${bucket}:${clientIp(req)}`, max, Math.round(windowMs / 1000)); } catch { return false; }
}

/** Browsers always send Origin on cross-site POSTs. Reject any whose origin is not this site. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients (no cookies are involved on these public endpoints)
  try { return new URL(origin).host === (req.headers.get('x-forwarded-host') || req.headers.get('host')); } catch { return false; }
}

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validateContact(b: Record<string, unknown>, opts: { address?: 'required' | 'optional' } = {}) {
  const c = { name: str(b.name, 80), phone: str(b.phone, 20), email: str(b.email, 120), address: str(b.address, 300) };
  if (c.name.length < 2) return { error: 'Please enter your full name.' } as const;
  if (!/^\+?[\d\s\-()]{7,20}$/.test(c.phone)) return { error: 'Please enter a valid phone number.' } as const;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) return { error: 'Please enter a valid email address.' } as const;
  if (opts.address === 'required' && c.address.length < 3) return { error: 'Please enter your project address or location.' } as const;
  return { value: c } as const;
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text();
    if (text.length > 20_000) return null;
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
