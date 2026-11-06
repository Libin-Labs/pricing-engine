# @lp-labs/pricing-engine

Apply an explicitly ordered list of deterministic price adjustments to an integer minor-unit
amount. Every adjustment returns its before, signed change, and after amounts. The package has
zero runtime and peer dependencies, ships ESM/CommonJS and declarations, and never uses floating
point for money arithmetic.

## Install

```sh
npm install @lp-labs/pricing-engine
```

Requires Node.js 18+ or a modern ESM-aware bundler with `bigint` support. CommonJS consumers can
use `const { price } = require('@lp-labs/pricing-engine')`.

## Quickstart

```js
import { price } from '@lp-labs/pricing-engine';

const result = price({
  currency: 'USD',
  precision: 2,
  baseMinor: 12500n,
  adjustments: [
    { id: 'seasonal', kind: 'percentage', operation: 'discount', amount: 1000n },
    { id: 'shipping', kind: 'fixed', operation: 'surcharge', amount: 499n },
  ],
});
console.log(result.totalMinor); // 11749n
console.log(
  result.adjustments.map(({ id, beforeMinor, changeMinor, afterMinor }) => ({
    id,
    beforeMinor,
    changeMinor,
    afterMinor,
  })),
);
```

## Public API

Runtime export: `price(input: PriceInput): PriceResult`.

Type exports: `AdjustmentRounding`, `PriceAdjustment`, `PriceInput`, `AdjustmentBreakdown`,
`PriceResult`.

`PriceInput` requires a currency identifier, precision, non-negative `baseMinor: bigint`, and an
ordered `adjustments` array. Precision is descriptive metadata from 0 to 6; it does not convert
amounts or validate a currency standard. Currency is an uppercase identifier of 3–12 characters.

Each adjustment has a unique ID, `kind` (`fixed` or `percentage`), `operation` (`discount` or
`surcharge`), and non-negative bigint `amount`. Fixed amounts are minor units. Percentage amounts
are integer basis points: `1000n` means 10%. Percentages apply to the current running total, so
reordering adjustments can change the result. Discounts cannot take the total below zero.

The optional rounding mode is `half-up` (default) or `down` (toward zero). Percentage computation
is exact integer arithmetic; each adjustment rounds separately. Results, their adjustment list,
and individual breakdown entries are frozen. `changeMinor` is signed; `beforeMinor` and
`afterMinor` are non-negative.

## Customization and limits

Choose the order and meaning of adjustments in your application, and build the array from your
own price policy. This package does not store products, currency metadata, tax policy, discount
eligibility, tiers, rule versions, or promotions. It does not infer a rate or reorder rules.

Inputs and calculated amounts are limited to 1000 decimal digits, with at most 10,000 adjustments.
Percentage rates are capped at 1,000,000 basis points (10,000%). Invalid identifiers, duplicate
adjustment IDs, unsupported policies, malformed amounts, or negative results throw. `bigint`
values are not JSON-native; serialize them as decimal strings at application boundaries.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
