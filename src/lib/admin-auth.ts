import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'sds_admin';
const secret = () => process.env.ADMIN_PASSWORD || '';
const sign = (v: string) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export const adminConfigured = () => secret().length >= 8;

export function passwordOk(input: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(secret());
  return adminConfigured() && a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Cookie value: expiry timestamp + HMAC of it, so it cannot be forged without the admin password. */
export function makeSession(days = 7) {
  const exp = String(Date.now() + days * 86_400_000);
  return `${exp}.${sign(exp)}`;
}

export function sessionValid(v: string | undefined | null) {
  if (!v || !adminConfigured()) return false;
  const [exp, sig] = v.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const want = sign(exp);
  return sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}

export async function isAdmin() {
  return sessionValid((await cookies()).get(ADMIN_COOKIE)?.value);
}
