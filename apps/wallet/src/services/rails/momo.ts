import { wait } from '@/utils/wait';

export type MomoStatus = 'pending' | 'success';

export async function requestMomoDeposit(amount: number, phone: string) {
  await wait(700);
  return { id: `momo-${Date.now()}`, amount, phone, status: 'pending' as const, instruction: 'Validez sur votre téléphone *880#' };
}

export async function confirmMomoDeposit(id: string) {
  await wait(1100);
  return { id, status: 'success' as const };
}
