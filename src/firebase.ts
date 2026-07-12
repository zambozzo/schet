import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { APP_CONFIG, isFirebaseConfigured } from './config';

const app = getApps().length
  ? getApp()
  : initializeApp(APP_CONFIG.firebase);

export const firebaseApp = app;
export const firebaseAuth = getAuth(app);
export const db = getFirestore(app);
export { isFirebaseConfigured };
