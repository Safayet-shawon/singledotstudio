import { ADMIN_COOKIE, makeSession, passwordOk } from '@/lib/admin-auth';
import { json, rateLimited, readJson, str } from '@/lib/guard';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (rateLimited(req, 'admin-login', 6, 10 * 60_000)) return json({ error: 'Too many attempts. Try again later.' }, 429);
  const b = await readJson(req);
  if (!b || !passwordOk(str(b.password, 200))) return json({ error: 'Wrong password.' }, 401);
  const res = json({ ok: true });
  res.headers.append('Set-Cookie', `${ADMIN_COOKIE}=${makeSession()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return res;
}

export async function DELETE() {
  const res = json({ ok: true });
  res.headers.append('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}
