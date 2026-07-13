import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
} from 'firebase/firestore';
import { APP_CONFIG, isFirebaseConfigured } from './config';

const app = getApps().length
  ? getApp()
  : initializeApp(APP_CONFIG.firebase);

function createFirestore() {
  try {
    // На React Native WebChannel часто «висит» — long polling стабильнее.
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: memoryLocalCache(),
    });
  } catch {
    return getFirestore(app);
  }
}

export const firebaseApp = app;
export const firebaseAuth = getAuth(app);
export const db = createFirestore();
export { isFirebaseConfigured };
