import type { LedgerXClient, LedgerXMsg, SmartAccount, TxResult } from './types';

const charset = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const takenTags = new Set(['john', 'admin', 'ledgerx']);
let height = 124308;
let txSequence = 0;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  async signAndBroadcast(_msg: LedgerXMsg): Promise<TxResult> {
    await wait(600 + Math.floor(Math.random() * 600));
    txSequence += 1;
    height += 1;
    const txHash = Array.from({ length: 64 }, (_, index) =>
      ((txSequence * 7 + height * 13 + index * 23) % 16).toString(16),
    ).join('');
    return { txHash, height, gasUsed: 68421, feePaidBy: 'treasury-feegrant', status: 'success' };
  },
};
