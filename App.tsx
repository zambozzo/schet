import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  configureGoogleSignIn,
  signOut,
  subscribeAuth,
} from './src/auth';
import { sendHeartbeat, upsertUserProfile } from './src/cloud';
import { isFirebaseConfigured } from './src/config';
import type { UpdateInfo, UserStats } from './src/types';
import { colors } from './src/theme';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  getLocalVersion,
} from './src/updates';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const STORAGE_KEY = 'math_quiz_user_v2';

type Tab = 'quiz' | 'users';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserStats | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>('quiz');
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [updating, setUpdating] = useState(false);

  const topPad = Math.max(insets.top, StatusBar.currentHeight || 0) + 8;
  const bottomPad = Math.max(insets.bottom, 16) + 8;

  const persistUser = useCallback(async (next: UserStats) => {
    setUser(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let finished = false;

    function finishBoot() {
      if (finished) return;
      finished = true;
      setBooting(false);
      SplashScreen.hideAsync().catch(() => undefined);
    }

    async function boot() {
      try {
        const found = await checkForUpdate();
        if (found) setUpdate(found);
      } catch {
        // ignore
      }

      if (!isFirebaseConfigured()) {
        finishBoot();
        return;
      }

      configureGoogleSignIn();
      unsub = subscribeAuth(async (firebaseUser) => {
        try {
          if (!firebaseUser) {
            setUser(null);
            await AsyncStorage.removeItem(STORAGE_KEY);
            return;
          }
          const profile = await upsertUserProfile({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email || 'Игрок',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          });
          await persistUser(profile);
        } catch {
          // ignore profile sync errors on boot
        } finally {
          finishBoot();
        }
      });

      setTimeout(finishBoot, 4000);
    }

    boot();
    return () => {
      unsub?.();
    };
  }, [persistUser]);

  useEffect(() => {
    if (!user?.id || !isFirebaseConfigured()) return;
    const tick = () => {
      sendHeartbeat(user.id).catch(() => undefined);
    };
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, [user?.id]);

  async function handleUpdate() {
    if (!update) return;
    setUpdating(true);
    try {
      await downloadAndInstallUpdate(update);
    } catch (e) {
      Alert.alert(
        'Обновление',
        e instanceof Error ? e.message : 'Не удалось установить обновление',
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // ignore
    }
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  if (booting) {
    return <View style={styles.boot} />;
  }

  if (!user) {
    return (
      <View style={[styles.safe, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        {update ? (
          <UpdateBanner
            update={update}
            updating={updating}
            onUpdate={handleUpdate}
            onSkip={() => setUpdate(null)}
          />
        ) : null}
        <RegisterScreen onRegistered={persistUser} />
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {update ? (
        <UpdateBanner
          update={update}
          updating={updating}
          onUpdate={handleUpdate}
          onSkip={() => setUpdate(null)}
        />
      ) : null}

      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Счёт</Text>
          <Text style={styles.userName}>{user.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.version}>v{getLocalVersion()}</Text>
          <Pressable onPress={handleSignOut}>
            <Text style={styles.logout}>Выйти</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        {tab === 'quiz' ? (
          <QuizScreen user={user} onStatsUpdated={persistUser} />
        ) : (
          <UsersScreen currentUserId={user.id} />
        )}
      </View>

      <View style={[styles.tabs, { paddingBottom: bottomPad }]}>
        <TabButton
          label="Примеры"
          active={tab === 'quiz'}
          onPress={() => setTab('quiz')}
        />
        <TabButton
          label="Игроки"
          active={tab === 'users'}
          onPress={() => setTab('users')}
        />
      </View>
    </View>
  );
}

function UpdateBanner({
  update,
  updating,
  onUpdate,
  onSkip,
}: {
  update: UpdateInfo;
  updating: boolean;
  onUpdate: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.updateBox}>
      <Text style={styles.updateTitle}>Доступна версия {update.version}</Text>
      <Text style={styles.updateText}>Можно обновить приложение с GitHub</Text>
      <View style={styles.updateActions}>
        <Pressable style={styles.updateBtn} onPress={onUpdate} disabled={updating}>
          {updating ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.updateBtnText}>Обновить</Text>
          )}
        </Pressable>
        <Pressable onPress={onSkip} disabled={updating}>
          <Text style={styles.skipText}>Позже</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  brand: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '800',
  },
  userName: {
    color: colors.muted,
    fontSize: 13,
  },
  version: {
    color: colors.muted,
    fontSize: 11,
  },
  logout: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.bgSoft,
  },
  tab: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 15,
  },
  tabTextActive: {
    color: colors.bg,
  },
  updateBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.panel,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  updateTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  updateText: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 13,
  },
  updateActions: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  updateBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 110,
    alignItems: 'center',
  },
  updateBtnText: {
    color: colors.bg,
    fontWeight: '700',
  },
  skipText: {
    color: colors.muted,
    fontWeight: '600',
  },
});
