import test from 'node:test';
import assert from 'node:assert/strict';
import { price } from '../dist/esm/index.js';

test('applies adjustments in supplied order and returns every intermediate amount', () => {
  const result = price({
    currency: 'USD',
    precision: 2,
    baseMinor: 10_000n,
    adjustments: [
      { id: 'sale', kind: 'percentage', operation: 'discount', amount: 1000n },
      { id: 'coupon', kind: 'fixed', operation: 'discount', amount: 250n },
      { id: 'fee', kind: 'percentage', operation: 'surcharge', amount: 500n },
    ],
  });
  assert.equal(result.totalMinor, 9188n);
  assert.deepEqual(
    result.adjustments.map((entry) => [entry.beforeMinor, entry.changeMinor, entry.afterMinor]),
    [
      [10_000n, -1000n, 9000n],
      [9000n, -250n, 8750n],
      [8750n, 438n, 9188n],
    ],
  );
});

test('uses half-up percentage rounding by default', () => {
  const result = price({
    currency: 'USD',
    precision: 2,
    baseMinor: 1n,
    adjustments: [{ id: 'half-cent', kind: 'percentage', operation: 'surcharge', amount: 5000n }],
  });
  assert.equal(result.totalMinor, 2n);
});

test('supports explicit rounding down', () => {
  const result = price({
    currency: 'USD',
    precision: 2,
    baseMinor: 1n,
    rounding: 'down',
    adjustments: [{ id: 'half-cent', kind: 'percentage', operation: 'surcharge', amount: 5000n }],
  });
  assert.equal(result.totalMinor, 1n);
});

test('zero adjustments preserve the amount', () => {
  assert.equal(
    price({ currency: 'USD', precision: 2, baseMinor: 50n, adjustments: [] }).totalMinor,
    50n,
  );
});

test('freezes the result and adjustment breakdown', () => {
  const result = price({
    currency: 'USD',
    precision: 2,
    baseMinor: 100n,
    adjustments: [{ id: 'x', kind: 'fixed', operation: 'surcharge', amount: 1n }],
  });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.adjustments));
  assert.ok(Object.isFrozen(result.adjustments[0]));
});

test('rejects invalid currency, precision, and amounts', () => {
  assert.throws(
    () => price({ currency: 'usd', precision: 2, baseMinor: 1n, adjustments: [] }),
    TypeError,
  );
  assert.throws(
    () => price({ currency: 'USD', precision: 7, baseMinor: 1n, adjustments: [] }),
    RangeError,
  );
  assert.throws(
    () => price({ currency: 'USD', precision: 2, baseMinor: -1n, adjustments: [] }),
    TypeError,
  );
});

test('rejects duplicate or malformed adjustments', () => {
  assert.throws(
    () =>
      price({
        currency: 'USD',
        precision: 2,
        baseMinor: 10n,
        adjustments: [
          { id: 'x', kind: 'fixed', operation: 'discount', amount: 1n },
          { id: 'x', kind: 'fixed', operation: 'discount', amount: 1n },
        ],
      }),
    /unique/,
  );
  assert.throws(
    () =>
      price({
        currency: 'USD',
        precision: 2,
        baseMinor: 10n,
        adjustments: [{ id: 'x', kind: 'percentage', operation: 'discount', amount: -1n }],
      }),
    TypeError,
  );
});

test('rejects discounts that would make the price negative', () => {
  assert.throws(
    () =>
      price({
        currency: 'USD',
        precision: 2,
        baseMinor: 100n,
        adjustments: [{ id: 'large', kind: 'fixed', operation: 'discount', amount: 101n }],
      }),
    /negative/,
  );
});

test('caps percentages and adjustment collection size', () => {
  assert.throws(
    () =>
      price({
        currency: 'USD',
        precision: 2,
        baseMinor: 100n,
        adjustments: [
          { id: 'large', kind: 'percentage', operation: 'surcharge', amount: 1_000_001n },
        ],
      }),
    RangeError,
  );
  assert.throws(
    () => price({ currency: 'USD', precision: 2, baseMinor: 1n, adjustments: Array(10_001) }),
    RangeError,
  );
});

test('rejects unsupported rounding policies', () => {
  assert.throws(
    () =>
      price({
        currency: 'USD',
        precision: 2,
        baseMinor: 1n,
        adjustments: [],
        rounding: 'ceil',
      }),
    TypeError,
  );
});
