/**
 * Конфиг приложения.
 * Репозиторий обновлений: https://github.com/zambozzo/schet
 */
export const APP_CONFIG = {
  githubOwner: 'zambozzo',
  githubRepo: 'schet',
  /** Имя APK-файла в GitHub Release */
  apkAssetName: 'Schet.apk',

  firebase: {
    apiKey: 'AIzaSyAfP1iIlUAon9OawrJ5tqwLkAHvi1P1Byg',
    authDomain: 'schet-app.firebaseapp.com',
    projectId: 'schet-app',
    storageBucket: 'schet-app.firebasestorage.app',
    messagingSenderId: '596520023497',
    appId: '1:596520023497:android:98ef81c686c76fa0ca2418',
  },

  /**
   * Web client ID из Firebase:
   * Authentication → Sign-in method → Google → Web SDK configuration
   * (после включения Google Auth скачайте google-services.json заново —
   *  там появится oauth_client, либо скопируйте Web client ID из консоли)
   */
  googleWebClientId: '596520023497-sma7tj9i3kmr7cov1b4meis51bbnpqhl.apps.googleusercontent.com',
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
