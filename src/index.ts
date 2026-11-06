export type AdjustmentRounding = 'half-up' | 'down';

export interface PriceAdjustment {
  id: string;
  kind: 'fixed' | 'percentage';
  operation: 'discount' | 'surcharge';
  amount: bigint;
}

export interface PriceInput {
  currency: string;
  precision: number;
  baseMinor: bigint;
  adjustments: readonly PriceAdjustment[];
  rounding?: AdjustmentRounding;
}

export interface AdjustmentBreakdown {
  id: string;
  kind: PriceAdjustment['kind'];
  operation: PriceAdjustment['operation'];
  beforeMinor: bigint;
  changeMinor: bigint;
  afterMinor: bigint;
}

export interface PriceResult {
  currency: string;
  precision: number;
  baseMinor: bigint;
  totalMinor: bigint;
  adjustments: readonly AdjustmentBreakdown[];
}

function assertAmount(value: bigint, name: string): void {
  if (typeof value !== 'bigint' || value < 0n) {
    throw new TypeError(`${name} must be a non-negative bigint minor-unit amount.`);
  }
  if (value.toString().length > 1000) throw new RangeError(`${name} exceeds 1000 digits.`);
}

function roundRatio(numerator: bigint, denominator: bigint, rounding: AdjustmentRounding): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return rounding === 'half-up' && remainder * 2n >= denominator ? quotient + 1n : quotient;
}

function validateCurrency(currency: string): void {
  if (typeof currency !== 'string' || !/^[A-Z][A-Z0-9]{2,11}$/.test(currency)) {
    throw new TypeError('Currency must be an uppercase identifier of 3 to 12 characters.');
  }
}

export function price(input: PriceInput): PriceResult {
  if (!input || typeof input !== 'object') throw new TypeError('Expected a price input.');
  validateCurrency(input.currency);
  if (!Number.isSafeInteger(input.precision) || input.precision < 0 || input.precision > 6) {
    throw new RangeError('Precision must be an integer from 0 to 6.');
  }
  assertAmount(input.baseMinor, 'Base amount');
  if (!Array.isArray(input.adjustments) || input.adjustments.length > 10_000) {
    throw new RangeError('Adjustments must be an array containing at most 10000 entries.');
  }
  const rounding = input.rounding ?? 'half-up';
  if (rounding !== 'half-up' && rounding !== 'down') {
    throw new TypeError('Rounding must be half-up or down.');
  }

  let totalMinor = input.baseMinor;
  const ids = new Set<string>();
  const adjustments = input.adjustments.map((adjustment) => {
    if (!adjustment || typeof adjustment !== 'object') {
      throw new TypeError('Each adjustment must be an object.');
    }
    if (
      typeof adjustment.id !== 'string' ||
      adjustment.id.length === 0 ||
      adjustment.id.length > 128 ||
      ids.has(adjustment.id)
    ) {
      throw new TypeError('Adjustment IDs must be unique nonempty strings up to 128 characters.');
    }
    ids.add(adjustment.id);
    if (adjustment.kind !== 'fixed' && adjustment.kind !== 'percentage') {
      throw new TypeError(`Invalid adjustment kind for ${adjustment.id}.`);
    }
    if (adjustment.operation !== 'discount' && adjustment.operation !== 'surcharge') {
      throw new TypeError(`Invalid adjustment operation for ${adjustment.id}.`);
    }
    assertAmount(adjustment.amount, `Adjustment ${adjustment.id}`);
    if (adjustment.kind === 'percentage' && adjustment.amount > 1_000_000n) {
      throw new RangeError('Percentage basis points may not exceed 1000000.');
    }

    const beforeMinor = totalMinor;
    const magnitude =
      adjustment.kind === 'fixed'
        ? adjustment.amount
        : roundRatio(beforeMinor * adjustment.amount, 10_000n, rounding);
    const changeMinor = adjustment.operation === 'discount' ? -magnitude : magnitude;
    totalMinor += changeMinor;
    if (totalMinor < 0n)
      throw new RangeError(`Adjustment ${adjustment.id} makes the price negative.`);
    assertAmount(totalMinor, 'Calculated total');
    return Object.freeze({
      id: adjustment.id,
      kind: adjustment.kind,
      operation: adjustment.operation,
      beforeMinor,
      changeMinor,
      afterMinor: totalMinor,
    });
  });

  return Object.freeze({
    currency: input.currency,
    precision: input.precision,
    baseMinor: input.baseMinor,
    totalMinor,
    adjustments: Object.freeze(adjustments),
  });
}
