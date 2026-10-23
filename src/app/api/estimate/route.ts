import crypto from 'node:crypto';
import { after } from 'next/server';
import { computeEstimate, formatMoney, type EstimateInput } from '@/lib/estimate';
import { pricing } from '@/lib/pricing';
import { buildEstimatePdf } from '@/lib/pdf';
import { sendMailX, leadInbox, mailConfigured } from '@/lib/mail';
import { saveLead } from '@/lib/leads';
import { quoteEmail } from '@/lib/quote-mail';
import { quoteUrl } from '@/lib/quote-link';
import { json, rateLimited, readJson, sameOrigin, str, validateContact } from '@/lib/guard';
import { site } from '@/config/site';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Quotation request: price is never returned to the browser. It goes to the customer and the studio by email, and into the admin panel. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Invalid request.' }, 403);
  if (await rateLimited(req, 'estimate', 8, 10 * 60_000)) return json({ error: 'Too many requests. Please try again in a few minutes.' }, 429);
  const body = await readJson(req);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  if (body.website) return json({ error: 'Invalid request.' }, 400); // honeypot
  if (body.consent !== true) return json({ error: 'Please agree to be contacted about your quotation.' }, 400);
  const contact = validateContact(body);
  if ('error' in contact) return json({ error: contact.error }, 400);

  let estimate: ReturnType<typeof computeEstimate>;
  try {
    const input = { ...(body.estimateInput as EstimateInput) };
    // The size band is display text chosen from a fixed list (or a typed number): accept only that shape.
    if (typeof input.sizeLabel !== 'string' || !/^(\d{3,5}-\d{3,5}|\d{3,5}\+|\d{3,5} sq ft)$/.test(input.sizeLabel)) delete input.sizeLabel;
    estimate = computeEstimate(input, pricing);
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
  const address = str(body.address, 300);
  const now = new Date();
  const reference = `QUO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const whatsapp = body.whatsapp === true;
  const c = { ...contact.value, address, whatsapp };

  /** Builds the PDF and sends both emails at the same time. Never throws. */
  async function deliver() {
    try {
      const pdf = await buildEstimatePdf({ estimate, contact: c, pricing, reference, date: now });
      const attachments = [{ filename: `${reference}.pdf`, content: pdf }];
      const money = (n: number) => formatMoney(n, pricing, true);
      const summary = `${reference}: ${estimate.input.propertyType}, ${estimate.input.sqft} sq ft, ${pricing.packages[estimate.tier].label} package, ${money(estimate.low)} to ${money(estimate.high)}`;
      const q = quoteEmail(estimate, pricing, c.name, reference, quoteUrl(reference));
      const [customerMail, teamMail] = await Promise.all([
        sendMailX({ to: c.email, subject: `Your interior design quotation, ${site.brand.name} (${reference})`, text: q.text, html: q.html, replyTo: leadInbox() || process.env.MAIL_FROM, headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' }, attachments }),
        sendMailX({
          to: leadInbox(),
          subject: `New quotation request: ${c.name} (${reference})`,
          text: `A customer requested a quotation.

${c.name}
${c.phone}${whatsapp ? ' (WhatsApp)' : ''}
${c.email}
${address || '-'}

${summary}

The customer's copy of the quotation is attached.`,
          replyTo: c.email,
          attachments,
        }),
      ]);
      return { customer: customerMail.status, team: teamMail.status, customerPreview: customerMail.preview ?? null, teamPreview: teamMail.preview ?? null };
    } catch (err) {
      console.error('[estimate] delivery failed:', (err as Error).message);
      return { customer: 'failed', team: 'failed', customerPreview: null, teamPreview: null };
    }
  }

  try {
    const lead = { reference, kind: 'quotation' as const, at: now.toISOString(), contact: c, estimate };
    // Store the request first (one quick write) and answer the customer straight away; the PDF and emails follow in the background.
    const saved = await saveLead({ ...lead, mail: { customer: 'queued', team: 'queued', customerPreview: null, teamPreview: null } });
    if (saved) {
      after(async () => { await saveLead({ ...lead, mail: await deliver() }); });
      return json({ reference, customerEmail: mailConfigured() ? 'queued' : 'not_configured', teamNotified: true });
    }
    // Nothing could be stored, so the email is the only copy: wait for it.
    const mail = await deliver();
    return json({ reference, customerEmail: mail.customer, teamNotified: mail.team === 'sent' });
  } catch (err) {
    console.error('[estimate]', (err as Error).message);
    return json({ error: 'We could not prepare your quotation. Please try again.' }, 500);
  }
}
