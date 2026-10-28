// LessonPlayerScreen — owner: Khanh
// Plays a lesson's lecture video (expo-video) with native controls and a
// button to mark the lesson complete. Reached from the Learning screen
// for lessons that have a videoUrl; completion writes through
// AppStateContext like everywhere else.
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import { useAppState } from '../../context/AppStateContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { completedIdsFor } from '../../utils/logic';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'LessonPlayer'>['route'];

export default function LessonPlayerScreen() {
  const route = useRoute<RouteProps>();
  const { courseId, lessonId } = route.params;
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();

  const { data: course, loading, error, retry } = useAsyncData(() => fetchCourseById(courseId), [courseId]);
  const lesson = course?.chapters.flatMap((ch) => ch.lessons).find((l) => l.id === lessonId);

  const player = useVideoPlayer(lesson?.videoUrl ?? null, (p) => {
    p.loop = false;
  });

  if (loading) return <LoadingView />;
  if (error || !course) return <ErrorView message={error} onRetry={retry} />;
  if (!lesson) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>{t('details.notFound')}</Text>
      </View>
    );
  }

  const completed = completedIdsFor(app.state, courseId).includes(lessonId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {lesson.videoUrl ? (
        <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
      ) : (
        <View style={[styles.video, styles.noVideo]}>
          <Text style={styles.noVideoText}>{t('learn.noVideo')}</Text>
        </View>
      )}
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.hint}>
        {course.title} · {lesson.duration}
      </Text>
      <TouchableOpacity
        style={[styles.completeBtn, completed && styles.completeBtnDone]}
        onPress={() => app.toggleLessonComplete(courseId, lessonId)}
      >
        <Text style={styles.completeText}>
          {completed ? `✓ ${t('player.completed')}` : t('player.markComplete')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: radius.md },
    noVideo: { alignItems: 'center', justifyContent: 'center' },
    noVideoText: { color: '#fff' },
    title: { ...typography.heading, color: c.text, marginTop: spacing.lg },
    hint: { color: c.textSecondary, fontSize: 12, marginTop: spacing.xs },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
    completeBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    completeBtnDone: { backgroundColor: c.primaryDark },
    completeText: { color: c.onPrimary, fontWeight: '700' },
  });
}
