import type { LedgerXClient, LedgerXMsg, SmartAccount, TxResult } from './types';

const charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const takenTags = new Set(['john', 'admin', 'ledgerx']);
let height = 124308;
let txSequence = 0;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockHash(seedValue: string): string {
  let seed = 2166136261;
  for (let index = 0; index < seedValue.length; index += 1) {
    seed = Math.imul(seed ^ seedValue.charCodeAt(index), 16777619);
  }
  let hash = '';
  for (let index = 0; index < 8; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    hash += (seed >>> 0).toString(16).padStart(8, '0');
  }
  return hash;
}

function seededAddress(tag: string): string {
  let seed = 2166136261;
  for (let index = 0; index < tag.length; index += 1) {
    seed = Math.imul(seed ^ tag.charCodeAt(index), 16777619);
  }
  let address = '';
  for (let index = 0; index < 38; index += 1) {
    seed = Math.imul(seed ^ (seed >>> 13), 2246822519);
    address += charset[Math.abs(seed >>> 0) % charset.length];
  }
  return `ledgerx1${address}`;
}

export const mockClient: LedgerXClient = {
  async createSmartAccount({ phone, tag }): Promise<SmartAccount> {
    await wait(600 + Math.floor(Math.random() * 600));
    return {
      address: seededAddress(tag),
      tag,
      phone,
      createdAt: Date.now(),
      authMethod: 'mpc-otp',
    };
  },
  async resolveTag(tag) {
    await wait(260);
    const normalized = tag.replace(/^@/, '').toLowerCase();
    if (!normalized || takenTags.has(normalized)) return null;
    return {
      tag: normalized,
      address: seededAddress(normalized),
      displayName: normalized === 'amina' ? 'Amina Traoré' : `${normalized[0]?.toUpperCase()}${normalized.slice(1)}`,
    };
  },
  async isTagAvailable(tag) {
    await wait(280);
    return !takenTags.has(tag.toLowerCase().replace(/^@/, ''));
  },
  async getBalances() {
    return {};
  },
  async deposit({ address, denom, amount, rail }): Promise<TxResult> {
    await wait(600 + Math.floor(Math.random() * 600));
    txSequence += 1;
    height += 1;
    const txHash = createMockHash(`${txSequence}:${height}:${Date.now()}:${address}:${denom}:${amount}:${rail}`);
    return { txHash, height, gasUsed: 68421, feePaidBy: 'treasury-feegrant', status: 'success' };
  },
  async signAndBroadcast(_msg: LedgerXMsg): Promise<TxResult> {
    await wait(600 + Math.floor(Math.random() * 600));
    txSequence += 1;
    height += 1;
    const txHash = createMockHash(`${txSequence}:${height}:${Date.now()}`);
    return { txHash, height, gasUsed: 68421, feePaidBy: 'treasury-feegrant', status: 'success' };
  },
};
