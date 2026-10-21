import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTotals, displayStatus, normaliseDoc } from '../src/server/doc-math.ts';
import { ALL_PERMS, PERM_SET, NAV, completionPct, sanitizePerms } from '../src/server/perms.ts';

test('document totals: lines, percent discount, tax', () => {
  const t = computeTotals({ lines: [{ description: 'A', qty: 2, unit: 'pcs', price: 1000.5 }, { description: 'B', qty: 1, unit: 'pcs', price: 499 }], discountKind: 'percent', discountValue: 10, taxPercent: 5 });
  assert.equal(t.subtotal, 2500);
  assert.equal(t.discount, 250);
  assert.equal(t.taxable, 2250);
  assert.equal(t.tax, 112.5);
  assert.equal(t.total, 2362.5);
});

test('document totals: amount discount is capped at the subtotal', () => {
  const t = computeTotals({ lines: [{ description: 'A', qty: 1, unit: '', price: 100 }], discountKind: 'amount', discountValue: 500, taxPercent: 0 });
  assert.equal(t.total, 0);
});

test('normaliseDoc rejects empty, zero-quantity and bad dates', () => {
  assert.ok('error' in normaliseDoc({ lines: [] }));
  assert.ok('error' in normaliseDoc({ issueDate: '2026-01-01', lines: [{ description: 'x', qty: 0, price: 5 }] }));
  assert.ok('error' in normaliseDoc({ issueDate: 'tomorrow', lines: [{ description: 'x', qty: 1, price: 5 }] }));
  assert.ok('data' in normaliseDoc({ issueDate: '2026-01-01', lines: [{ description: 'x', qty: 1, price: 5 }] }));
});

test('payment status comes from recorded payments, not from "sent"', () => {
  const today = '2026-10-21';
  assert.equal(displayStatus('invoice', 'sent', 1000, 0, '2026-12-01', today), 'sent');
  assert.equal(displayStatus('invoice', 'sent', 1000, 400, '2026-12-01', today), 'partial');
  assert.equal(displayStatus('invoice', 'sent', 1000, 1000, '2026-12-01', today), 'paid');
  assert.equal(displayStatus('invoice', 'sent', 1000, 0, '2026-09-01', today), 'overdue');
  assert.equal(displayStatus('invoice', 'draft', 1000, 0, '2026-09-01', today), 'draft');
  assert.equal(displayStatus('quotation', 'sent', 1000, 1000, null, today), 'sent');
  assert.equal(displayStatus('invoice', 'cancelled', 1000, 1000, null, today), 'cancelled');
});

test('completion percentage handles zero tasks', () => {
  assert.equal(completionPct(0, 0), 0);
  assert.equal(completionPct(3, 4), 75);
});

test('permission catalogue: unique keys, sanitiser drops unknown, nav references real permissions', () => {
  assert.equal(new Set(ALL_PERMS).size, ALL_PERMS.length);
  assert.deepEqual(sanitizePerms(['task.create', 'task.create', 'hack.root', 5]), ['task.create']);
  for (const n of NAV) for (const p of n.any ?? []) assert.ok(PERM_SET.has(p), `${n.href} -> ${p}`);
});
