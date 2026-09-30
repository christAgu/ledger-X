import type { Denom } from '@/services/ledgerx/types';

const xofRates: Record<Denom, number> = {
  aXOF: 1,
  aEUR: 655.957,
  aUSD: 600,
  USDC: 600,
  USDT: 600,
  BTC: 39_000_000,
  SOL: 90_000,
};

export function valueInXof(amount: number, denom: Denom): number {
  return amount * xofRates[denom];
}

export function getQuote(from: Denom, to: Denom, amount: number) {
  const rate = xofRates[from] / xofRates[to];
  const fee = amount * 0.005;
  return { rate, fee, out: Math.max(0, (amount - fee) * rate), minOut: Math.max(0, (amount - fee) * rate * 0.995) };
}
