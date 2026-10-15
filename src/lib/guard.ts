// Small helpers shared by API routes: best-effort rate limit, validation, safe JSON parsing.
// NOTE: the rate limiter is per server instance (in memory). It slows casual abuse but is not a hard
// guarantee on serverless; add Vercel Firewall rate-limiting or a shared store for strict limits.

const hits = new Map<string, { count: number; reset: number }>();

export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export function rateLimited(req: Request, bucket: string, max: number, windowMs: number) {
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const rec = hits.get(key);
  if (!rec || rec.reset < now) { hits.set(key, { count: 1, reset: now + windowMs }); return false; }
  return ++rec.count > max;
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
