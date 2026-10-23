import { sendMail, leadInbox } from '@/lib/mail';
import { saveLead } from '@/lib/leads';
import { json, rateLimited, readJson, sameOrigin, str, validateContact } from '@/lib/guard';

export const runtime = 'nodejs';

const SEGMENTS = ['home', 'office', 'showroom'];

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Invalid request.' }, 403);
  if (await rateLimited(req, 'consult', 8, 10 * 60_000)) return json({ error: 'Too many requests. Please try again in a few minutes.' }, 429);
  const b = await readJson(req);
  if (!b || b.website) return json({ error: 'Invalid request.' }, 400);
  if (b.consent !== true) return json({ error: 'Please agree to be contacted.' }, 400);
  const contact = validateContact(b, { address: 'required' });
  if ('error' in contact) return json({ error: contact.error }, 400);

  const c = contact.value;
  const segment = SEGMENTS.includes(str(b.segment, 10)) ? str(b.segment, 10) : 'home';
  const detail = { segment, service: str(b.service, 40), budget: str(b.budget, 60), message: str(b.message, 1000) };

  const emailed = await sendMail({
    to: leadInbox(),
    subject: `New consultation request: ${c.name}`,
    text: `${c.name}\n${c.phone}\n${c.email}\n${c.address}\n\n${Object.entries(detail).map(([k, v]) => `${k}: ${v || '-'}`).join('\n')}`,
    replyTo: c.email,
  });
  const at = new Date().toISOString();
  const saved = await saveLead({ reference: `CON-${at.slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`, kind: 'consultation', at, contact: c, ...detail });

  if (emailed !== 'sent' && !saved) {
    // Never claim success when nothing was delivered.
    return json({ error: 'Online requests are not switched on for this site yet (no lead inbox is configured). Please contact the studio directly.', unconfigured: true }, 503);
  }
  return json({ ok: true });
}
