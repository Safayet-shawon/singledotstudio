/**
 * RFC 9116 security contact. Published only when SECURITY_CONTACT (an email address or https URL) is set, so no
 * made-up contact is ever shown.
 */
export function GET() {
  const contact = process.env.SECURITY_CONTACT?.trim();
  if (!contact || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+|[^\s@]+@[^\s@]+\.[^\s@]+)$/.test(contact)) return new Response('Not found', { status: 404 });
  const c = contact.includes('@') && !contact.startsWith('mailto:') ? `mailto:${contact}` : contact;
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString();
  return new Response(`Contact: ${c}\nExpires: ${expires}\nPreferred-Languages: en\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
