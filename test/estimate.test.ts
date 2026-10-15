import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computeEstimate, defaultSelection, completeSelection } from '../src/lib/estimate.ts';
import type { EstimateInput, Pricing } from '../src/lib/estimate.ts';

const pricing = JSON.parse(fs.readFileSync(new URL('../config/pricing.json', import.meta.url), 'utf8')) as Pricing;
const base = (o: Partial<EstimateInput> = {}): EstimateInput => ({
  propertyType: 'apartment', sqft: 1200, bhk: 2, items: defaultSelection(pricing, 'apartment', 2), package: 'premium', ...o,
});
const total = (p: EstimateInput['package'], o: Partial<EstimateInput> = {}) => computeEstimate(base({ package: p, ...o }), pricing).total;

test('default 2BHK layout areas add up to the flat size', () => {
  const e = computeEstimate(base(), pricing);
  const area = e.lines.reduce((a, l) => a + (l.area ?? 0), 0);
  assert.ok(Math.abs(area - 1200) <= 4, `area ${area}`);
});

test('1BHK has no additional bedrooms and still sums to flat size', () => {
  const e = computeEstimate(base({ bhk: 1, sqft: 600, items: defaultSelection(pricing, 'apartment', 1) }), pricing);
  assert.ok(!e.lines.some((l) => l.key === 'bedroom'));
  assert.ok(Math.abs(e.lines.reduce((a, l) => a + (l.area ?? 0), 0) - 600) <= 4);
});

test('tiers are strictly ordered', () => {
  assert.ok(total('essential') < total('premium') && total('premium') < total('luxury'));
});

test('best fit is rule based and explains itself', () => {
  const small = computeEstimate(base({ package: 'bestfit', sqft: 700, bhk: 1, items: { master: 1, kitchen: 1 } }), pricing);
  assert.equal(small.tier, 'essential');
  assert.ok(small.rationale.length > 0);
  const big = computeEstimate(base({ package: 'bestfit', sqft: 3000, bhk: 4, items: defaultSelection(pricing, 'apartment', 4) }), pricing);
  assert.equal(big.tier, 'luxury');
});

test('best fit respects a target budget', () => {
  const e = computeEstimate(base({ package: 'bestfit', sqft: 3000, bhk: 4, items: defaultSelection(pricing, 'apartment', 4), targetBudget: 1 }), pricing);
  assert.equal(e.tier, 'essential');
  const e2 = computeEstimate(base({ package: 'bestfit', targetBudget: total('premium') }), pricing);
  assert.equal(e2.tier, 'premium');
});

test('deselecting a space and adding extras change the total', () => {
  const full = total('premium');
  const items = { ...defaultSelection(pricing, 'apartment', 2) };
  delete items.kitchen;
  assert.ok(total('premium', { items }) < full);
  assert.ok(total('premium', { extras: ['smart'] }) > full);
});

test('office estimates work and complete selection is valid', () => {
  const items = completeSelection(pricing, 'office', 1);
  const e = computeEstimate({ propertyType: 'office', sqft: 2000, bhk: 1, items, package: 'premium' }, pricing);
  assert.ok(e.total > 0 && e.lines.length > 3);
  const home = computeEstimate(base({ items: completeSelection(pricing, 'apartment', 3), bhk: 3, sqft: 1500 }), pricing);
  assert.ok(home.total > 0);
});

test('rejects invalid input', () => {
  assert.throws(() => computeEstimate(base({ sqft: 10 }), pricing));
  assert.throws(() => computeEstimate(base({ bhk: 0 }), pricing));
  assert.throws(() => computeEstimate(base({ package: 'gold' as never }), pricing));
  assert.throws(() => computeEstimate(base({ items: {} }), pricing));
});

test('range brackets the total', () => {
  const e = computeEstimate(base(), pricing);
  assert.ok(e.low < e.total && e.total < e.high);
});
