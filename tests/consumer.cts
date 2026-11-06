import { price, type PriceInput } from '@lp-labs/pricing-engine';
const input: PriceInput = { currency: 'USD', precision: 2, baseMinor: 100n, adjustments: [] };
const amount: bigint = price(input).totalMinor;
void amount;
