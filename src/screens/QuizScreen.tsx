import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { reportAnswer } from '../cloud';
import type { MathProblem, UserStats } from '../types';
import { generateProblem } from '../utils/math';
import { colors } from '../theme';

type Props = {
  user: UserStats;
  onStatsUpdated: (user: UserStats) => void;
};

export function QuizScreen({ user, onStatsUpdated }: Props) {
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
      <View style={styles.statsRow}>
        <Stat label="Всего" value={user.total} />
        <Stat label="Верно" value={user.correct} tone="ok" />
        <Stat label="Ошибки" value={user.incorrect} tone="bad" />
      </View>

      <View style={styles.card}>
        <Text style={styles.caption}>Решите пример</Text>
        <Text style={styles.problem}>{problem.display}</Text>

        <TextInput
          style={styles.input}
          value={answer}
          onChangeText={setAnswer}
          keyboardType="number-pad"
          placeholder="Ответ"
          placeholderTextColor={colors.muted}
          editable={!busy}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={submit}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Проверить</Text>
        </Pressable>

        {feedback === 'ok' ? (
          <Text style={[styles.feedback, { color: colors.ok }]}>Верно!</Text>
        ) : null}
        {feedback === 'bad' ? (
          <Text style={[styles.feedback, { color: colors.warn }]}>
            Неверно. Ответ: {problem.answer}
          </Text>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'bad';
}) {
  const color =
    tone === 'ok' ? colors.ok : tone === 'bad' ? colors.warn : colors.text;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 22,
    padding: 22,
    gap: 14,
  },
  caption: {
    color: colors.muted,
    fontSize: 15,
  },
  problem: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.bg,
    fontSize: 18,
    fontWeight: '700',
  },
  feedback: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
