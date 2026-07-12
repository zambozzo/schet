import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { UserStats } from './types';

const API_URL_KEY = 'math_quiz_api_url';

function normalizeApiUrl(raw: string): string {
  let url = raw.trim().replace(/\/$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url;
}

function detectDevApiBase(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (typeof fromExtra === 'string' && fromExtra.length > 0) {
    return normalizeApiUrl(fromExtra);
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.linkingUri ||
    '';

  const host = hostUri
    .replace(/^[a-z]+:\/\//i, '')
    .split(':')[0]
    .split('/')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:3001`;
  }

  return 'http://127.0.0.1:3001';
}

export async function getApiBase(): Promise<string> {
  const saved = await AsyncStorage.getItem(API_URL_KEY);
  if (saved) {
    return normalizeApiUrl(saved);
  }
  return detectDevApiBase();
}

export async function setApiBase(raw: string): Promise<string> {
  const url = normalizeApiUrl(raw);
  if (!url) {
    throw new Error('Укажите адрес сервера, например 192.168.1.10:3001');
  }
  await AsyncStorage.setItem(API_URL_KEY, url);
  return url;
}

export async function getSavedApiHost(): Promise<string> {
  const base = await getApiBase();
  return base.replace(/^https?:\/\//i, '');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBase = await getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : `Ошибка сети (${response.status})`,
    );
  }
  return data as T;
}

export function registerUser(name: string) {
  return request<UserStats>('/users', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function fetchUsers() {
  return request<UserStats[]>('/users');
}

export function sendHeartbeat(userId: string) {
  return request<UserStats>(`/users/${userId}/heartbeat`, { method: 'POST' });
}

export function reportAnswer(userId: string, correct: boolean) {
  return request<UserStats>(`/users/${userId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ correct }),
  });
}
