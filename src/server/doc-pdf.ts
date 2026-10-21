import PDFDocument from 'pdfkit';
import { computeTotals, lineTotal, STATUS_LABEL, typeInfo, type DocData } from './doc-math';
import type { Company } from './settings';

const GREEN = '#166534', INK = '#18251d', MUTED = '#728076', LINE = '#e3ebe5', SOFT = '#f0f7f1';
const money = (n: number) => `BDT ${new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
const dateText = (d: string | null) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');

export interface PdfInput {
  number: string; type: string; version: number; status: string; data: DocData; company: Company;
  client: { name: string; company: string | null; phone: string | null; email: string | null; address: string | null } | null;
  project: { name: string; code: string; location: string | null } | null;
  paid?: number;
}

export function buildDocumentPdf(i: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: `${i.number} v${i.version}`, Author: i.company.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 48, W = doc.page.width - 96, R = L + W;
    const t = computeTotals(i.data);
    const info = typeInfo(i.type);
    const ensure = (h: number) => { if (doc.y + h > doc.page.height - 90) doc.addPage(); };

    // Brand mark (arch + dot) drawn as vectors
    doc.save().translate(L, 44).scale(0.075).translate(-690, -565);
    doc.path('M700 838V690c0-40 20-77 55-95M900 838V690c0-40-20-77-55-95').lineWidth(22).lineCap('round').stroke(INK);
    doc.circle(800, 577, 28).fill('#16a34a');
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text(i.company.name, L + 36, 44, { width: 280 });
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(i.company.tagline.toUpperCase(), L + 36, doc.y, { characterSpacing: 1 });
    const contact = [i.company.address, i.company.phone, i.company.email, i.company.website].filter(Boolean).join('  |  ');
    if (contact) doc.fontSize(8).text(contact, L + 36, doc.y + 2, { width: 300 });

    doc.font('Helvetica-Bold').fontSize(20).fillColor(GREEN).text(info.label.toUpperCase().replace('INTERIOR DESIGN ', ''), L, 44, { width: W, align: 'right' });
    doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(`No. ${i.number}${i.version > 1 ? `  (revision ${i.version})` : ''}`, L, doc.y + 2, { width: W, align: 'right' });
    doc.fillColor(MUTED).text(`Issued ${dateText(i.data.issueDate)}`, { width: W, align: 'right' });
    if (i.data.dueDate) doc.text(`${info.kind === 'invoice' ? 'Due' : 'Valid until'} ${dateText(i.data.dueDate)}`, { width: W, align: 'right' });
    doc.text(`Status: ${STATUS_LABEL[i.status] ?? i.status}`, { width: W, align: 'right' });

    doc.y = Math.max(doc.y, 118) + 8;
    doc.moveTo(L, doc.y).lineTo(R, doc.y).strokeColor(GREEN).lineWidth(1.5).stroke();
    doc.moveDown(0.8);

    // Parties
    const top = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('BILLED TO', L, top, { characterSpacing: 1 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(i.client?.name ?? 'No client selected', L, doc.y + 2, { width: 240 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    [i.client?.company, i.client?.address, i.client?.phone, i.client?.email].filter(Boolean).forEach((x) => doc.text(String(x), { width: 240 }));
    const leftEnd = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('PROJECT', 330, top, { characterSpacing: 1 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(i.project?.name ?? '-', 330, doc.y + 2, { width: R - 330 });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    if (i.project) doc.text(`${i.project.code}${i.project.location ? '  |  ' + i.project.location : ''}`, 330, doc.y, { width: R - 330 });
    doc.y = Math.max(leftEnd, doc.y) + 14;

    if (i.data.title) { doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(i.data.title, L, doc.y, { width: W }); doc.moveDown(0.6); }

    // Table
    const col = { n: L, d: L + 22, q: L + 280, u: L + 332, p: L + 370, a: L + 450 };
    const head = () => {
      const y = doc.y;
      doc.rect(L, y, W, 22).fill(SOFT);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
      doc.text('#', col.n + 4, y + 7); doc.text('DESCRIPTION', col.d, y + 7); doc.text('QTY', col.q, y + 7, { width: 44, align: 'right' }); doc.text('UNIT', col.u + 6, y + 7);
      doc.text('PRICE', col.p, y + 7, { width: 72, align: 'right' }); doc.text('AMOUNT', col.a, y + 7, { width: R - col.a - 4, align: 'right' });
      doc.y = y + 28;
    };
    head();
    doc.font('Helvetica').fontSize(9.5).fillColor(INK);
    i.data.lines.forEach((l, idx) => {
      const h = Math.max(18, doc.heightOfString(l.description, { width: 250 }) + 8);
      if (doc.y + h > doc.page.height - 110) { doc.addPage(); head(); doc.font('Helvetica').fontSize(9.5).fillColor(INK); }
      const y = doc.y;
      doc.fillColor(MUTED).text(String(idx + 1), col.n + 4, y, { width: 16 });
      doc.fillColor(INK).text(l.description, col.d, y, { width: 250 });
      doc.text(String(l.qty), col.q, y, { width: 44, align: 'right' }); doc.fillColor(MUTED).text(l.unit, col.u + 6, y, { width: 36 });
      doc.fillColor(INK).text(new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2 }).format(l.price), col.p, y, { width: 72, align: 'right' });
      doc.text(new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2 }).format(lineTotal(l)), col.a, y, { width: R - col.a - 4, align: 'right' });
      doc.y = y + h;
      doc.moveTo(L, doc.y - 3).lineTo(R, doc.y - 3).strokeColor(LINE).lineWidth(0.6).stroke();
    });

    // Totals
    ensure(130);
    doc.moveDown(0.6);
    const row = (label: string, value: string, bold = false, size = 10) => {
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(bold ? INK : MUTED).text(label, L + 270, y, { width: 120 });
      doc.fillColor(INK).text(value, L + 390, y, { width: R - L - 390, align: 'right' });
      doc.y = y + size + 6;
    };
    row('Subtotal', money(t.subtotal));
    if (t.discount > 0) row(`Discount${i.data.discountKind === 'percent' ? ` (${i.data.discountValue}%)` : ''}`, '- ' + money(t.discount));
    if (i.data.taxPercent > 0) row(`${i.data.taxLabel} (${i.data.taxPercent}%)`, money(t.tax));
    doc.moveTo(L + 270, doc.y).lineTo(R, doc.y).strokeColor(GREEN).lineWidth(1).stroke(); doc.moveDown(0.4);
    row('TOTAL', money(t.total), true, 12);
    if (info.kind === 'invoice' && (i.paid ?? 0) > 0) { row('Paid to date', '- ' + money(i.paid!)); row('Balance due', money(Math.max(0, t.total - (i.paid ?? 0))), true, 11); }

    const block = (title: string, text: string) => {
      if (!text) return;
      ensure(50 + doc.heightOfString(text, { width: W }));
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(title.toUpperCase(), L, doc.y, { characterSpacing: 1 });
      doc.font('Helvetica').fontSize(9).fillColor(INK).text(text, L, doc.y + 2, { width: W });
    };
    block('Payment terms', i.data.paymentTerms);
    block('Bank / payment details', info.kind === 'invoice' ? i.company.bank : '');
    block('Notes', i.data.notes);
    block('Terms and conditions', i.data.terms);

    // Footer with page numbers on every page
    const pages = doc.bufferedPageRange();
    for (let p = 0; p < pages.count; p++) {
      doc.switchToPage(p);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // writing inside the bottom margin must not trigger a new page
      doc.font('Helvetica').fontSize(8).fillColor(MUTED);
      doc.text(`${i.company.name}  |  ${i.number}${i.version > 1 ? ` rev ${i.version}` : ''}`, L, doc.page.height - 38, { width: W / 2, lineBreak: false });
      doc.text(`Page ${p + 1} of ${pages.count}`, L + W / 2, doc.page.height - 38, { width: W / 2, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
