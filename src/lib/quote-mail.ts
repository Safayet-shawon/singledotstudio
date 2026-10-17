import { formatMoney, type Estimate, type Pricing } from './estimate';
import { site } from '@/config/site';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const TYPE = { apartment: 'Apartment', villa: 'Independent house / villa', office: 'Office' } as const;

/** Customer quotation: selected package in detail with its price, the other packages listed small underneath. */
export function quoteEmail(e: Estimate, pricing: Pricing, name: string, reference: string) {
  const m = (n: number) => formatMoney(n, pricing, true);
  const chosen = e.input.package === 'bestfit' ? e.tier : e.input.package;
  const pk = pricing.packages[e.input.package];
  const others = (['essential', 'premium', 'luxury', 'bestfit'] as const).filter((k) => k !== chosen && k !== e.input.package);
  const prop = e.input.propertyType === 'office' ? `Office, ${e.input.sqft} sq ft` : `${TYPE[e.input.propertyType]}, ${e.input.bhk} BHK, ${e.input.sqft} sq ft`;
  const spaces = [...e.lines.map((l) => `${l.label}${l.qty > 1 ? ` × ${l.qty}` : ''}`), ...e.extras.map((x) => `Add-on: ${x.label}`)];

  const html = `<div style="font-family:Georgia,'Times New Roman',serif;color:#26231f;max-width:600px;margin:auto;padding:28px;background:#f7f2e9">
<p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#6b6b4a;margin:0 0 6px">${esc(site.brand.name)}</p>
<h1 style="font-weight:500;font-size:26px;margin:0 0 14px">Your interior design quotation</h1>
<p style="font-size:15px;line-height:1.6">Hello ${esc(name)}, thank you for your request. Here is the quotation for ${esc(prop)}.</p>
<div style="background:#fff;border:1px solid #ddd3c3;padding:20px;margin:18px 0">
  <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b4a;margin:0">Selected package</p>
  <h2 style="font-weight:500;font-size:24px;margin:4px 0 8px">${esc(pricing.packages[chosen].label)}${e.input.package === 'bestfit' ? ' <span style="font-size:13px;color:#7b7268">(recommended for you)</span>' : ''}</h2>
  <p style="font-size:14px;line-height:1.6;color:#5d554c;margin:0 0 10px">${esc(pricing.packages[chosen].scope)}</p>
  <ul style="font-size:14px;line-height:1.7;padding-left:18px;margin:0 0 14px">${pk.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
  <p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6b6b4a;margin:0">Estimated price</p>
  <p style="font-size:28px;margin:2px 0 0">${esc(m(e.low))} <span style="font-size:16px;color:#7b7268">to</span> ${esc(m(e.high))}</p>
  <p style="font-size:12px;color:#7b7268;margin:6px 0 0">Reference ${esc(reference)}. Final figure after consultation and site measurement.</p>
</div>
<p style="font-size:13px;line-height:1.7;margin:0 0 4px"><strong>Included spaces</strong></p>
<p style="font-size:13px;line-height:1.7;color:#5d554c;margin:0 0 20px">${esc(spaces.join(', '))}</p>
<p style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7b7268;margin:0 0 6px">Other packages</p>
${others.map((k) => `<p style="font-size:12px;line-height:1.5;color:#7b7268;margin:0 0 4px"><strong style="color:#26231f">${esc(pricing.packages[k].label)}</strong> · ${esc(pricing.packages[k].tagline)}${k === 'bestfit' ? '' : ` · about ${esc(m(e.tierTotals[k]))}`}</p>`).join('')}
<p style="font-size:12px;color:#7b7268;margin:22px 0 0">The detailed quotation is attached as a PDF. Our team will contact you shortly.</p>
</div>`;

  const text = `Hello ${name},\n\nYour quotation for ${prop}\n\nSelected package: ${pricing.packages[chosen].label}\n${pricing.packages[chosen].scope}\n${pk.features.map((f) => `- ${f}`).join('\n')}\n\nEstimated price: ${m(e.low)} to ${m(e.high)}\nReference: ${reference}\n\nIncluded: ${spaces.join(', ')}\n\nOther packages:\n${others.map((k) => `${pricing.packages[k].label} - ${pricing.packages[k].tagline}${k === 'bestfit' ? '' : ` (about ${m(e.tierTotals[k])})`}`).join('\n')}\n\nThe detailed quotation is attached. ${site.brand.name}`;
  return { html, text };
}
