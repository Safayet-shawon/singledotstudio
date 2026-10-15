import PDFDocument from 'pdfkit';
import { formatMoney, type Estimate, type Pricing } from './estimate';
import { site } from '@/config/site';

const INK = '#2a2622';
const MUTED = '#7b7268';
const OLIVE = '#6b6b4a';
const LINE = '#ddd3c3';

export interface PdfContact { name: string; phone: string; email: string; address?: string }

export function buildEstimatePdf(args: { estimate: Estimate; contact: PdfContact; pricing: Pricing; reference: string; date: Date }): Promise<Buffer> {
  const { estimate: e, contact, pricing, reference, date } = args;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 54, info: { Title: `Budget estimate ${reference}`, Author: site.brand.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const m = (n: number) => formatMoney(n, pricing, true);
    const L = doc.page.margins.left;
    const W = doc.page.width - L - doc.page.margins.right;
    const rule = () => { doc.moveTo(L, doc.y).lineTo(L + W, doc.y).strokeColor(LINE).lineWidth(0.7).stroke(); doc.moveDown(0.6); };
    const kv = (k: string, v: string) => {
      const y = doc.y;
      doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(k, L, y, { width: 110 });
      doc.fillColor(INK).text(v, L + 115, y, { width: W - 115 });
    };
    const ensure = (h: number) => { if (doc.y + h > doc.page.height - 80) doc.addPage(); };

    // Header (replaceable wordmark)
    doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text(site.brand.name.toUpperCase(), L, 54, { characterSpacing: 3 });
    doc.font('Helvetica').fontSize(9).fillColor(OLIVE).text(site.brand.tagline.toUpperCase(), { characterSpacing: 2 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(`Reference ${reference}`, L, 54, { width: W, align: 'right' });
    doc.text(date.toISOString().slice(0, 10), L, 66, { width: W, align: 'right' });
    doc.y = 100;
    rule();
    doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text('Indicative budget estimate');
    doc.moveDown(0.8);

    kv('Prepared for', contact.name);
    kv('Phone', contact.phone);
    kv('Email', contact.email);
    if (contact.address) kv('Project address', contact.address);
    doc.moveDown(0.4);
    const typeLabel = { apartment: 'Apartment', villa: 'Independent house / villa', office: 'Office' }[e.input.propertyType];
    kv('Property', e.input.propertyType === 'office' ? `${typeLabel}, ${e.input.sqft} sq ft` : `${typeLabel}, ${e.input.bhk} BHK, ${e.input.sqft} sq ft`);
    kv('Package', `${pricing.packages[e.input.package].label}${e.input.package === 'bestfit' ? ` (recommended: ${pricing.packages[e.tier].label})` : ''}`);
    doc.moveDown(0.8);

    // Table
    const col = { a: L, q: L + 240, ar: L + 290, amt: L + 380 };
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED);
    const hy = doc.y;
    doc.text('SPACE / ITEM', col.a, hy); doc.text('QTY', col.q, hy); doc.text('AREA (SQ FT)', col.ar, hy);
    doc.text('ESTIMATE', col.amt, hy, { width: L + W - col.amt, align: 'right' });
    doc.moveDown(0.5); rule();
    doc.font('Helvetica').fontSize(10).fillColor(INK);
    for (const l of e.lines) {
      ensure(24);
      const y = doc.y;
      doc.text(l.label, col.a, y, { width: 230 });
      const rowEnd = doc.y;
      doc.text(String(l.qty), col.q, y); doc.text(l.area === null ? '-' : String(l.area), col.ar, y);
      doc.text(m(l.amount), col.amt, y, { width: L + W - col.amt, align: 'right' });
      doc.y = Math.max(rowEnd, y + 14) + 4;
    }
    for (const x of e.extras) {
      ensure(24);
      const y = doc.y;
      doc.text(`Extra: ${x.label}`, col.a, y, { width: 230 });
      doc.text(m(x.amount), col.amt, y, { width: L + W - col.amt, align: 'right' });
      doc.y = y + 18;
    }
    rule();
    const sum = (k: string, v: string, bold = false) => {
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(INK).text(k, col.ar, y, { width: 90 });
      doc.text(v, col.amt, y, { width: L + W - col.amt, align: 'right' });
      doc.y = y + 16;
    };
    sum('Subtotal', m(e.subtotal));
    if (pricing.tax.enabled) sum(`${pricing.tax.label} (${pricing.tax.percent}%)`, m(e.tax));
    sum('Central estimate', m(e.total), true);
    doc.moveDown(0.8);
    ensure(80);
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text('Estimated budget range', L, doc.y);
    doc.font('Helvetica-Bold').fontSize(19).fillColor(INK).text(`${m(e.low)} to ${m(e.high)}`);
    doc.moveDown(1);

    if (e.rationale.length) {
      ensure(60);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Why this package');
      doc.font('Helvetica').fontSize(9).fillColor(MUTED);
      e.rationale.forEach((r) => doc.text(`- ${r}`, { width: W }));
      doc.moveDown(0.8);
    }
    const list = (title: string, items: string[]) => {
      ensure(30 + items.length * 14);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(title, L);
      doc.font('Helvetica').fontSize(9).fillColor(MUTED);
      items.forEach((t) => doc.text(`- ${t}`, { width: W }));
      doc.moveDown(0.8);
    };
    list('Assumptions', pricing.assumptions);
    list('Exclusions', pricing.exclusions);
    list('Next steps', ['Book a consultation so we can confirm scope and measure the space.', 'Receive a detailed design proposal and a final quotation.']);
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MUTED).text(
      'This document is an indicative estimate, not a quotation or contract.' + (pricing.placeholder ? " Rates used are placeholder values pending the studio's confirmed pricing." : ''), { width: W });
    doc.moveDown(0.8);
    const c = site.contact;
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(
      `Contact: ${c.phone ?? '[phone to be added]'}  |  ${c.email ?? '[email to be added]'}  |  ${c.address ?? '[address to be added]'}`, { width: W });
    doc.end();
  });
}
