import crypto from 'node:crypto';
import { abs } from './seo';

const key = () => process.env.QUOTE_LINK_SECRET || process.env.DATABASE_URL || 'dev-only-quote-link';
const sign = (reference: string) => crypto.createHmac('sha256', key()).update(`quote:${reference}`).digest('hex').slice(0, 32);

/** Unguessable link to a customer's quotation PDF; the signature is what authorises the download. */
export const quoteUrl = (reference: string) => abs(`/q/${reference}?t=${sign(reference)}`);

export function validQuoteToken(reference: string, token: string | null) {
  if (!token) return false;
  const a = Buffer.from(sign(reference)), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** wa.me needs the international form: Bangladesh numbers written 01XXXXXXXXX become 8801XXXXXXXXX. */
export function waNumber(phone: string) {
  const d = String(phone).replace(/\D/g, '');
  return d.startsWith('0') && d.length === 11 ? `880${d.slice(1)}` : d;
}
