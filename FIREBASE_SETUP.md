# Настройка Firebase + Google для «Счёт»

Без этих шагов кнопка «Войти через Google» не заработает. Компьютер после настройки не нужен: статистика хранится в облаке Firebase.

## 1. Создайте проект Firebase

1. Откройте https://console.firebase.google.com  
2. **Add project** → имя например `schet-app`  
3. Google Analytics можно отключить  

## 2. Android-приложение

1. Project settings → **Add app** → Android  
2. Package name: `com.mathquiz.schet`  
3. Скачайте `google-services.json`  
4. Положите файл в папку проекта:

```text
math-quiz/google-services.json
```

## 3. SHA-1 подписи APK (обязательно для Google Sign-In)

В PowerShell из папки сборки (или Android Studio):

```powershell
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Для release-ключа — укажите свой keystore.  
Скопируйте **SHA-1** в Firebase → Project settings → ваше Android-приложение → Add fingerprint.

## 4. Включите Google Auth

1. Firebase → **Authentication** → Sign-in method → **Google** → Enable  
2. Сохраните **Web client ID**

## 5. Firestore

1. **Firestore Database** → Create database → production mode  
2. Rules (для старта, потом ужесточите):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Чтобы все видели статистику всех игроков, правило `allow read` для авторизованных — ок.  
Писать можно только свой документ (`uid == userId`).

## 6. Заполните `src/config.ts`

Из Firebase → Project settings → Your apps → SDK setup and configuration:

- `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`  
- `googleWebClientId` — Web client ID из шага 4  

## 7. Пересоберите APK

После заполнения конфига и добавления `google-services.json` пересоберите APK и загрузите в GitHub Releases как `Schet.apk` с тегом `v1.1.0` (или новее).

Приложение при входе само проверит обновления в репозитории `zambozzo/schet`.
