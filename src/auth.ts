import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { APP_CONFIG, isFirebaseConfigured } from './config';
import { upsertUserProfile } from './cloud';
import {
  clearSession,
  exchangeGoogleIdToken,
  loadSession,
  saveSession,
  type AuthSession,
} from './session';
import type { UserStats } from './types';

let configured = false;

export function configureGoogleSignIn() {
  if (configured || !isFirebaseConfigured()) return;
  GoogleSignin.configure({
    webClientId: APP_CONFIG.googleWebClientId,
    offlineAccess: false,
  });
  configured = true;
}

export async function restoreSessionUser(): Promise<UserStats | null> {
  const session = await loadSession();
  if (!session) return null;
  try {
    return await upsertUserProfile({
      id: session.uid,
      name: session.name,
      email: session.email,
      photoURL: session.photoURL,
    });
  } catch {
    // сессия есть, но сеть недоступна — вернём локальный профиль
    return {
      id: session.uid,
      name: session.name,
      email: session.email,
      photoURL: session.photoURL,
      total: 0,
      correct: 0,
      incorrect: 0,
      online: true,
      lastSeenAt: new Date().toISOString(),
    };
  }
}

export async function signInWithGoogle(): Promise<UserStats> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase ещё не настроен. Откройте FIREBASE_SETUP.md и заполните src/config.ts',
    );
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') {
    throw new Error('Вход через Google отменён');
  }

  // idToken иногда пустой в response — берём через getTokens()
  let idToken = response.data?.idToken || null;
  if (!idToken) {
    const tokens = await GoogleSignin.getTokens();
    idToken = tokens.idToken;
  }
  if (!idToken) {
    throw new Error('Google не вернул idToken. Проверьте Web client ID и SHA-1.');
  }

  let exchanged;
  try {
    exchanged = await exchangeGoogleIdToken(idToken);
  } catch (error) {
    // один повтор после короткой паузы
    await new Promise((r) => setTimeout(r, 700));
    exchanged = await exchangeGoogleIdToken(idToken);
  }

  const session: AuthSession = {
    uid: exchanged.uid,
    idToken: exchanged.idToken,
    refreshToken: exchanged.refreshToken,
    email: exchanged.email,
    name: exchanged.name,
    photoURL: exchanged.photoURL,
    expiresAt: Date.now() + exchanged.expiresInSec * 1000,
  };
  await saveSession(session);

  return upsertUserProfile({
    id: session.uid,
    name: session.name,
    email: session.email,
    photoURL: session.photoURL,
  });
}

export async function signOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
  await clearSession();
}
