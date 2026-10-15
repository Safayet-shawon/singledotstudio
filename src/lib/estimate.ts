// Pure budget engine: no imports, so it runs in the browser, in API routes and in node:test.

export type PackageKey = 'essential' | 'premium' | 'luxury' | 'bestfit';
export type Tier = 'essential' | 'premium' | 'luxury';
export type PropertyType = 'apartment' | 'villa' | 'office';

export interface PricingItem {
  key: string;
  group: 'residential' | 'office';
  label: string;
  basis: 'layout' | 'unit' | 'flat' | 'share';
  weight?: number;
  share?: number;
  inLayout?: boolean;
  maxQty: number | string;
  defaultQty: number | string;
  rates: Record<Tier, number>;
}
export interface Pricing {
  placeholder: boolean;
  currency: { code: string; symbol: string; pdfPrefix: string; locale: string };
  roundTo: number;
  rangeSpread: number;
  tax: { enabled: boolean; label: string; percent: number };
  limits: { minSqft: number; maxSqft: number; maxBhk: number };
  packages: Record<PackageKey, { label: string; tagline: string; scope: string }>;
  bestFit: { premiumSqft: number; luxurySqft: number; premiumSpaceCount: number; luxuryBhk: number };
  items: PricingItem[];
  extras: { key: string; label: string; amount: Record<Tier, number> }[];
  assumptions: string[];
  exclusions: string[];
}

export interface EstimateInput {
  propertyType: PropertyType;
  sqft: number;
  bhk: number;
  items: Record<string, number>;
  package: PackageKey;
  extras?: string[];
  targetBudget?: number | null;
}
export interface Line { key: string; label: string; qty: number; area: number | null; tier: Tier; amount: number }
export interface Estimate {
  input: EstimateInput;
  tier: Tier;
  lines: Line[];
  extras: { key: string; label: string; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  low: number;
  high: number;
  tierTotals: Record<Tier, number>;
  rationale: string[];
}

const TIERS: Tier[] = ['essential', 'premium', 'luxury'];

export const isResidential = (t: PropertyType) => t !== 'office';

export function itemsFor(pricing: Pricing, type: PropertyType) {
  return pricing.items.filter((i) => i.group === (isResidential(type) ? 'residential' : 'office'));
}

function resolveRule(v: number | string, bhk: number): number {
  if (typeof v === 'number') return v;
  if (v === 'bhk') return bhk;
  if (v === 'bhk-1') return Math.max(0, bhk - 1);
  return 0;
}
export const maxQty = (i: PricingItem, bhk: number) => resolveRule(i.maxQty, bhk);
export const defaultQty = (i: PricingItem, bhk: number) => resolveRule(i.defaultQty, bhk);

/** Quantities for "Complete interior": every space in the group at a sensible full quantity. */
export function completeSelection(pricing: Pricing, type: PropertyType, bhk: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of itemsFor(pricing, type)) {
    const max = maxQty(i, bhk);
    let q = i.key === 'wardrobe' ? bhk : Math.max(defaultQty(i, bhk), i.group === 'office' ? 1 : max === 0 ? 0 : 1);
    if (i.maxQty === 'bhk' || i.maxQty === 'bhk-1') q = max;
    q = Math.min(q, max);
    if (q > 0) out[i.key] = q;
  }
  return out;
}

export function defaultSelection(pricing: Pricing, type: PropertyType, bhk: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of itemsFor(pricing, type)) {
    const q = Math.min(defaultQty(i, bhk), maxQty(i, bhk));
    if (q > 0) out[i.key] = q;
  }
  return out;
}

function validate(input: EstimateInput, pricing: Pricing) {
  const { minSqft, maxSqft, maxBhk } = pricing.limits;
  if (!['apartment', 'villa', 'office'].includes(input.propertyType)) throw new Error('Please choose a property type.');
  const sqft = Number(input.sqft);
  if (!Number.isFinite(sqft) || sqft < minSqft || sqft > maxSqft) throw new Error(`Size must be between ${minSqft} and ${maxSqft} sq ft.`);
  let bhk = Number(input.bhk);
  if (isResidential(input.propertyType)) {
    if (!Number.isInteger(bhk) || bhk < 1 || bhk > maxBhk) throw new Error(`BHK must be a whole number from 1 to ${maxBhk}.`);
  } else bhk = 1;
  if (!['essential', 'premium', 'luxury', 'bestfit'].includes(input.package)) throw new Error('Please choose a package.');
  const items: Record<string, number> = {};
  for (const i of itemsFor(pricing, input.propertyType)) {
    const raw = Math.floor(Number(input.items?.[i.key] ?? 0));
    const q = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), maxQty(i, bhk)) : 0;
    if (q > 0) items[i.key] = q;
  }
  if (Object.keys(items).length === 0) throw new Error('Please select at least one space.');
  const extras = (input.extras ?? []).filter((k) => pricing.extras.some((e) => e.key === k));
  const tb = input.targetBudget ? Number(input.targetBudget) : null;
  return { sqft, bhk, items, extras, targetBudget: tb && Number.isFinite(tb) && tb > 0 ? tb : null };
}

function price(tier: Tier, v: ReturnType<typeof validate>, pricing: Pricing, type: PropertyType) {
  const defs = itemsFor(pricing, type);
  const layoutWeight = defs
    .filter((i) => i.basis === 'layout' && i.inLayout)
    .reduce((a, i) => a + (i.weight ?? 0) * defaultQty(i, v.bhk), 0);
  const lines: Line[] = [];
  let sum = 0;
  for (const i of defs) {
    const qty = v.items[i.key];
    if (!qty) continue;
    let amount = 0;
    let area: number | null = null;
    const rate = i.rates[tier];
    if (i.basis === 'layout') {
      area = ((v.sqft * (i.weight ?? 0)) / layoutWeight) * qty;
      amount = area * rate;
    } else if (i.basis === 'share') {
      area = v.sqft * (i.share ?? 0) * qty;
      amount = area * rate;
    } else if (i.basis === 'flat') {
      area = v.sqft;
      amount = v.sqft * rate;
    } else amount = rate * qty;
    sum += amount;
    lines.push({ key: i.key, label: i.label, qty, area: area === null ? null : Math.round(area), tier, amount: Math.round(amount) });
  }
  return { lines, sum };
}

export function computeEstimate(input: EstimateInput, pricing: Pricing): Estimate {
  const v = validate(input, pricing);
  const type = input.propertyType;
  const round = (n: number) => Math.round(n / pricing.roundTo) * pricing.roundTo;
  const extrasFor = (tier: Tier) => v.extras.map((k) => {
    const e = pricing.extras.find((x) => x.key === k)!;
    return { key: k, label: e.label, amount: e.amount[tier] };
  });
  const totalFor = (tier: Tier) => {
    const base = price(tier, v, pricing, type).sum + extrasFor(tier).reduce((a, e) => a + e.amount, 0);
    return base * (pricing.tax.enabled ? 1 + pricing.tax.percent / 100 : 1);
  };
  const tierTotals = Object.fromEntries(TIERS.map((t) => [t, round(totalFor(t))])) as Record<Tier, number>;

  const rationale: string[] = [];
  let tier: Tier;
  if (input.package === 'bestfit') {
    const b = pricing.bestFit;
    const count = Object.keys(v.items).length;
    tier = 'essential';
    if (v.sqft >= b.premiumSqft || count >= b.premiumSpaceCount) {
      tier = 'premium';
      rationale.push(v.sqft >= b.premiumSqft ? `Your ${v.sqft} sq ft is at or above ${b.premiumSqft} sq ft, where Premium detailing is usually the balanced choice.` : `You selected ${count} spaces, so a consistent Premium finish keeps the whole home cohesive.`);
    }
    if (v.sqft >= b.luxurySqft || (isResidential(type) && v.bhk >= b.luxuryBhk)) {
      tier = 'luxury';
      rationale.push(v.sqft >= b.luxurySqft ? `At ${v.sqft} sq ft the scale suits a bespoke Luxury treatment.` : `${v.bhk} BHK homes are typically planned with Luxury-level joinery and detailing.`);
    }
    if (tier === 'essential') rationale.push('Your size and number of spaces point to the Essential package as the most efficient fit.');
    if (v.targetBudget) {
      const fit = [...TIERS].reverse().find((t) => tierTotals[t] <= v.targetBudget!);
      if (fit) {
        tier = fit;
        rationale.push(`Adjusted to the highest package within your target budget of ${v.targetBudget.toLocaleString(pricing.currency.locale)}.`);
      } else {
        tier = 'essential';
        rationale.push('Your target budget is below even the Essential estimate for these selections; consider fewer spaces.');
      }
    }
  } else tier = input.package;

  const { lines, sum } = price(tier, v, pricing, type);
  const extras = extrasFor(tier);
  const subtotal = sum + extras.reduce((a, e) => a + e.amount, 0);
  const tax = pricing.tax.enabled ? (subtotal * pricing.tax.percent) / 100 : 0;
  const total = subtotal + tax;
  return {
    input: { ...input, sqft: v.sqft, bhk: v.bhk, items: v.items, extras: v.extras, targetBudget: v.targetBudget },
    tier,
    lines,
    extras,
    subtotal: round(subtotal),
    tax: round(tax),
    total: round(total),
    low: round(total * (1 - pricing.rangeSpread)),
    high: round(total * (1 + pricing.rangeSpread)),
    tierTotals,
    rationale,
  };
}

export function formatMoney(n: number, pricing: Pricing, pdf = false) {
  const c = pricing.currency;
  const num = new Intl.NumberFormat(c.locale || 'en-IN', { maximumFractionDigits: 0 }).format(n);
  return pdf ? `${c.pdfPrefix} ${num}` : `${c.symbol}${num}`;
}

/** Indicative per-sq-ft rate range for a single item (used by service pages). */
export function rateRange(pricing: Pricing, key: string) {
  const i = pricing.items.find((x) => x.key === key);
  if (!i) return null;
  return { item: i, essential: i.rates.essential, premium: i.rates.premium, luxury: i.rates.luxury };
}
