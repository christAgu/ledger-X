export type Denom = 'aXOF' | 'aEUR' | 'aUSD' | 'USDC' | 'USDT' | 'BTC' | 'SOL';
export type CashoutRail = 'mtn-momo' | 'moov-money' | 'bank';

export interface SmartAccount {
  address: string;
  tag: string;
  phone: string;
  createdAt: number;
  authMethod: 'mpc-otp' | 'passkey';
}

export type LedgerXMsg =
  | { type: 'MsgSend'; toAddress: string; denom: Denom; amount: number; memo?: string }
  | { type: 'MsgSwap'; fromDenom: Denom; toDenom: Denom; amount: number; minOut: number }
  | { type: 'MsgCashout'; denom: Denom; amount: number; rail: CashoutRail; destination: string };

export interface TxResult {
  txHash: string;
  height: number;
  gasUsed: number;
  feePaidBy: 'treasury-feegrant';
  status: 'success' | 'failed';
}

export interface LedgerXClient {
  createSmartAccount(p: { phone: string; tag: string }): Promise<SmartAccount>;
  resolveTag(tag: string): Promise<{ tag: string; address: string; displayName: string } | null>;
  isTagAvailable(tag: string): Promise<boolean>;
  getBalances(address: string): Promise<Partial<Record<Denom, number>>>;
  deposit(p: { address: string; denom: Denom; amount: number; rail: 'mtn-momo' }): Promise<TxResult>;
  signAndBroadcast(msg: LedgerXMsg): Promise<TxResult>;
}
