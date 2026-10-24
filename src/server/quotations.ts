import { q, q1 } from './db';
import type { Estimate } from '@/lib/estimate';

interface Contact { name: string; email: string; phone: string; address?: string; whatsapp?: boolean }

/**
 * Mirrors a website quotation request into the database (one row plus one row per space), so it can be queried and reported on.
 * Best effort and idempotent: the lead record and the emails are the source of truth, so a failure here is logged, never thrown.
 */
export async function recordQuotation(reference: string, c: Contact, e: Estimate): Promise<void> {
  try {
    const row = await q1<{ id: string }>(
      `INSERT INTO quotations (reference, name, email, phone, whatsapp, address, property_type, carpet_sqft, bhk, package, tier, configuration, low, high)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (reference) DO NOTHING RETURNING id`,
      [reference, c.name, c.email, c.phone, Boolean(c.whatsapp), c.address || null, e.input.propertyType, Math.round(e.input.sqft), e.input.bhk ?? null, e.input.package, e.tier ?? null,
        JSON.stringify({ extras: e.extras.map((x) => x.label), sizeLabel: e.input.sizeLabel ?? null }), e.low, e.high]);
    if (!row) return;
    for (const l of e.lines) {
      await q(`INSERT INTO quotation_spaces (quotation_id, name, count) VALUES ($1,$2,$3)`, [row.id, l.label, Math.max(1, Math.round(l.qty))]);
    }
  } catch (err) {
    console.error('[quotation] database copy failed:', (err as Error).message);
  }
}
