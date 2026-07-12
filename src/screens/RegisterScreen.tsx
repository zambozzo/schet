import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isFirebaseConfigured } from '../config';
import { signInWithGoogle } from '../auth';
import type { UserStats } from '../types';
import { colors } from '../theme';

type Props = {
  onRegistered: (user: UserStats) => void;
};

export function RegisterScreen({ onRegistered }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      onRegistered(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось войти через Google');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Счёт</Text>
        <Text style={styles.subtitle}>
          Примеры на сложение и вычитание. Цифры до 100.
          Статистика всех игроков в облаке — компьютер не нужен.
        </Text>
      </View>

      <View style={styles.form}>
        {!isFirebaseConfigured() ? (
          <Text style={styles.warn}>
            Сначала настройте Firebase (файл FIREBASE_SETUP.md) и пересоберите APK.
          </Text>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGoogle}
          disabled={loading || !isFirebaseConfigured()}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>Войти через Google</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    marginBottom: 36,
  },
  brand: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 24,
    color: colors.muted,
  },
  form: {
    gap: 12,
  },
  warn: {
    color: '#FBBF24',
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.warn,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 18,
    fontWeight: '700',
  },
});
