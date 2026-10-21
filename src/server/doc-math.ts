// Pure document maths and status rules (no imports) so they are shared by the editor, the server and the tests.

export interface Line { description: string; qty: number; unit: string; price: number }
export interface DocData {
  title: string;
  reference: string;           // client PO / work-order number (optional)
  issueDate: string;           // YYYY-MM-DD
  dueDate: string | null;      // invoice due date or quotation validity
  lines: Line[];
  discountKind: 'none' | 'percent' | 'amount';
  discountValue: number;
  taxLabel: string;
  taxPercent: number;
  paymentTerms: string;
  notes: string;
  terms: string;
}

export const DOC_TYPES = [
  { key: 'quotation', label: 'Interior design quotation', prefix: 'QUO', kind: 'quote' },
  { key: 'estimate', label: 'Project estimate', prefix: 'EST', kind: 'quote' },
  { key: 'proposal', label: 'Client proposal', prefix: 'PRO', kind: 'quote' },
  { key: 'invoice', label: 'Invoice', prefix: 'INV', kind: 'invoice' },
  { key: 'receipt', label: 'Payment receipt', prefix: 'RCP', kind: 'invoice' },
] as const;
export type DocType = (typeof DOC_TYPES)[number]['key'];
export const typeInfo = (t: string) => DOC_TYPES.find((d) => d.key === t) ?? DOC_TYPES[0];
export const isInvoiceKind = (t: string) => typeInfo(t).kind === 'invoice';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clean = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : 0);

export function lineTotal(l: Pick<Line, 'qty' | 'price'>) { return r2(clean(l.qty) * clean(l.price)); }

export function computeTotals(d: Pick<DocData, 'lines' | 'discountKind' | 'discountValue' | 'taxPercent'>) {
  const subtotal = r2(d.lines.reduce((a, l) => a + lineTotal(l), 0));
  let discount = 0;
  if (d.discountKind === 'percent') discount = r2((subtotal * Math.min(100, Math.max(0, clean(d.discountValue)))) / 100);
  else if (d.discountKind === 'amount') discount = r2(Math.min(subtotal, Math.max(0, clean(d.discountValue))));
  const taxable = r2(subtotal - discount);
  const tax = r2((taxable * Math.min(100, Math.max(0, clean(d.taxPercent)))) / 100);
  return { subtotal, discount, taxable, tax, total: r2(taxable + tax) };
}

/** Validates and normalises editor input. Returns an error string or the cleaned document. */
export function normaliseDoc(raw: unknown): { error: string } | { data: DocData } {
  if (!raw || typeof raw !== 'object') return { error: 'The document is empty.' };
  const o = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const date = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
  const lines: Line[] = Array.isArray(o.lines) ? o.lines.slice(0, 200).map((l: Record<string, unknown>) => ({
    description: str(l?.description, 400), qty: r2(clean(l?.qty)), unit: str(l?.unit, 20), price: r2(clean(l?.price)),
  })).filter((l) => l.description || l.qty || l.price) : [];
  if (lines.length === 0) return { error: 'Add at least one line item.' };
  for (const l of lines) {
    if (!l.description) return { error: 'Every line needs a description.' };
    if (l.qty <= 0) return { error: `Quantity must be above zero for "${l.description.slice(0, 30)}".` };
    if (l.price < 0) return { error: 'Prices cannot be negative.' };
  }
  const kind = o.discountKind === 'percent' || o.discountKind === 'amount' ? o.discountKind : 'none';
  const discountValue = Math.max(0, r2(clean(o.discountValue)));
  if (kind === 'percent' && discountValue > 100) return { error: 'A percentage discount cannot exceed 100.' };
  const taxPercent = Math.max(0, r2(clean(o.taxPercent)));
  if (taxPercent > 100) return { error: 'Tax cannot exceed 100%.' };
  const issueDate = date(o.issueDate);
  if (!issueDate) return { error: 'Choose an issue date.' };
  return { data: { title: str(o.title, 160), reference: str(o.reference, 60), issueDate, dueDate: date(o.dueDate) || null, lines, discountKind: kind, discountValue, taxLabel: str(o.taxLabel, 20) || 'Tax', taxPercent, paymentTerms: str(o.paymentTerms, 600), notes: str(o.notes, 2000), terms: str(o.terms, 3000) } };
}

/** Status shown to people: stored status for the workflow, payments for money status. Never inferred from "sent". */
export function displayStatus(type: string, stored: string, total: number, paid: number, dueDate: string | null, today: string) {
  if (stored === 'cancelled') return 'cancelled';
  if (isInvoiceKind(type) && (stored === 'approved' || stored === 'sent')) {
    if (total > 0 && paid >= total - 0.005) return 'paid';
    if (paid > 0) return dueDate && dueDate < today ? 'overdue' : 'partial';
    if (dueDate && dueDate < today) return 'overdue';
  }
  return stored;
}

export const STATUS_LABEL: Record<string, string> = { draft: 'Draft', pending: 'Pending Approval', approved: 'Approved', sent: 'Sent', partial: 'Partially Paid', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };

export const emptyDoc = (today: string): DocData => ({ title: '', reference: '', issueDate: today, dueDate: null, lines: [{ description: '', qty: 1, unit: 'pcs', price: 0 }], discountKind: 'none', discountValue: 0, taxLabel: 'VAT', taxPercent: 0, paymentTerms: '', notes: '', terms: '' });
