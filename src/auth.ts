import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { APP_CONFIG, isFirebaseConfigured } from './config';
import { firebaseAuth } from './firebase';
import { upsertUserProfile } from './cloud';
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

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle(): Promise<UserStats> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase ещё не настроен. Откройте FIREBASE_SETUP.md в репозитории и заполните src/config.ts',
    );
  }

  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type !== 'success' || !response.data?.idToken) {
    throw new Error('Вход через Google отменён');
  }

  const credential = GoogleAuthProvider.credential(response.data.idToken);
  const result = await signInWithCredential(firebaseAuth, credential);
  const user = result.user;

  return upsertUserProfile({
    id: user.uid,
    name: user.displayName || user.email || 'Игрок',
    email: user.email,
    photoURL: user.photoURL,
  });
}

export async function signOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
  await firebaseSignOut(firebaseAuth);
}
