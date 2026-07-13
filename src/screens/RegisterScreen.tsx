import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isFirebaseConfigured } from '../config';
import { signInWithGoogle } from '../auth';
import { useT } from '../i18n';
import { useLayout } from '../layout';
import type { UserStats } from '../types';
import { colors } from '../theme';

type Props = {
  onRegistered: (user: UserStats) => void;
};

export function RegisterScreen({ onRegistered }: Props) {
  const { ms, vs, padH, contentMaxWidth, isCompact } = useLayout();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      onRegistered(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.googleError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.root,
        {
          paddingHorizontal: padH,
          paddingVertical: vs(isCompact ? 16 : 24),
        },
      ]}
      keyboardShouldPersistTaps="handled"
      bounces={false}
    >
      <View style={[styles.inner, { maxWidth: contentMaxWidth, width: '100%' }]}>
        <View style={[styles.hero, { marginBottom: vs(isCompact ? 24 : 36) }]}>
          <Text style={[styles.brand, { fontSize: ms(56) }]}>{t('app.brand')}</Text>
          <Text
            style={[
              styles.subtitle,
              { fontSize: ms(17), lineHeight: ms(24), marginTop: vs(10) },
            ]}
          >
            {t('auth.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          {!isFirebaseConfigured() ? (
            <Text style={[styles.warn, { fontSize: ms(14), lineHeight: ms(20) }]}>
              {t('auth.firebaseWarn')}
            </Text>
          ) : null}

          {error ? (
            <Text style={[styles.error, { fontSize: ms(14) }]}>{error}</Text>
          ) : null}

          <Pressable
            style={[
              styles.button,
              { paddingVertical: vs(16), borderRadius: ms(14) },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleGoogle}
            disabled={loading || !isFirebaseConfigured()}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={[styles.buttonText, { fontSize: ms(18) }]}>
                {t('auth.google')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  root: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    alignSelf: 'center',
  },
  hero: {},
  brand: {
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.muted,
  },
  form: {
    gap: 12,
  },
  warn: {
    color: '#FBBF24',
  },
  error: {
    color: colors.warn,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.bg,
    fontWeight: '700',
  },
});
