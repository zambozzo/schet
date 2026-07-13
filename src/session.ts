import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from './config';

const SESSION_KEY = 'schet_firebase_session_v1';

export type AuthSession = {
  uid: string;
  idToken: string;
  refreshToken: string;
  email: string | null;
  name: string;
  photoURL: string | null;
  expiresAt: number;
};

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getValidIdToken(): Promise<string> {
  const session = await loadSession();
  if (!session) {
    throw new Error('Нужно войти через Google');
  }

  // обновляем за 5 минут до истечения
  if (session.expiresAt > Date.now() + 5 * 60 * 1000) {
    return session.idToken;
  }

  const refreshed = await refreshIdToken(session.refreshToken);
  const next: AuthSession = {
    ...session,
    idToken: refreshed.idToken,
    refreshToken: refreshed.refreshToken || session.refreshToken,
    expiresAt: Date.now() + refreshed.expiresInSec * 1000,
  };
  await saveSession(next);
  return next.idToken;
}

async function refreshIdToken(refreshToken: string): Promise<{
  idToken: string;
  refreshToken?: string;
  expiresInSec: number;
}> {
  const url = `https://securetoken.googleapis.com/v1/token?key=${APP_CONFIG.firebase.apiKey}`;
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Не удалось обновить сессию');
  }
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresInSec: Number(data.expires_in || 3600),
  };
}

export async function exchangeGoogleIdToken(idToken: string): Promise<{
  uid: string;
  idToken: string;
  refreshToken: string;
  email: string | null;
  name: string;
  photoURL: string | null;
  expiresInSec: number;
}> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${APP_CONFIG.firebase.apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${idToken}&providerId=google.com`,
      requestUri: 'https://schet-app.firebaseapp.com',
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'auth/network-request-failed';
    if (/API[_ ]key|PERMISSION|blocked/i.test(msg)) {
      throw new Error(
        'API-ключ Firebase ограничен. В Google Cloud → Credentials откройте API key и разрешите Identity Toolkit API.',
      );
    }
    throw new Error(`Ошибка входа Firebase: ${msg}`);
  }

  return {
    uid: data.localId,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    email: data.email || null,
    name: data.fullName || data.displayName || data.email || 'Игрок',
    photoURL: data.photoUrl || null,
    expiresInSec: Number(data.expiresIn || 3600),
  };
}
