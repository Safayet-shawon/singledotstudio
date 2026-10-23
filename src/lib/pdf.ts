import { buildDocumentPdf } from '@/server/doc-pdf';
import { getCompany } from '@/server/settings';
import { formatMoney, type Estimate, type Pricing } from './estimate';

export interface PdfContact { name: string; phone: string; email: string; address?: string }

const TYPE = { apartment: 'Home', villa: 'Independent house / villa', office: 'Office', showroom: 'Showroom' } as const;
const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The calculator's quotation uses the same branded template as every other document, so customers always receive
 * one consistent, professional layout. Lines carry the per-space amounts from the estimate; the range is stated in the notes.
 */
export async function buildEstimatePdf(args: { estimate: Estimate; contact: PdfContact; pricing: Pricing; reference: string; date: Date }): Promise<Buffer> {
  const { estimate: e, contact, pricing, reference, date } = args;
  const company = await getCompany();
  const chosen = e.input.package === 'bestfit' ? e.tier : e.input.package;
  const pk = pricing.packages[chosen];
  const m = (n: number) => formatMoney(n, pricing, true);
  const valid = new Date(date.getTime() + company.quotationValidDays * 86_400_000);
  const lines = [
    ...e.lines.map((l) => ({ description: `${l.label}${l.qty > 1 ? ` (${l.qty})` : ''}${l.area ? `, about ${l.area} sq ft` : ''}`, qty: 1, unit: 'lot', price: l.amount })),
    ...e.extras.map((x) => ({ description: `Add-on: ${x.label}`, qty: 1, unit: 'lot', price: x.amount })),
  ];
  const size = e.input.sizeLabel ? (e.input.sizeLabel.endsWith('sq ft') ? e.input.sizeLabel : `${e.input.sizeLabel} sq ft`) : `${e.input.sqft} sq ft`;
  const prop = e.input.propertyType === 'office' || e.input.propertyType === 'showroom' ? `${TYPE[e.input.propertyType]}, ${size}` : `${TYPE[e.input.propertyType]}, ${e.input.bhk} BHK, ${size}`;
  return buildDocumentPdf({
    number: reference, type: 'quotation', version: 1, status: 'sent', company,
    client: { name: contact.name, company: null, phone: contact.phone, email: contact.email, address: contact.address ?? null },
    project: null,
    data: {
      title: `${pk.label} package: ${prop}`, reference: '', issueDate: day(date), dueDate: day(valid), lines,
      discountKind: 'none', discountValue: 0, taxLabel: pricing.tax.label, taxPercent: pricing.tax.enabled ? pricing.tax.percent : 0,
      paymentTerms: company.defaultPaymentTerms,
      notes: `${pk.scope} Indicative budget range: ${m(e.low)} to ${m(e.high)}. This estimate is based on the details you entered and a standard layout; the final quotation follows consultation and site measurement.`,
      terms: `Assumptions: ${pricing.assumptions.join(' ')} Exclusions: ${pricing.exclusions.join('; ')}.`,
    },
  });
}
