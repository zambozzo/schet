import type { UserStats } from './types';

export function hasNickname(user: Pick<UserStats, 'nickname'>): boolean {
  return Boolean(user.nickname?.trim());
}

export function getDisplayName(user: Pick<UserStats, 'name' | 'nickname'>): string {
  const nick = user.nickname?.trim();
  if (nick) return nick;
  return user.name || 'Игрок';
}
