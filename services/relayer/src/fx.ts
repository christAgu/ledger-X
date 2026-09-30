const XOF_PER_EUR_NUMERATOR = 655_957n;

export const XOF_PER_EUR = "655.957";

export function xofToEurcBaseUnits(xof: string): string {
  if (!/^[1-9]\d*$/.test(xof)) {
    throw new Error("XOF amount must be a positive integer string");
  }
  const baseUnits = (BigInt(xof) * 1_000_000_000n) / XOF_PER_EUR_NUMERATOR;
  if (baseUnits === 0n) {
    throw new Error("XOF amount is too small to credit EURC");
  }
  return baseUnits.toString();
}

export function eurcBaseUnitsToXof(ueurc: string): string {
  if (!/^\d+$/.test(ueurc)) {
    throw new Error("EURC amount must be an integer string");
  }
  return ((BigInt(ueurc) * XOF_PER_EUR_NUMERATOR) / 1_000_000_000n).toString();
}
