import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { reportAnswer } from '../cloud';
import { useT } from '../i18n';
import { useLayout } from '../layout';
import type { MathProblem, UserStats } from '../types';
import { generateProblem } from '../utils/math';
import { colors } from '../theme';

type Props = {
  user: UserStats;
  onStatsUpdated: (user: UserStats) => void;
};

export function QuizScreen({ user, onStatsUpdated }: Props) {
  const { ms, vs, s, padH, contentMaxWidth, isCompact } = useLayout();
  const t = useT();
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem());
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
      setAnswer('');
      setProblem(generateProblem());
      setBusy(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function submit() {
    if (busy || answer.trim() === '') return;

    const value = Number(answer.trim().replace(',', '.'));
    if (Number.isNaN(value)) return;

    const isCorrect = value === problem.answer;
    setBusy(true);
    setFeedback(isCorrect ? 'ok' : 'bad');

    try {
      const updated = await reportAnswer(user.id, isCorrect);
      onStatsUpdated(updated);
    } catch {
      onStatsUpdated({
        ...user,
        total: user.total + 1,
        correct: user.correct + (isCorrect ? 1 : 0),
        incorrect: user.incorrect + (isCorrect ? 0 : 1),
      });
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: padH,
            paddingTop: vs(8),
            paddingBottom: vs(16),
            alignItems: 'center',
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={{ width: '100%', maxWidth: contentMaxWidth }}>
          <View style={[styles.statsRow, { gap: s(10), marginBottom: vs(16) }]}>
            <Stat label={t('quiz.total')} value={user.total} ms={ms} vs={vs} />
            <Stat label={t('quiz.correct')} value={user.correct} tone="ok" ms={ms} vs={vs} />
            <Stat label={t('quiz.errors')} value={user.incorrect} tone="bad" ms={ms} vs={vs} />
          </View>

          <View
            style={[
              styles.card,
              {
                borderRadius: ms(22),
                padding: vs(isCompact ? 16 : 22),
                gap: vs(12),
              },
            ]}
          >
            <Text style={[styles.caption, { fontSize: ms(15) }]}>
              {t('quiz.solve')}
            </Text>
            <Text
              style={[
                styles.problem,
                { fontSize: ms(isCompact ? 34 : 42) },
              ]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.6}
            >
              {problem.display}
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  borderRadius: ms(14),
                  paddingHorizontal: s(16),
                  paddingVertical: vs(14),
                  fontSize: ms(28),
                },
              ]}
              value={answer}
              onChangeText={setAnswer}
              keyboardType="number-pad"
              placeholder={t('quiz.answer')}
              placeholderTextColor={colors.muted}
              editable={!busy}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
            />

            <Pressable
              style={[
                styles.button,
                {
                  borderRadius: ms(14),
                  paddingVertical: vs(16),
                },
                busy && styles.buttonDisabled,
              ]}
              onPress={submit}
              disabled={busy}
            >
              <Text style={[styles.buttonText, { fontSize: ms(18) }]}>
                {t('quiz.check')}
              </Text>
            </Pressable>

            {feedback === 'ok' ? (
              <Text style={[styles.feedback, { color: colors.ok, fontSize: ms(16) }]}>
                {t('quiz.ok')}
              </Text>
            ) : null}
            {feedback === 'bad' ? (
              <Text style={[styles.feedback, { color: colors.warn, fontSize: ms(16) }]}>
                {t('quiz.bad', { answer: problem.answer })}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Stat({
  label,
  value,
  tone,
  ms,
  vs,
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'bad';
  ms: (n: number) => number;
  vs: (n: number) => number;
}) {
  const color =
    tone === 'ok' ? colors.ok : tone === 'bad' ? colors.warn : colors.text;
  return (
    <View style={[styles.stat, { borderRadius: ms(14), paddingVertical: vs(12) }]}>
      <Text style={[styles.statValue, { color, fontSize: ms(22) }]}>{value}</Text>
      <Text style={[styles.statLabel, { fontSize: ms(12) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    color: colors.muted,
  },
  card: {
    backgroundColor: colors.panel,
  },
  caption: {
    color: colors.muted,
  },
  problem: {
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.bg,
    fontWeight: '700',
  },
  feedback: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
