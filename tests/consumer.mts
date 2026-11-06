import { price, type PriceAdjustment, type PriceResult } from '@lp-labs/pricing-engine';
const adjustments: PriceAdjustment[] = [
  { id: 'sale', kind: 'percentage', operation: 'discount', amount: 1000n },
];
const result: PriceResult = price({
  currency: 'USD',
  precision: 2,
  baseMinor: 1000n,
  adjustments,
});
const amount: bigint = result.adjustments[0]!.changeMinor;
void amount;
