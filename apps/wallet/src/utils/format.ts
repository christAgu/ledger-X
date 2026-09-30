import type { Denom } from '@/services/ledgerx/types';

const amountDigits: Record<Denom, number> = {
  EURC: 2,
  USD: 2,
  USDC: 2,
  USDT: 2,
  BTC: 8,
  SOL: 4,
};

export function formatAmount(value: number, denom: Denom): string {
  const digits = amountDigits[denom];
  const fixed = Math.abs(value).toFixed(digits);
  const [integer, decimals] = fixed.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  const number = `${value < 0 ? '−' : ''}${grouped}${decimals ? `,${decimals}` : ''}`;
  const suffix: Record<Denom, string> = {
    EURC: '€',
    USD: '$',
    USDC: 'USDC',
    USDT: 'USDT',
    BTC: 'BTC',
    SOL: 'SOL',
  };
  return denom === 'EURC' || denom === 'USD'
    ? `${number} ${suffix[denom]}`
    : `${number} ${suffix[denom]}`;
}

export function formatXof(value: number): string {
  return `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')} XOF`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 12)}…${address.slice(-6)}`;
}
