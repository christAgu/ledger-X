import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import type { Denom, SmartAccount } from '@/services/ledgerx/types';

export type TransactionType = 'deposit' | 'send' | 'receive' | 'cashout' | 'convert' | 'card';
export type WalletTransaction = {
  id: string;
  type: TransactionType;
  title: string;
  detail: string;
  amount: number;
  denom: Denom;
  date: number;
  status: 'success' | 'pending' | 'failed';
  hash: string;
  fee: number;
};

type CardState = {
  frozen: boolean;
  onlinePayments: boolean;
  contactless: boolean;
  limitMonthly: number;
  pan: string;
  cvv: string;
  expiry: string;
  holder: string;
};

type WalletState = {
  hydrated: boolean;
  account: SmartAccount | null;
  phone: string;
  tag: string;
  displayName: string;
  balances: Record<Denom, number>;
  transactions: WalletTransaction[];
  card: CardState;
  settings: { biometricsEnabled: boolean; hideBalances: boolean; displayCurrency: 'XOF' | 'EUR' | 'USD'; themeMode: 'dark' | 'light' };
  onboarded: boolean;
  setHydrated: (hydrated: boolean) => void;
  setPhone: (phone: string) => void;
  setTag: (tag: string) => void;
  setAccount: (account: SmartAccount) => void;
  setOnboarded: (onboarded: boolean) => void;
  updateBalance: (denom: Denom, delta: number) => void;
  syncBalances: (partial: Partial<Record<Denom, number>>) => void;
  addTransaction: (transaction: Omit<WalletTransaction, 'id' | 'date'>) => void;
  updateCard: (patch: Partial<CardState>) => void;
  updateSettings: (patch: Partial<WalletState['settings']>) => void;
  resetDemo: () => void;
};

const initialBalances: Record<Denom, number> = {
  aXOF: 250_000,
  aEUR: 120,
  aUSD: 85,
  USDC: 40,
  USDT: 0,
  BTC: 0.0012,
  SOL: 0.8,
};

const initialTransactions: WalletTransaction[] = [
  { id: 'tx-1', type: 'deposit', title: 'Dépôt MTN MoMo', detail: 'MTN MoMo · +229 97 00 00 00', amount: 25_000, denom: 'aXOF', date: Date.now() - 3_600_000, status: 'success', hash: '8a2f4c1d0e9b7a6f2d1c0b8e7a6f5d4c3b2a1908172635445566778899aabbcc', fee: 0 },
  { id: 'tx-2', type: 'send', title: 'Envoyé à @fatou', detail: 'Transfert Ledger X', amount: -12_500, denom: 'aXOF', date: Date.now() - 86_400_000, status: 'success', hash: '95b64c1d0e9b7a6f2d1c0b8e7a6f5d4c3b2a1908172635445566778899aabbcd', fee: 0 },
  { id: 'tx-3', type: 'convert', title: 'Conversion XOF → EUR', detail: 'Taux garanti · frais 0,5 %', amount: -10_000, denom: 'aXOF', date: Date.now() - 172_800_000, status: 'success', hash: '4c2f4c1d0e9b7a6f2d1c0b8e7a6f5d4c3b2a1908172635445566778899aabbce', fee: 50 },
  { id: 'tx-4', type: 'card', title: 'Café Cotonou', detail: 'Paiement par carte', amount: -4_500, denom: 'aXOF', date: Date.now() - 259_200_000, status: 'success', hash: '7e8d4c1d0e9b7a6f2d1c0b8e7a6f5d4c3b2a1908172635445566778899aabbcf', fee: 0 },
];

const startingState = {
  hydrated: false,
  account: null,
  phone: '+229 97 00 00 00',
  tag: 'amina',
  displayName: 'Amina Traoré',
  balances: initialBalances,
  transactions: initialTransactions,
  card: {
    frozen: false,
    onlinePayments: true,
    contactless: true,
    limitMonthly: 250_000,
    pan: '4532 1045 8892 4821',
    cvv: '284',
    expiry: '08/29',
    holder: 'AMINA TRAORÉ',
  },
  settings: { biometricsEnabled: false, hideBalances: false, displayCurrency: 'EUR' as const, themeMode: 'dark' as const },
  onboarded: false,
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      ...startingState,
      setHydrated: (hydrated) => set({ hydrated }),
      setPhone: (phone) => set({ phone }),
      setTag: (tag) => set({ tag }),
      setAccount: (account) => set({ account, tag: account.tag }),
      setOnboarded: (onboarded) => set({ onboarded }),
      updateBalance: (denom, delta) =>
        set((state) => ({ balances: { ...state.balances, [denom]: state.balances[denom] + delta } })),
      syncBalances: (partial) =>
        set((state) => ({ balances: { ...state.balances, ...partial } })),
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [{ ...transaction, id: `tx-${Date.now()}`, date: Date.now() }, ...state.transactions],
        })),
      updateCard: (patch) => set((state) => ({ card: { ...state.card, ...patch } })),
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
      resetDemo: () => set({ ...startingState, hydrated: true }),
    }),
    {
      name: 'ledgerx-wallet-state',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as WalletState;
        const settings = { ...startingState.settings, ...state.settings };
        if (version < 1) settings.displayCurrency = 'EUR';
        if (version < 2) settings.themeMode = 'dark';
        return { ...state, settings };
      },
      partialize: ({ hydrated: _hydrated, ...state }) => state,
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

const PIN_KEY = 'ledgerx-wallet-pin';
export async function savePin(pin: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(PIN_KEY, pin);
  } else {
    await SecureStore.setItemAsync(PIN_KEY, pin);
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = Platform.OS === 'web'
    ? await AsyncStorage.getItem(PIN_KEY)
    : await SecureStore.getItemAsync(PIN_KEY);
  return pin === (stored ?? '123456');
}
