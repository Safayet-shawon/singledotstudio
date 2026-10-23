import { getLead } from '@/lib/leads';
import { validQuoteToken } from '@/lib/quote-link';
import { buildEstimatePdf } from '@/lib/pdf';
import { pricing } from '@/lib/pricing';
import type { Estimate } from '@/lib/estimate';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Customer's quotation PDF, opened from the WhatsApp link the studio sends. Needs the signed token. */
export async function GET(req: Request, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  if (!validQuoteToken(reference, new URL(req.url).searchParams.get('t'))) return new Response('Not found', { status: 404 });
  const lead = await getLead(reference);
  if (!lead || lead.kind !== 'quotation' || !lead.estimate) return new Response('Not found', { status: 404 });
  const pdf = await buildEstimatePdf({ estimate: lead.estimate as Estimate, contact: lead.contact as { name: string; phone: string; email: string; address?: string }, pricing, reference, date: new Date(lead.at) });
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${reference}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
}
