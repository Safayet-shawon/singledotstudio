import crypto from 'node:crypto';
import { computeEstimate, formatMoney, type EstimateInput } from '@/lib/estimate';
import { pricing } from '@/lib/pricing';
import { buildEstimatePdf } from '@/lib/pdf';
import { sendMailX, leadInbox } from '@/lib/mail';
import { saveLead } from '@/lib/leads';
import { quoteEmail } from '@/lib/quote-mail';
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

  let estimate;
  try {
    estimate = computeEstimate(body.estimateInput as EstimateInput, pricing);
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
  const address = str(body.address, 300);
  const now = new Date();
  const reference = `QUO-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const c = { ...contact.value, address };

  try {
    const pdf = await buildEstimatePdf({ estimate, contact: c, pricing, reference, date: now });
    const attachments = [{ filename: `${reference}.pdf`, content: pdf }];
    const money = (n: number) => formatMoney(n, pricing, true);
    const summary = `${reference}: ${estimate.input.propertyType}, ${estimate.input.sqft} sq ft, ${pricing.packages[estimate.tier].label} package, ${money(estimate.low)} to ${money(estimate.high)}`;

    const q = quoteEmail(estimate, pricing, c.name, reference);
    const customerMail = await sendMailX({ to: c.email, subject: `Your interior design quotation, ${site.brand.name} (${reference})`, text: q.text, html: q.html, attachments });
    const teamMail = await sendMailX({
      to: leadInbox(),
      subject: `New quotation request: ${c.name} (${reference})`,
      text: `A customer requested a quotation.

${c.name}
${c.phone}
${c.email}
${address || '-'}

${summary}

The customer's copy of the quotation is attached.`,
      replyTo: c.email,
      attachments,
    });
    const saved = await saveLead({
      reference, kind: 'quotation', at: now.toISOString(), contact: c, estimate,
      mail: { customer: customerMail.status, team: teamMail.status, customerPreview: customerMail.preview ?? null, teamPreview: teamMail.preview ?? null },
    });

    return json({ reference, customerEmail: customerMail.status, teamNotified: teamMail.status === 'sent' || saved });
  } catch (err) {
    console.error('[estimate]', (err as Error).message);
    return json({ error: 'We could not prepare your quotation. Please try again.' }, 500);
  }
}
