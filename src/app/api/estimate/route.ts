import crypto from 'node:crypto';
import { computeEstimate, formatMoney, type EstimateInput } from '@/lib/estimate';
import { pricing } from '@/lib/pricing';
import { buildEstimatePdf } from '@/lib/pdf';
import { sendMail, leadInbox } from '@/lib/mail';
import { saveLeadLocally } from '@/lib/leads';
import { json, rateLimited, readJson, str, validateContact } from '@/lib/guard';
import { site } from '@/config/site';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  if (rateLimited(req, 'estimate', 8, 10 * 60_000)) return json({ error: 'Too many requests. Please try again in a few minutes.' }, 429);
  const body = await readJson(req);
  if (!body) return json({ error: 'Invalid request.' }, 400);
  if (body.website) return json({ error: 'Invalid request.' }, 400); // honeypot
  if (body.consent !== true) return json({ error: 'Please agree to be contacted about your estimate.' }, 400);
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
  const reference = `EST-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  try {
    const pdf = await buildEstimatePdf({ estimate, contact: { ...contact.value, address }, pricing, reference, date: now });
    const money = (n: number) => formatMoney(n, pricing, true);
    const summary = `${reference}: ${estimate.input.propertyType}, ${estimate.input.sqft} sq ft, ${pricing.packages[estimate.tier].label} package, ${money(estimate.low)} to ${money(estimate.high)}`;
    const attachments = [{ filename: `${reference}.pdf`, content: pdf }];

    const customerEmail = await sendMail({
      to: contact.value.email,
      subject: `Your interior budget estimate (${reference})`,
      text: `Hello ${contact.value.name},\n\nThank you for using the budget calculator. Your indicative estimate is attached.\n\n${summary}\n\nThis is an estimate, not a quotation.\n\n${site.brand.name}`,
      attachments,
    });
    const teamEmail = await sendMail({
      to: leadInbox(),
      subject: `New budget lead: ${contact.value.name} (${reference})`,
      text: `${contact.value.name}\n${contact.value.phone}\n${contact.value.email}\n${address}\n\n${summary}`,
      replyTo: contact.value.email,
      attachments,
    });
    const savedLocally = saveLeadLocally('estimate', { reference, contact: { ...contact.value, address }, estimate });

    return json({
      reference,
      estimate,
      pdfBase64: pdf.toString('base64'),
      customerEmail,
      teamNotified: teamEmail === 'sent' || savedLocally,
    });
  } catch (err) {
    console.error('[estimate]', (err as Error).message);
    return json({ error: 'We could not generate your estimate PDF. Please try again.' }, 500);
  }
}
