/**
 * Конфиг приложения.
 * После создания Firebase-проекта заполните значения из консоли Firebase
 * (Project settings → Your apps → SDK setup).
 *
 * Репозиторий обновлений: https://github.com/zambozzo/schet
 */
export const APP_CONFIG = {
  githubOwner: 'zambozzo',
  githubRepo: 'schet',
  /** Имя APK-файла в GitHub Release */
  apkAssetName: 'Schet.apk',

  firebase: {
    apiKey: 'PASTE_FIREBASE_API_KEY',
    authDomain: 'PASTE_PROJECT_ID.firebaseapp.com',
    projectId: 'PASTE_PROJECT_ID',
    storageBucket: 'PASTE_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'PASTE_SENDER_ID',
    appId: 'PASTE_APP_ID',
  },

  /**
   * Web client ID из Google Cloud / Firebase
   * (Authentication → Sign-in method → Google → Web SDK configuration)
   * Нужен для native Google Sign-In на Android.
   */
  googleWebClientId: 'PASTE_WEB_CLIENT_ID.apps.googleusercontent.com',
};

export function isFirebaseConfigured(): boolean {
  const { apiKey, projectId, appId } = APP_CONFIG.firebase;
  return (
    !apiKey.startsWith('PASTE_') &&
    !projectId.startsWith('PASTE_') &&
    !appId.startsWith('PASTE_') &&
    !APP_CONFIG.googleWebClientId.startsWith('PASTE_')
  );
}
