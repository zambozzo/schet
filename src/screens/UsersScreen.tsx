import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchUsers } from '../cloud';
import type { UserStats } from '../types';
import { colors } from '../theme';

type Props = {
  currentUserId: string;
};

export function UsersScreen({ currentUserId }: Props) {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить список');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading && users.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Игроки</Text>
      <Text style={styles.hint}>Онлайн и статистика ответов (облако)</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={load}>
            <Text style={styles.retry}>Повторить</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Пока никого нет</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              item.id === currentUserId && styles.rowMe,
            ]}
          >
            <View style={styles.rowTop}>
              <View style={styles.nameBlock}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: item.online ? colors.ok : colors.muted },
                  ]}
                />
                <Text style={styles.name}>
                  {item.name}
                  {item.id === currentUserId ? ' (вы)' : ''}
                </Text>
              </View>
              <Text style={styles.online}>
                {item.online ? 'онлайн' : 'офлайн'}
              </Text>
            </View>
            <View style={styles.metrics}>
              <Metric label="Примеров" value={item.total} />
              <Metric label="Верно" value={item.correct} color={colors.ok} />
              <Metric label="Неверно" value={item.incorrect} color={colors.warn} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  hint: {
    color: colors.muted,
    marginTop: 4,
    marginBottom: 14,
  },
  list: {
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
  row: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: 14,
  },
  rowMe: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  online: {
    color: colors.muted,
    fontSize: 12,
  },
  metrics: {
    flexDirection: 'row',
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: colors.bgSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  errorText: {
    color: colors.warn,
  },
  retry: {
    color: colors.accent,
    fontWeight: '700',
  },
});
