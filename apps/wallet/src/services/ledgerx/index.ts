import { chainClient } from './chainClient';
import { mockClient } from './mockClient';
import type { LedgerXClient } from './types';

export const ledgerx: LedgerXClient = process.env.EXPO_PUBLIC_LEDGERX_RELAYER_URL?.trim()
  ? chainClient
  : mockClient;
