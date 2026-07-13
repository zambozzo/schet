import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { upsertUserProfile } from '../cloud';
import { useI18n } from '../i18n';
import { useLayout } from '../layout';
import type { AppLanguage, UserStats } from '../types';
import { colors } from '../theme';

const NICKNAME_MAX = 24;

type Props = {
  user: UserStats;
  onBack: () => void;
  onUserUpdated: (user: UserStats) => void;
};

export function SettingsScreen({ user, onBack, onUserUpdated }: Props) {
  const { ms, vs, s, padH, contentMaxWidth } = useLayout();
  const { t, language, setLanguage } = useI18n();
  const [nickname, setNickname] = useState(user.nickname?.trim() || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNickname(user.nickname?.trim() || '');
  }, [user.nickname]);

  async function handleLanguage(next: AppLanguage) {
    if (next === language) return;
    await setLanguage(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const trimmed = nickname.trim().slice(0, NICKNAME_MAX);
      const updated = await upsertUserProfile({
        id: user.id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        nickname: trimmed || null,
      });
      onUserUpdated(updated);
      onBack();
    } catch (e) {
      Alert.alert(
        t('settings.title'),
        e instanceof Error ? e.message : t('settings.saveError'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingHorizontal: padH, paddingBottom: vs(8) }]}>
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={[styles.back, { fontSize: ms(15) }]}>{t('settings.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { fontSize: ms(20) }]}>{t('settings.title')}</Text>
        <View style={{ width: s(64) }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: padH,
            paddingBottom: vs(24),
            alignItems: 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View
          style={[
            styles.card,
            {
              width: '100%',
              maxWidth: contentMaxWidth,
              borderRadius: ms(16),
              padding: s(16),
              gap: vs(14),
            },
          ]}
        >
          <View style={{ gap: vs(6) }}>
            <Text style={[styles.label, { fontSize: ms(13) }]}>
              {t('settings.nickname')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderRadius: ms(12),
                  paddingHorizontal: s(14),
                  paddingVertical: vs(12),
                  fontSize: ms(16),
                },
              ]}
              value={nickname}
              onChangeText={(text) => setNickname(text.slice(0, NICKNAME_MAX))}
              placeholder={t('settings.nicknamePlaceholder')}
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={NICKNAME_MAX}
              editable={!saving}
            />
          </View>

          <View style={{ gap: vs(8) }}>
            <Text style={[styles.label, { fontSize: ms(13) }]}>
              {t('settings.language')}
            </Text>
            <View style={[styles.segment, { borderRadius: ms(12), gap: s(8) }]}>
              <LangChip
                label={t('settings.languageRu')}
                active={language === 'ru'}
                onPress={() => handleLanguage('ru')}
                ms={ms}
                vs={vs}
              />
              <LangChip
                label={t('settings.languageEn')}
                active={language === 'en'}
                onPress={() => handleLanguage('en')}
                ms={ms}
                vs={vs}
              />
            </View>
            <Text style={[styles.hint, { fontSize: ms(12) }]}>
              {t('settings.languageHint')}
            </Text>
          </View>

          <Pressable
            style={[
              styles.saveBtn,
              {
                borderRadius: ms(12),
                paddingVertical: vs(14),
                marginTop: vs(4),
              },
              saving && styles.saveDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={[styles.saveText, { fontSize: ms(16) }]}>
                {t('settings.save')}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function LangChip({
  label,
  active,
  onPress,
  ms,
  vs,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  ms: (n: number) => number;
  vs: (n: number) => number;
}) {
  return (
    <Pressable
      style={[
        styles.chip,
        { paddingVertical: vs(10), borderRadius: ms(10) },
        active && styles.chipActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          { fontSize: ms(14) },
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    color: colors.accent,
    fontWeight: '700',
    width: 64,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
  },
  content: {
    flexGrow: 1,
    paddingTop: 8,
  },
  card: {
    backgroundColor: colors.panel,
  },
  label: {
    color: colors.muted,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
  },
  chip: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.muted,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.bg,
  },
  hint: {
    color: colors.muted,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: colors.bg,
    fontWeight: '700',
  },
});
