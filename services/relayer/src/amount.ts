const BASE_UNITS_PER_MAJOR = 1_000_000n;
const DECIMAL_AMOUNT = /^(\d+)(?:\.(\d{1,6}))?$/;

export function majorToBaseUnits(amount: string): string {
  if (!DECIMAL_AMOUNT.test(amount)) {
    throw new Error("amount must be a decimal string with at most 6 fractional digits");
  }

  const [whole, fraction = ""] = amount.split(".");
  const baseUnits = BigInt(whole) * BASE_UNITS_PER_MAJOR + BigInt(fraction.padEnd(6, "0"));
  if (baseUnits <= 0n) {
    throw new Error("amount must be positive");
  }
  return baseUnits.toString();
}
