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
import { getDisplayName } from '../displayName';
import { useT } from '../i18n';
import { useLayout } from '../layout';
import type { UserStats } from '../types';
import { colors } from '../theme';

type Props = {
  currentUserId: string;
};

export function UsersScreen({ currentUserId }: Props) {
  const { ms, vs, s, padH, contentMaxWidth } = useLayout();
  const t = useT();
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('users.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    <View style={[styles.root, { paddingHorizontal: padH, paddingTop: vs(8) }]}>
      <View style={{ width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', flex: 1 }}>
        <Text style={[styles.title, { fontSize: ms(28) }]}>{t('users.title')}</Text>
        <Text style={[styles.hint, { fontSize: ms(14), marginBottom: vs(14) }]}>
          {t('users.hint')}
        </Text>

        {error ? (
          <View style={[styles.errorBox, { borderRadius: ms(12), padding: s(12) }]}>
            <Text style={[styles.errorText, { fontSize: ms(14) }]}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={[styles.retry, { fontSize: ms(14) }]}>{t('users.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { gap: vs(10), paddingBottom: vs(24) }]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { fontSize: ms(15), marginTop: vs(40) }]}>
              {t('users.empty')}
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                { borderRadius: ms(16), padding: s(14) },
                item.id === currentUserId && styles.rowMe,
              ]}
            >
              <View style={[styles.rowTop, { marginBottom: vs(12) }]}>
                <View style={styles.nameBlock}>
                  <View
                    style={[
                      styles.dot,
                      {
                        width: s(10),
                        height: s(10),
                        borderRadius: s(5),
                        backgroundColor: item.online ? colors.ok : colors.muted,
                      },
                    ]}
                  />
                  <Text style={[styles.name, { fontSize: ms(17) }]} numberOfLines={1}>
                    {getDisplayName(item)}
                    {item.id === currentUserId ? ` ${t('users.you')}` : ''}
                  </Text>
                </View>
                <Text style={[styles.online, { fontSize: ms(12) }]}>
                  {item.online ? t('users.online') : t('users.offline')}
                </Text>
              </View>
              <View style={styles.metrics}>
                <Metric label={t('users.examples')} value={item.total} ms={ms} />
                <Metric label={t('users.correct')} value={item.correct} color={colors.ok} ms={ms} />
                <Metric
                  label={t('users.incorrect')}
                  value={item.incorrect}
                  color={colors.warn}
                  ms={ms}
                />
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
  ms,
}: {
  label: string;
  value: number;
  color?: string;
  ms: (n: number) => number;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { fontSize: ms(18) }, color ? { color } : null]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { fontSize: ms(12) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  hint: {
    color: colors.muted,
    marginTop: 4,
  },
  list: {},
  empty: {
    color: colors.muted,
    textAlign: 'center',
  },
  row: {
    backgroundColor: colors.panel,
  },
  rowMe: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  dot: {},
  name: {
    color: colors.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  online: {
    color: colors.muted,
  },
  metrics: {
    flexDirection: 'row',
  },
  metric: {
    flex: 1,
  },
  metricValue: {
    color: colors.text,
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.muted,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: colors.bgSoft,
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
