import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import type { Denom, SmartAccount } from '@/services/ledgerx/types';
import { XOF_PER_EUR } from '@/services/rates';

export type TransactionType = 'deposit' | 'send' | 'receive' | 'cashout' | 'convert' | 'card';
export type MerchantBrand = 'netflix' | 'airbnb' | 'booking' | 'airfrance' | 'uber' | 'spotify' | 'orange' | 'shell';
export type MerchantCategory = 'restaurant' | 'cafe' | 'shopping' | 'market' | 'pharmacy' | 'taxi' | 'fuel' | 'telecom' | 'travel';
export type Merchant = MerchantBrand | MerchantCategory;
export type WalletTransaction = {
  id: string;
  type: TransactionType;
  title: string;
  detail: string;
  merchant?: Merchant;
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
  EURC: 501.12,
  USD: 85,
  USDC: 40,
  USDT: 0,
  BTC: 0.0012,
  SOL: 0.8,
};

const seedXofToEurc = (xof: number) => Math.round((xof / XOF_PER_EUR) * 100) / 100;

const HOUR = 3_600_000;
const DAY = 86_400_000;
const seedHash = (index: number) => `${index.toString(16).padStart(4, '0')}4c1d0e9b7a6f2d1c0b8e7a6f5d4c3b2a1908172635445566778899aabbcc`.slice(0, 64);
type Seed = Pick<WalletTransaction, 'type' | 'title' | 'detail'> & { xof: number; ago: number; merchant?: Merchant; fee?: number };
const seeds: Seed[] = [
  { type: 'deposit', title: 'Dépôt MTN MoMo', detail: 'MTN MoMo · +229 97 00 00 00 · 25 000 XOF', xof: 25_000, ago: HOUR },
  { type: 'card', title: 'Netflix', detail: 'Abonnement · 5 490 XOF', xof: -5_490, ago: 3 * HOUR, merchant: 'netflix' },
  { type: 'card', title: 'Maquis Chez Maman', detail: 'Restaurant · 6 500 XOF', xof: -6_500, ago: 7 * HOUR, merchant: 'restaurant' },
  { type: 'send', title: 'Envoyé à @fatou', detail: 'Transfert Ledger X · 12 500 XOF', xof: -12_500, ago: DAY },
  { type: 'card', title: 'Uber', detail: 'Course · 3 200 XOF', xof: -3_200, ago: DAY + 5 * HOUR, merchant: 'uber' },
  { type: 'card', title: 'Marché Dantokpa', detail: 'Courses · 12 000 XOF', xof: -12_000, ago: DAY + 9 * HOUR, merchant: 'market' },
  { type: 'convert', title: 'Conversion XOF → EURC', detail: 'Taux garanti · frais 0,5 % · 10 000 XOF', xof: -10_000, ago: 2 * DAY, fee: 50 },
  { type: 'card', title: 'Airbnb', detail: 'Séjour à Grand-Popo · 85 000 XOF', xof: -85_000, ago: 2 * DAY + 4 * HOUR, merchant: 'airbnb' },
  { type: 'card', title: 'Boutique Erevan', detail: 'Shopping · 28 000 XOF', xof: -28_000, ago: 2 * DAY + 8 * HOUR, merchant: 'shopping' },
  { type: 'card', title: 'Café Cotonou', detail: 'Paiement par carte · 4 500 XOF', xof: -4_500, ago: 3 * DAY, merchant: 'cafe' },
  { type: 'card', title: 'Spotify', detail: 'Abonnement · 3 500 XOF', xof: -3_500, ago: 3 * DAY + 6 * HOUR, merchant: 'spotify' },
  { type: 'card', title: 'Pharmacie Camp Guézo', detail: 'Pharmacie · 7 800 XOF', xof: -7_800, ago: 4 * DAY, merchant: 'pharmacy' },
  { type: 'card', title: 'Booking.com', detail: 'Hôtel Azalaï · 62 000 XOF', xof: -62_000, ago: 5 * DAY, merchant: 'booking' },
  { type: 'card', title: 'Orange', detail: 'Recharge mobile · 2 000 XOF', xof: -2_000, ago: 5 * DAY + 3 * HOUR, merchant: 'orange' },
  { type: 'card', title: 'Shell Ganhi', detail: 'Carburant · 15 000 XOF', xof: -15_000, ago: 6 * DAY, merchant: 'shell' },
  { type: 'card', title: 'Air France', detail: 'Vol Cotonou → Paris · 385 000 XOF', xof: -385_000, ago: 12 * DAY, merchant: 'airfrance' },
];
const initialTransactions: WalletTransaction[] = seeds.map(({ xof, ago, fee = 0, ...seed }, index) => ({
  ...seed,
  id: `tx-${index + 1}`,
  amount: Math.sign(xof) * seedXofToEurc(Math.abs(xof)),
  denom: 'EURC',
  date: Date.now() - ago,
  status: 'success',
  hash: seedHash(index + 1),
  fee: seedXofToEurc(fee),
}));

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
  settings: { biometricsEnabled: false, hideBalances: false, displayCurrency: 'EUR' as const, themeMode: 'light' as const },
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
      version: 5,
      migrate: (persisted, version) => {
        const state = persisted as WalletState;
        const settings = { ...startingState.settings, ...state.settings };
        if (version < 1) settings.displayCurrency = 'EUR';
        if (version < 2) settings.themeMode = 'dark';
        if (version < 5) settings.themeMode = 'light';
        if (version < 3) {
          const oldBalances = (state.balances ?? {}) as Record<string, number>;
          const balances: Record<Denom, number> = {
            ...initialBalances,
            EURC: (oldBalances.aXOF ?? 0) / XOF_PER_EUR + (oldBalances.aEUR ?? 0),
            USD: oldBalances.aUSD ?? 0,
            USDC: oldBalances.USDC ?? initialBalances.USDC,
            USDT: oldBalances.USDT ?? initialBalances.USDT,
            BTC: oldBalances.BTC ?? initialBalances.BTC,
            SOL: oldBalances.SOL ?? initialBalances.SOL,
          };
          const transactions = (state.transactions ?? []).map((transaction) => {
            const oldDenom = (transaction as unknown as { denom: string }).denom;
            if (oldDenom === 'aXOF') {
              return {
                ...transaction,
                amount: transaction.amount / XOF_PER_EUR,
                denom: 'EURC' as const,
                fee: transaction.fee / XOF_PER_EUR,
              };
            }
            if (oldDenom === 'aEUR') return { ...transaction, denom: 'EURC' as const };
            if (oldDenom === 'aUSD') return { ...transaction, denom: 'USD' as const };
            return transaction;
          });
          return { ...state, balances, transactions, settings };
        }
        if (version < 4) {
          const existing = new Set((state.transactions ?? []).map((transaction) => transaction.id));
          const transactions = [...(state.transactions ?? []), ...initialTransactions.filter((seed) => !existing.has(seed.id))];
          return { ...state, transactions, settings };
        }
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
