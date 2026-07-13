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
  restoreSessionUser,
  signOut,
} from './src/auth';
import { sendHeartbeat } from './src/cloud';
import { isFirebaseConfigured } from './src/config';
import { getDisplayName, hasNickname } from './src/displayName';
import { I18nProvider, useT } from './src/i18n';
import type { UpdateInfo, UserStats } from './src/types';
import { colors } from './src/theme';
import { useLayout } from './src/layout';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  getLocalVersion,
} from './src/updates';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const STORAGE_KEY = 'math_quiz_user_v2';

type Tab = 'quiz' | 'users';
type Screen = 'main' | 'settings';

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const { ms, vs, s, padH } = useLayout();
  const t = useT();
  const [user, setUser] = useState<UserStats | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>('quiz');
  const [screen, setScreen] = useState<Screen>('main');
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [updating, setUpdating] = useState(false);

  const topPad = Math.max(insets.top, StatusBar.currentHeight || 0) + vs(8);
  const bottomPad = Math.max(insets.bottom, 16) + vs(8);

  const persistUser = useCallback(async (next: UserStats) => {
    setUser(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
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

      try {
        if (isFirebaseConfigured()) {
          configureGoogleSignIn();
          const restored = await restoreSessionUser();
          if (restored) {
            await persistUser(restored);
          } else {
            setUser(null);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // ignore restore errors
      } finally {
        finishBoot();
      }
    }

    boot();
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
        t('update.errorTitle'),
        e instanceof Error ? e.message : t('update.errorFallback'),
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
    setScreen('main');
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

  if (screen === 'settings') {
    return (
      <View style={[styles.safe, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SettingsScreen
          user={user}
          onBack={() => setScreen('main')}
          onUserUpdated={persistUser}
        />
      </View>
    );
  }

  const displayName = getDisplayName(user);
  const showHint = !hasNickname(user);

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

      <View style={[styles.header, { paddingHorizontal: padH }]}>
        <View style={{ flexShrink: 1, paddingRight: s(12) }}>
          <Text style={[styles.brand, { fontSize: ms(24) }]}>{t('app.brand')}</Text>
          <View style={styles.nameRow}>
            <Pressable
              onPress={() => setScreen('settings')}
              hitSlop={6}
              style={{ flexShrink: 1 }}
            >
              <Text style={[styles.userName, { fontSize: ms(13) }]} numberOfLines={1}>
                {displayName}
              </Text>
            </Pressable>
            {showHint ? (
              <Pressable
                onPress={() => setScreen('settings')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('settings.hintOpen')}
                style={[
                  styles.hintBtn,
                  {
                    width: Math.max(32, ms(28)),
                    height: Math.max(32, ms(28)),
                    borderRadius: Math.max(16, ms(14)),
                  },
                ]}
              >
                <Text style={[styles.hintMark, { fontSize: ms(15) }]}>⚙</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.version, { fontSize: ms(11) }]}>v{getLocalVersion()}</Text>
          <Pressable onPress={handleSignOut} hitSlop={8}>
            <Text style={[styles.logout, { fontSize: ms(13) }]}>{t('app.logout')}</Text>
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

      <View
        style={[
          styles.tabs,
          {
            paddingBottom: bottomPad,
            paddingHorizontal: padH,
            paddingTop: vs(12),
            gap: s(10),
          },
        ]}
      >
        <TabButton
          label={t('tabs.quiz')}
          active={tab === 'quiz'}
          onPress={() => setTab('quiz')}
          fontSize={ms(15)}
          padV={vs(12)}
          radius={ms(12)}
        />
        <TabButton
          label={t('tabs.users')}
          active={tab === 'users'}
          onPress={() => setTab('users')}
          fontSize={ms(15)}
          padV={vs(12)}
          radius={ms(12)}
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
  const t = useT();
  return (
    <View style={styles.updateBox}>
      <Text style={styles.updateTitle}>
        {t('update.title', { version: update.version })}
      </Text>
      <Text style={styles.updateText}>{t('update.text')}</Text>
      <View style={styles.updateActions}>
        <Pressable style={styles.updateBtn} onPress={onUpdate} disabled={updating}>
          {updating ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.updateBtnText}>{t('update.action')}</Text>
          )}
        </Pressable>
        <Pressable onPress={onSkip} disabled={updating}>
          <Text style={styles.skipText}>{t('update.later')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
  fontSize,
  padV,
  radius,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  fontSize: number;
  padV: number;
  radius: number;
}) {
  return (
    <Pressable
      style={[
        styles.tab,
        { paddingVertical: padV, borderRadius: radius },
        active && styles.tabActive,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, { fontSize }, active && styles.tabTextActive]}>
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
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: colors.muted,
  },
  hintBtn: {
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintMark: {
    color: colors.accent,
    fontWeight: '800',
  },
  version: {
    color: colors.muted,
  },
  logout: {
    color: colors.accent,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.bgSoft,
  },
  tab: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.muted,
    fontWeight: '700',
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
