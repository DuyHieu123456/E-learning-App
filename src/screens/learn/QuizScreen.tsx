// QuizScreen — owner: Khanh
// End-of-course multiple-choice quiz (content from fetchQuizForCourse).
// The learner answers every question, submits, sees the score with
// per-question explanations, and the latest result is saved via
// AppStateContext (shown again on the Learning screen). Pass mark: 80%.
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import { useAppState } from '../../context/AppStateContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById, fetchQuizForCourse } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Quiz'>['route'];

const PASS_RATIO = 0.8;

export default function QuizScreen() {
  const route = useRoute<RouteProps>();
  const { courseId } = route.params;
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [warned, setWarned] = useState(false);

  const { data, loading, error, retry } = useAsyncData(async () => {
    const [course, quiz] = await Promise.all([fetchCourseById(courseId), fetchQuizForCourse(courseId)]);
    return { course, quiz };
  }, [courseId]);

  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error} onRetry={retry} />;
  const { course, quiz } = data;

  if (quiz.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>{t('learn.noQuiz')}</Text>
      </View>
    );
  }

  const correct = quiz.filter((q) => answers[q.id] === q.correctIndex).length;
  const allAnswered = quiz.every((q) => answers[q.id] !== undefined);
  const passed = correct / quiz.length >= PASS_RATIO;

  const submit = () => {
    if (!allAnswered) {
      setWarned(true);
      return;
    }
    setSubmitted(true);
    app.recordQuizScore({ courseId, correct, total: quiz.length, takenAt: Date.now() });
  };

  const retake = () => {
    setAnswers({});
    setSubmitted(false);
    setWarned(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{course?.title}</Text>
      <Text style={styles.hint}>{t('quiz.questionOf', { current: Object.keys(answers).length, total: quiz.length })}</Text>

      {submitted ? (
        <View style={[styles.resultCard, passed ? styles.resultPass : styles.resultFail]}>
          <Text style={styles.resultTitle}>
            {t('quiz.result')}: {t('quiz.score', { correct, total: quiz.length })}
          </Text>
          <Text style={styles.body}>{passed ? t('quiz.pass') : t('quiz.fail')}</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={retake}>
            <Text style={styles.secondaryText}>{t('quiz.retake')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {quiz.map((q, qi) => (
        <View key={q.id} style={styles.card}>
          <Text style={styles.bodyBold}>
            {qi + 1}. {q.question}
          </Text>
          {q.options.map((option, oi) => {
            const selected = answers[q.id] === oi;
            const isCorrect = q.correctIndex === oi;
            return (
              <TouchableOpacity
                key={oi}
                disabled={submitted}
                style={[
                  styles.option,
                  selected && styles.optionSelected,
                  submitted && isCorrect && styles.optionCorrect,
                  submitted && selected && !isCorrect && styles.optionWrong,
                ]}
                onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
              >
                <Text style={styles.body}>
                  {String.fromCharCode(65 + oi)}. {option}
                </Text>
              </TouchableOpacity>
            );
          })}
          {submitted ? (
            <Text style={styles.explanation}>
              {t('quiz.explanation')}: {q.explanation}
            </Text>
          ) : null}
        </View>
      ))}

      {!submitted ? (
        <View>
          {warned && !allAnswered ? <Text style={styles.warn}>{t('quiz.pickAnswer')}</Text> : null}
          <TouchableOpacity style={styles.submitBtn} onPress={submit}>
            <Text style={styles.submitText}>{t('quiz.submit')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    title: { ...typography.heading, color: c.text },
    hint: { color: c.textSecondary, fontSize: 12, marginTop: spacing.xs, marginBottom: spacing.md },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
    body: { color: c.text, fontSize: 14, lineHeight: 20 },
    bodyBold: { color: c.text, fontSize: 14, fontWeight: '600' },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    option: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.sm,
      padding: spacing.md,
      backgroundColor: c.background,
    },
    optionSelected: { borderColor: c.primary, borderWidth: 2 },
    optionCorrect: { borderColor: '#2E7D32', backgroundColor: 'rgba(46,125,50,0.12)' },
    optionWrong: { borderColor: c.danger, backgroundColor: 'rgba(229,57,53,0.10)' },
    explanation: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
    resultCard: { borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
    resultPass: { backgroundColor: 'rgba(46,125,50,0.15)' },
    resultFail: { backgroundColor: 'rgba(229,57,53,0.12)' },
    resultTitle: { ...typography.bodyBold, color: c.text, fontSize: 16 },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    secondaryText: { color: c.primaryDark, fontWeight: '700' },
    warn: { color: c.danger, marginBottom: spacing.sm },
    submitBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    submitText: { color: c.onPrimary, fontWeight: '700' },
  });
}
