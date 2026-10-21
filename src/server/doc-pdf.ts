import PDFDocument from 'pdfkit';
import { computeTotals, isInvoiceKind, lineTotal, type DocData } from './doc-math';
import type { Company } from './settings';

// Brand palette taken from the logo: deep navy and copper.
const NAVY = '#2b273e', COPPER = '#b3683e', COPPER_L = '#e7b48f', CREAM = '#f7f2e9', LINE = '#e6dccb', INK = '#26231f', MUTED = '#7a7268', GREEN = '#2f7d4f', RED = '#b42318';
const money = (n: number) => `BDT ${new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
const plain = (n: number) => new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const dateText = (d: string | null) => (d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-');

export interface PdfInput {
  number: string; type: string; version: number; status: string; data: DocData; company: Company;
  client: { name: string; company: string | null; phone: string | null; email: string | null; address: string | null; taxId?: string | null } | null;
  project: { name: string; code: string; location: string | null } | null;
  paid?: number;
}

type Doc = InstanceType<typeof PDFDocument>;

/** The studio mark (arch and dot) drawn as vectors, so it stays sharp at any size. */
function drawMark(doc: Doc, x: number, y: number, scale: number, arch: string, dot: string) {
  doc.save().translate(x, y).scale(scale).translate(-690, -566);
  doc.path('M700 838V690c0-40 20-77 55-95M900 838V690c0-40-20-77-55-95').lineWidth(22).lineCap('round').stroke(arch);
  doc.circle(800, 577, 28).fill(dot);
  doc.restore();
}

export function buildDocumentPdf(i: PdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const M = 40;
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true, info: { Title: `${i.number} v${i.version}`, Author: i.company.name } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PW = doc.page.width, PH = doc.page.height, R = PW - M, W = PW - 2 * M;
    const t = computeTotals(i.data);
    const inv = isInvoiceKind(i.type);
    const paid = i.paid ?? 0;
    const balance = Math.max(0, t.total - paid);
    const title = (inv ? (i.type === 'receipt' ? 'RECEIPT' : 'INVOICE') : i.type === 'proposal' ? 'PROPOSAL' : i.type === 'estimate' ? 'ESTIMATE' : 'QUOTATION');
    const stamp = i.status === 'cancelled' ? { text: 'CANCELLED', color: RED } : inv && t.total > 0 && paid >= t.total - 0.005 ? { text: 'PAID', color: GREEN } : ['draft', 'pending'].includes(i.status) ? { text: 'DRAFT', color: '#9a93a8' } : null;
    const bottomLimit = PH - 74; // keep clear of the footer

    // ---------- header band ----------
    const drawBand = () => {
      doc.rect(0, 0, PW, 108).fill(NAVY);
      doc.rect(0, 108, PW, 4).fill(COPPER);
      drawMark(doc, M - 2, 17, 0.17, '#ffffff', COPPER_L);
      doc.font('Times-Bold').fontSize(21).fillColor('#ffffff').text(i.company.name, M + 48, 28, { width: 270, lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(COPPER_L).text(i.company.tagline.toUpperCase(), M + 48, 55, { width: 270, characterSpacing: 1.6, lineBreak: false });
      const contact = [i.company.address, [i.company.phone, i.company.email].filter(Boolean).join('   '), i.company.website].filter(Boolean);
      doc.font('Helvetica').fontSize(7.8).fillColor('#cfc9dc');
      let cy = 70;
      for (const l of contact) { doc.text(l, M + 48, cy, { width: 290, lineBreak: false, ellipsis: true }); cy += 10.5; }
      doc.font('Times-Bold').fontSize(32).fillColor('#ffffff').text(title, M, 24, { width: W, align: 'right', characterSpacing: 2, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COPPER_L).text(`No. ${i.number}${i.version > 1 ? `  ·  Revision ${i.version}` : ''}`, M, 66, { width: W, align: 'right', lineBreak: false });
      doc.font('Helvetica').fontSize(8.5).fillColor('#cfc9dc').text(`Issued ${dateText(i.data.issueDate)}${i.data.dueDate ? `   ·   ${inv ? 'Due' : 'Valid until'} ${dateText(i.data.dueDate)}` : ''}`, M, 82, { width: W, align: 'right', lineBreak: false });
    };
    drawBand();
    // Slim running header on following pages
    doc.on('pageAdded', () => {
      doc.rect(0, 0, PW, 30).fill(NAVY); doc.rect(0, 30, PW, 2.5).fill(COPPER);
      drawMark(doc, M - 1, 5, 0.07, '#ffffff', COPPER_L);
      doc.font('Times-Bold').fontSize(11).fillColor('#ffffff').text(i.company.name, M + 22, 10, { lineBreak: false });
      doc.font('Helvetica').fontSize(8).fillColor(COPPER_L).text(`${title} ${i.number}${i.version > 1 ? ` rev ${i.version}` : ''}`, M, 12, { width: W, align: 'right', lineBreak: false });
      doc.y = 52;
    });

    // ---------- parties ----------
    let y = 132;
    const label = (txt: string, x: number, yy: number) => doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COPPER).text(txt, x, yy, { characterSpacing: 1.5, lineBreak: false });
    label('BILLED TO', M, y);
    doc.font('Times-Bold').fontSize(14).fillColor(NAVY).text(i.client?.name ?? 'No client selected', M, y + 12, { width: 230 });
    doc.font('Helvetica').fontSize(8.8).fillColor(MUTED);
    [i.client?.company, i.client?.address, [i.client?.phone, i.client?.email].filter(Boolean).join('  ·  '), i.client?.taxId ? `BIN / TIN: ${i.client.taxId}` : null].filter(Boolean).forEach((l) => doc.text(String(l), M, doc.y + 1, { width: 230 }));
    const leftEnd = doc.y;

    label('PROJECT', 285, y);
    doc.font('Times-Bold').fontSize(12).fillColor(NAVY).text(i.project?.name ?? '-', 285, y + 12, { width: 120 });
    doc.font('Helvetica').fontSize(8.8).fillColor(MUTED);
    if (i.project) doc.text(`${i.project.code}${i.project.location ? `  ·  ${i.project.location}` : ''}`, 285, doc.y + 1, { width: 120 });
    if (i.data.reference) doc.text(`Client ref: ${i.data.reference}`, 285, doc.y + 1, { width: 120 });
    const midEnd = doc.y;

    // key figure box
    const bx = 418, bw = R - bx, bh = 62;
    doc.roundedRect(bx, y - 4, bw, bh, 6).fill(CREAM);
    doc.rect(bx, y - 4, 3, bh).fill(COPPER);
    const fullyPaid = inv && t.total > 0 && paid >= t.total - 0.005;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(fullyPaid ? GREEN : COPPER).text(fullyPaid ? 'PAID IN FULL' : inv ? (balance < t.total ? 'BALANCE DUE' : 'AMOUNT DUE') : 'TOTAL ESTIMATE', bx + 12, y + 3, { characterSpacing: 1.3, lineBreak: false });
    doc.font('Times-Bold').fontSize(13.5).fillColor(NAVY).text(money(inv ? balance : t.total), bx + 12, y + 16, { width: bw - 14, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(inv ? (i.data.dueDate ? `Due ${dateText(i.data.dueDate)}` : 'Due on receipt') : (i.data.dueDate ? `Valid until ${dateText(i.data.dueDate)}` : ''), bx + 12, y + 38, { width: bw - 16, lineBreak: false });

    y = Math.max(leftEnd, midEnd, y - 4 + bh) + 14;
    if (i.data.title) {
      doc.font('Times-Italic').fontSize(12.5).fillColor(INK).text(i.data.title, M, y, { width: W });
      y = doc.y + 8;
    }

    // ---------- items table ----------
    const col = { n: M + 8, d: M + 30, q: M + 262, u: M + 312, p: M + 352, a: M + 425 };
    const head = () => {
      doc.rect(M, y, W, 22).fill(NAVY);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
      const ty = y + 7.5, o = { characterSpacing: 1, lineBreak: false } as const;
      doc.text('#', col.n, ty, o); doc.text('DESCRIPTION', col.d, ty, o); doc.text('QTY', col.q, ty, { ...o, width: 44, align: 'right' }); doc.text('UNIT', col.u + 6, ty, o);
      doc.text('UNIT PRICE', col.p, ty, { ...o, width: 66, align: 'right' }); doc.text('AMOUNT', col.a, ty, { ...o, width: R - col.a - 8, align: 'right' });
      y += 22;
    };
    head();
    i.data.lines.forEach((l, idx) => {
      doc.font('Helvetica').fontSize(9.3);
      const h = Math.max(22, doc.heightOfString(l.description, { width: 224 }) + 12);
      if (y + h > bottomLimit - 20) { doc.addPage(); y = 52; head(); doc.font('Helvetica').fontSize(9.3); }
      if (idx % 2 === 1) doc.rect(M, y, W, h).fill(CREAM);
      doc.fillColor(MUTED).text(String(idx + 1), col.n, y + 6.5, { width: 18, lineBreak: false });
      doc.fillColor(INK).text(l.description, col.d, y + 6.5, { width: 224 });
      doc.text(String(l.qty), col.q, y + 6.5, { width: 44, align: 'right', lineBreak: false });
      doc.fillColor(MUTED).text(l.unit, col.u + 6, y + 6.5, { width: 36, lineBreak: false });
      doc.fillColor(INK).text(plain(l.price), col.p, y + 6.5, { width: 66, align: 'right', lineBreak: false });
      doc.font('Helvetica-Bold').text(plain(lineTotal(l)), col.a, y + 6.5, { width: R - col.a - 8, align: 'right', lineBreak: false });
      y += h;
      doc.moveTo(M, y).lineTo(R, y).lineWidth(0.5).strokeColor(LINE).stroke();
    });
    y += 14;

    // ---------- payment details (left) and totals (right) ----------
    const needTotals = 150 + (paid > 0 ? 36 : 0);
    if (y + needTotals > bottomLimit) { doc.addPage(); y = 52; }
    const topY = y;
    const tx = 330, tw = R - tx;
    const trow = (k: string, v: string, color = MUTED, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.3).fillColor(color).text(k, tx, y, { width: 110, lineBreak: false });
      doc.fillColor(bold ? INK : INK).text(v, tx + 110, y, { width: tw - 118, align: 'right', lineBreak: false });
      y += 17;
    };
    if (t.discount > 0 || i.data.taxPercent > 0) trow('Subtotal', money(t.subtotal));
    if (t.discount > 0) trow(`Discount${i.data.discountKind === 'percent' ? ` (${i.data.discountValue}%)` : ''}`, '- ' + money(t.discount));
    if (i.data.taxPercent > 0) trow(`${i.data.taxLabel} (${i.data.taxPercent}%)`, money(t.tax));
    y += 3;
    doc.roundedRect(tx, y, tw, 34, 5).fill(NAVY);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COPPER_L).text('TOTAL', tx + 12, y + 13, { characterSpacing: 1.5, lineBreak: false });
    doc.font('Times-Bold').fontSize(15).fillColor('#ffffff').text(money(t.total), tx + 50, y + 9.5, { width: tw - 62, align: 'right', lineBreak: false });
    y += 34 + 10;
    if (inv && paid > 0) {
      trow('Paid to date', '- ' + money(paid), GREEN);
      doc.roundedRect(tx, y - 2, tw, 30, 5).lineWidth(1.2).strokeColor(COPPER).stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COPPER).text('BALANCE DUE', tx + 12, y + 9.5, { characterSpacing: 1.3, lineBreak: false });
      doc.font('Times-Bold').fontSize(13).fillColor(COPPER).text(money(balance), tx + 90, y + 7, { width: tw - 102, align: 'right', lineBreak: false });
      y += 34;
    }

    // left column: how to pay / terms
    let ly = topY;
    const boxText = (head: string, body: string) => {
      if (!body.trim()) return;
      doc.font('Helvetica').fontSize(8.6);
      const h = doc.heightOfString(body, { width: 262 }) + 30;
      doc.roundedRect(M, ly, 280, h, 5).fill(CREAM); doc.rect(M, ly, 3, h).fill(COPPER);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COPPER).text(head, M + 14, ly + 9, { characterSpacing: 1.3, lineBreak: false });
      doc.font('Helvetica').fontSize(8.6).fillColor(INK).text(body, M + 14, ly + 21, { width: 262 });
      ly += h + 8;
    };
    if (inv) boxText('HOW TO PAY', [i.company.bank, i.company.mobileBanking ? `Mobile banking: ${i.company.mobileBanking}` : ''].filter(Boolean).join('\n'));
    boxText('PAYMENT TERMS', i.data.paymentTerms);
    y = Math.max(y, ly) + 6;

    // ---------- notes and terms ----------
    const block = (head: string, body: string) => {
      if (!body.trim()) return;
      doc.font('Helvetica').fontSize(8.4);
      const h = doc.heightOfString(body, { width: W }) + 24;
      if (y + h > bottomLimit - 60) { doc.addPage(); y = 52; }
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COPPER).text(head, M, y, { characterSpacing: 1.3, lineBreak: false });
      doc.font('Helvetica').fontSize(8.4).fillColor(MUTED).text(body, M, y + 12, { width: W });
      y = doc.y + 10;
    };
    block('NOTES', i.data.notes);
    block('TERMS AND CONDITIONS', i.data.terms);

    // ---------- signatures ----------
    if (y + 70 > bottomLimit) { doc.addPage(); y = 52; }
    y += 14;
    const sig = (x: number, who: string, role: string) => {
      doc.moveTo(x, y + 28).lineTo(x + 190, y + 28).lineWidth(0.8).strokeColor(NAVY).stroke();
      doc.font('Times-Italic').fontSize(10.5).fillColor(INK).text(who, x, y + 32, { width: 190, lineBreak: false });
      doc.font('Helvetica').fontSize(7.8).fillColor(MUTED).text(role, x, y + 46, { width: 190, lineBreak: false });
    };
    if (!inv) sig(M, 'Client acceptance', 'Signature and date');
    sig(R - 190, i.company.signatoryName || i.company.name, i.company.signatoryName ? `${i.company.signatoryTitle}, ${i.company.name}` : i.company.signatoryTitle);
    if (stamp?.text === 'PAID') {
      // Stamp sits in the empty space beside the signature, clear of the figures.
      doc.save().rotate(-10, { origin: [M + 90, y + 20] }).opacity(0.55);
      doc.roundedRect(M + 10, y - 6, 160, 54, 8).lineWidth(3).strokeColor(GREEN).stroke();
      doc.font('Times-Bold').fontSize(38).fillColor(GREEN).text('PAID', M + 10, y + 2, { width: 160, align: 'center', lineBreak: false });
      doc.restore();
    }

    // ---------- footers on every page ----------
    const pages = doc.bufferedPageRange();
    const legal = [i.company.tin ? `TIN ${i.company.tin}` : '', i.company.bin ? `BIN ${i.company.bin}` : '', i.company.tradeLicense ? `Trade licence ${i.company.tradeLicense}` : ''].filter(Boolean).join('   ·   ');
    for (let p = 0; p < pages.count; p++) {
      doc.switchToPage(p);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // writing inside the bottom margin must not trigger a new page
      if (stamp && stamp.text !== 'PAID') {
        doc.save().rotate(-32, { origin: [PW / 2, PH / 2] }).opacity(0.07);
        doc.font('Times-Bold').fontSize(120).fillColor(stamp.color).text(stamp.text, 0, PH / 2 - 60, { width: PW, align: 'center', lineBreak: false });
        doc.restore();
      }
      doc.moveTo(M, PH - 56).lineTo(R, PH - 56).lineWidth(0.8).strokeColor(COPPER).stroke();
      doc.font('Times-Italic').fontSize(10).fillColor(NAVY).text(i.company.invoiceFooter || '', M, PH - 48, { width: W * 0.62, lineBreak: false });
      doc.font('Helvetica').fontSize(7.6).fillColor(MUTED).text(`Page ${p + 1} of ${pages.count}`, M, PH - 47, { width: W, align: 'right', lineBreak: false });
      if (legal) doc.text(legal, M, PH - 32, { width: W, lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
