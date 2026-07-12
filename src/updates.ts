import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { APP_CONFIG } from './config';
import type { UpdateInfo } from './types';

function parseVersion(raw: string): number[] {
  return raw
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part.replace(/\D/g, ''), 10) || 0);
}

export function isNewerVersion(remote: string, local: string): boolean {
  const a = parseVersion(remote);
  const b = parseVersion(local);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}

export function getLocalVersion(): string {
  return Constants.expoConfig?.version || '1.0.0';
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const { githubOwner, githubRepo, apkAssetName } = APP_CONFIG;
  const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/releases/latest`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'schet-android-app',
    },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Не удалось проверить обновления (${response.status})`);
  }

  const data = (await response.json()) as {
    tag_name?: string;
    body?: string;
    assets?: Array<{ name: string; browser_download_url: string }>;
  };

  const tagName = data.tag_name || '';
  const remoteVersion = tagName.replace(/^v/i, '');
  const localVersion = getLocalVersion();

  if (!remoteVersion || !isNewerVersion(remoteVersion, localVersion)) {
    return null;
  }

  const asset = (data.assets || []).find(
    (item) => item.name.toLowerCase() === apkAssetName.toLowerCase(),
  );
  if (!asset?.browser_download_url) {
    throw new Error('В релизе нет файла Schet.apk');
  }

  return {
    version: remoteVersion,
    tagName,
    downloadUrl: asset.browser_download_url,
    notes: data.body || '',
  };
}

export async function downloadAndInstallUpdate(update: UpdateInfo): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Установка APK поддерживается только на Android');
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Нет доступа к кэшу устройства');
  }

  const target = `${cacheDir}Schet-${update.version}.apk`;
  const result = await FileSystem.downloadAsync(update.downloadUrl, target);
  if (result.status !== 200) {
    throw new Error('Не удалось скачать обновление');
  }

  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive',
  });
}
