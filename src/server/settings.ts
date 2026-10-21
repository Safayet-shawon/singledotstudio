import { q1, q } from './db';
import { site } from '@/config/site';

export interface Company {
  name: string; tagline: string; address: string; phone: string; email: string; website: string;
  bank: string; mobileBanking: string; defaultTerms: string; defaultPaymentTerms: string; taxLabel: string; taxPercent: number;
  tradeLicense: string; tin: string; bin: string; signatoryName: string; signatoryTitle: string; quotationValidDays: number; invoiceFooter: string;
}

export const COMPANY_DEFAULTS = (): Company => ({
  name: site.brand.name, tagline: site.brand.tagline, address: site.contact.address ?? '', phone: site.contact.phone ?? '', email: site.contact.email ?? '', website: site.url,
  bank: '', mobileBanking: '', tradeLicense: '', tin: '', bin: '', signatoryName: '', signatoryTitle: 'Authorised signatory', quotationValidDays: 15, invoiceFooter: 'Thank you for your business.',
  defaultTerms: 'Prices are valid for the period stated. Work begins after the agreed advance is received. Variations to scope are quoted separately.',
  defaultPaymentTerms: '50% advance, 40% on completion of carpentry, 10% on handover.', taxLabel: 'VAT', taxPercent: 0,
});

export async function getCompany(): Promise<Company> {
  const row = await q1<{ value: Partial<Company> }>(`SELECT value FROM settings WHERE key = 'company'`);
  return { ...COMPANY_DEFAULTS(), ...(row?.value ?? {}) };
}
export async function saveCompany(c: Company) {
  await q(`INSERT INTO settings (key, value) VALUES ('company', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [JSON.stringify(c)]);
}
