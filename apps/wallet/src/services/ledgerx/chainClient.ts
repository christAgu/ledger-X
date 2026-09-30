import AsyncStorage from '@react-native-async-storage/async-storage';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { GasPrice, SigningStargateClient } from '@cosmjs/stargate';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { mockClient } from './mockClient';
import type { LedgerXClient, SmartAccount, TxResult } from './types';

const DEVICE_KEY_NAME = 'ledgerx-device-key';
const EURC_CHAIN_DENOM = 'ueurc';
const MICRO_UNITS = 1_000_000;
const GAS_FEE = {
  amount: [{ denom: 'uledx', amount: '1500' }],
  gas: '600000',
} as const;

type RelayerConfig = {
  chainId: string;
  treasuryAddress: string;
  denom: typeof EURC_CHAIN_DENOM;
  xofPerEur: '655.957';
};

type RelayerTag = {
  tag: string;
  address: string;
};

type BalanceResponse = {
  balances?: { denom: string; amount: string }[];
};

let deviceWalletPromise: Promise<DirectSecp256k1Wallet> | undefined;
let configPromise: Promise<RelayerConfig> | undefined;
let signingClientPromise: Promise<SigningStargateClient> | undefined;

const chainClient: LedgerXClient = {
  async createSmartAccount({ phone, tag }): Promise<SmartAccount> {
    const wallet = await getDeviceWallet();
    const [account] = await wallet.getAccounts();
    if (!account) throw new Error('The device key did not produce an account');
    await requestJson('/v1/accounts', { address: account.address, tag });
    return {
      address: account.address,
      tag,
      phone,
      createdAt: Date.now(),
      authMethod: 'mpc-otp',
    };
  },

  async resolveTag(tag) {
    const normalizedTag = tag.replace(/^@/, '').toLowerCase();
    const response = await fetch(`${getRelayerUrl()}/v1/tags/${encodeURIComponent(normalizedTag)}`);
    if (response.status === 404) return null;
    const result = await readJson<RelayerTag>(response);
    return {
      ...result,
      displayName: `${result.tag[0]?.toUpperCase() ?? ''}${result.tag.slice(1)}`,
    };
  },

  async isTagAvailable(tag) {
    const normalizedTag = tag.replace(/^@/, '').toLowerCase();
    const result = await requestJson<{ available: boolean }>(
      `/v1/tags/${encodeURIComponent(normalizedTag)}/available`,
    );
    return result.available;
  },

  async getBalances(address) {
    const response = await requestJson<BalanceResponse>(
      `/rest/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}`,
    );
    let eurcBaseUnits = 0n;
    for (const coin of response.balances ?? []) {
      if (coin.denom === EURC_CHAIN_DENOM) eurcBaseUnits = BigInt(coin.amount);
    }
    return { EURC: Number(eurcBaseUnits) / MICRO_UNITS };
  },

  async deposit({ address, amount, rail }) {
    const result = await requestJson<{
      status: string;
      txHash?: string;
      height?: number;
      credited?: { denom: string; amount: string };
    }>('/v1/sandbox/deposit', {
      address,
      currency: 'XOF',
      amount: formatXofAmount(amount),
      rail,
    });
    const credited =
      result.credited?.denom === EURC_CHAIN_DENOM && /^\d+$/.test(result.credited.amount)
        ? Number(BigInt(result.credited.amount)) / MICRO_UNITS
        : 0;
    return {
      txHash: result.txHash ?? '',
      height: result.height ?? 0,
      gasUsed: 0,
      feePaidBy: 'treasury-feegrant',
      status: result.status === 'minted' && Boolean(result.txHash) && credited > 0 ? 'success' : 'failed',
      credited,
    };
  },

  async signAndBroadcast(message) {
    if (
      message.type === 'MsgSend'
      && message.denom === 'EURC'
      && message.toAddress.startsWith('ledgerx1')
    ) {
      return broadcastSend(message.toAddress, message.amount, message.memo);
    }
    if (message.type === 'MsgCashout' && message.denom === 'EURC') {
      const config = await getRelayerConfig();
      const result = await broadcastSend(
        config.treasuryAddress,
        message.amount,
        `Ledger X cashout · ${message.rail}`,
      );
      if (result.status !== 'success') return result;
      const cashout = await requestJson<{ status: string }>('/v1/cashouts', {
        txHash: result.txHash,
      });
      return { ...result, status: cashout.status === 'burned' ? 'success' : 'failed' };
    }
    return mockClient.signAndBroadcast(message);
  },
};

export { chainClient };

async function getDeviceWallet(): Promise<DirectSecp256k1Wallet> {
  deviceWalletPromise ??= loadDeviceWallet().catch((error: unknown) => {
    deviceWalletPromise = undefined;
    throw error;
  });
  return deviceWalletPromise;
}

async function loadDeviceWallet(): Promise<DirectSecp256k1Wallet> {
  let storedKey = Platform.OS === 'web'
    ? await AsyncStorage.getItem(DEVICE_KEY_NAME)
    : await SecureStore.getItemAsync(DEVICE_KEY_NAME);
  if (storedKey === null) {
    storedKey = bytesToHex(getRandomBytes(32));
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(DEVICE_KEY_NAME, storedKey);
    } else {
      await SecureStore.setItemAsync(DEVICE_KEY_NAME, storedKey);
    }
  }
  if (!/^[0-9a-f]{64}$/i.test(storedKey)) {
    throw new Error('The stored device key is invalid');
  }
  return DirectSecp256k1Wallet.fromKey(hexToBytes(storedKey), 'ledgerx');
}

async function getRelayerConfig(): Promise<RelayerConfig> {
  configPromise ??= requestJson<RelayerConfig>('/v1/config')
    .then((config) => {
      if (
        !config.chainId
        || !config.treasuryAddress
        || config.denom !== EURC_CHAIN_DENOM
        || config.xofPerEur !== '655.957'
      ) {
        throw new Error('The relayer returned an invalid chain configuration');
      }
      return config;
    })
    .catch((error: unknown) => {
      configPromise = undefined;
      throw error;
    });
  return configPromise;
}

async function getSigningClient(): Promise<SigningStargateClient> {
  signingClientPromise ??= (async () => {
    const config = await getRelayerConfig();
    const wallet = await getDeviceWallet();
    const client = await SigningStargateClient.connectWithSigner(
      `${getRelayerUrl()}/rpc`,
      wallet,
      { gasPrice: GasPrice.fromString('0.0025uledx') },
    );
    const chainId = await client.getChainId();
    if (chainId !== config.chainId) {
      client.disconnect();
      throw new Error(`Expected chain ${config.chainId}, connected to ${chainId}`);
    }
    return client;
  })().catch((error: unknown) => {
    signingClientPromise = undefined;
    throw error;
  });
  return signingClientPromise;
}

async function broadcastSend(
  toAddress: string,
  amount: number,
  memo?: string,
): Promise<TxResult> {
  const wallet = await getDeviceWallet();
  const [account] = await wallet.getAccounts();
  if (!account) throw new Error('The device key did not produce an account');
  const config = await getRelayerConfig();
  const client = await getSigningClient();
  const result = await client.sendTokens(
    account.address,
    toAddress,
    [{ denom: EURC_CHAIN_DENOM, amount: toBaseUnits(amount) }],
    { ...GAS_FEE, granter: config.treasuryAddress },
    memo,
  );
  return {
    txHash: result.transactionHash,
    height: result.height,
    gasUsed: Number(result.gasUsed),
    feePaidBy: 'treasury-feegrant',
    status: result.code === 0 ? 'success' : 'failed',
  };
}

async function requestJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getRelayerUrl()}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return readJson<T>(response);
}

async function readJson<T>(response: Response): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      && typeof payload.error === 'string'
      ? payload.error
      : `Relayer request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

function getRelayerUrl(): string {
  const url = process.env.EXPO_PUBLIC_LEDGERX_RELAYER_URL?.trim().replace(/\/+$/, '');
  if (!url) throw new Error('EXPO_PUBLIC_LEDGERX_RELAYER_URL is not configured');
  return url;
}

function toBaseUnits(amount: number): string {
  const baseAmount = Math.round(amount * MICRO_UNITS);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(baseAmount) || baseAmount <= 0) {
    throw new Error('Amount must be a positive value with at most six decimal places');
  }
  return String(baseAmount);
}

function formatXofAmount(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('XOF amount must be a positive integer');
  }
  return String(amount);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from({ length: hex.length / 2 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
}
