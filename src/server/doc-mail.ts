import type { Company } from './settings';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const bdt = (n: number) => `BDT ${new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;

/** Branded email wrapper (navy and copper, matching the PDF). The PDF itself is attached. */
export function docEmail(o: { company: Company; label: string; number: string; clientName: string; total: number; due: string | null; isInvoice: boolean; copyNote?: string }) {
  const { company: c } = o;
  const dueText = o.due ? new Date(o.due + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
  const html = `<div style="background:#f7f2e9;padding:24px;font-family:Georgia,'Times New Roman',serif;color:#26231f">
<div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e6dccb">
  <div style="background:#2b273e;padding:22px 26px;border-bottom:4px solid #b3683e">
    <div style="font-size:22px;color:#fff;font-weight:bold">${esc(c.name)}</div>
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.18em;color:#e7b48f;margin-top:4px">${esc(c.tagline.toUpperCase())}</div>
  </div>
  <div style="padding:26px">
    ${o.copyNote ? `<p style="font-family:Arial,sans-serif;font-size:12px;color:#b3683e;margin:0 0 12px">${esc(o.copyNote)}</p>` : ''}
    <p style="font-size:16px;margin:0 0 14px">Dear ${esc(o.clientName)},</p>
    <p style="font-size:14px;line-height:1.7;margin:0 0 18px">Please find attached your ${esc(o.label.toLowerCase())} <b>${esc(o.number)}</b>.</p>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin:0 0 18px">
      <tr><td style="padding:10px 12px;background:#f7f2e9;color:#7a7268">Document</td><td style="padding:10px 12px;background:#f7f2e9;text-align:right"><b>${esc(o.number)}</b></td></tr>
      <tr><td style="padding:10px 12px;color:#7a7268">${o.isInvoice ? 'Amount' : 'Total estimate'}</td><td style="padding:10px 12px;text-align:right"><b style="font-size:16px;color:#2b273e">${esc(bdt(o.total))}</b></td></tr>
      ${dueText ? `<tr><td style="padding:10px 12px;background:#f7f2e9;color:#7a7268">${o.isInvoice ? 'Due date' : 'Valid until'}</td><td style="padding:10px 12px;background:#f7f2e9;text-align:right">${esc(dueText)}</td></tr>` : ''}
    </table>
    ${o.isInvoice && (c.bank || c.mobileBanking) ? `<p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.7;margin:0 0 14px;padding:10px 12px;border-left:3px solid #b3683e;background:#f7f2e9;white-space:pre-line"><b style="color:#b3683e;letter-spacing:.1em">HOW TO PAY</b>\n${esc([c.bank, c.mobileBanking ? `Mobile banking: ${c.mobileBanking}` : ''].filter(Boolean).join('\n'))}</p>` : ''}
    <p style="font-size:13px;line-height:1.7;margin:0">If you have any questions, simply reply to this email${c.phone ? ` or call ${esc(c.phone)}` : ''}.</p>
    <p style="font-size:14px;margin:18px 0 0;font-style:italic">${esc(c.invoiceFooter || 'Thank you for your business.')}</p>
  </div>
  <div style="background:#2b273e;padding:12px 26px;font-family:Arial,sans-serif;font-size:11px;color:#cfc9dc">${esc([c.address, c.phone, c.email].filter(Boolean).join('   ·   '))}</div>
</div></div>`;
  const text = `Dear ${o.clientName},\n\nPlease find attached your ${o.label.toLowerCase()} ${o.number}.\n${o.isInvoice ? 'Amount' : 'Total estimate'}: ${bdt(o.total)}${dueText ? `\n${o.isInvoice ? 'Due' : 'Valid until'}: ${dueText}` : ''}\n\n${c.name}`;
  return { html, text };
}
