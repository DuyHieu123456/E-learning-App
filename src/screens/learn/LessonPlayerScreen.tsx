// LessonPlayerScreen — owner: Khanh
// Plays a lesson's lecture video (expo-video) with native controls and a
// button to mark the lesson complete. Reached from the Learning screen
// for lessons that have a videoUrl; completion writes through
// AppStateContext like everywhere else.
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import { useAppState } from '../../context/AppStateContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRequireAuth } from '../../hooks/useRequireAuth';
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
  const requireAuth = useRequireAuth();

  const { data: course, loading, error, retry } = useAsyncData(() => fetchCourseById(courseId), [courseId]);
  const lesson = course?.chapters.flatMap((ch) => ch.lessons).find((l) => l.id === lessonId);

  const player = useVideoPlayer(lesson?.videoUrl ?? null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 5;
  });
  // Surface playback failures (dead URL, no network) instead of a silent
  // black box — this is how the gtv-videos-bucket 403 was first spotted.
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  // --- Video resume ---------------------------------------------------
  // The last watched position lives in personal state (lessonPositions,
  // synced per account like the rest). The live position is tracked in
  // a ref (no re-renders), persisted when playback pauses and when the
  // screen unmounts, and sought back once the player is ready.
  // Finishing the video clears it, so a rewatch starts from 0.
  const appRef = useRef(app);
  appRef.current = app;
  const positionRef = useRef(0);
  const seekedRef = useRef(false);
  const savedPosition = app.state.lessonPositions[lessonId] ?? 0;

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    positionRef.current = currentTime;
  });
  useEventListener(player, 'statusChange', ({ status: next }) => {
    if (next !== 'readyToPlay' || seekedRef.current) return;
    seekedRef.current = true;
    const target = appRef.current.state.lessonPositions[lessonId] ?? 0;
    const duration = player.duration;
    if (target > 5 && Number.isFinite(duration) && target < duration - 5) {
      player.currentTime = target;
    }
  });
  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    if (!isPlaying) appRef.current.setLessonPosition(lessonId, positionRef.current);
  });
  useEventListener(player, 'playToEnd', () => {
    positionRef.current = 0;
    appRef.current.setLessonPosition(lessonId, 0);
  });
  useEffect(() => {
    return () => {
      appRef.current.setLessonPosition(lessonId, positionRef.current);
    };
  }, [lessonId]);

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
        status === 'error' ? (
          <View style={[styles.video, styles.noVideo]}>
            <Text style={styles.noVideoText}>{t('player.loadError')}</Text>
          </View>
        ) : (
          <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
        )
      ) : (
        <View style={[styles.video, styles.noVideo]}>
          <Text style={styles.noVideoText}>{t('learn.noVideo')}</Text>
        </View>
      )}
      {lesson.videoUrl && savedPosition > 5 ? (
        <Text style={styles.hint}>{t('player.resumedFrom', { time: formatClock(savedPosition) })}</Text>
      ) : null}
      <Text style={styles.title}>{lesson.title}</Text>
      <Text style={styles.hint}>
        {course.title} · {lesson.duration}
      </Text>
      <TouchableOpacity
        style={[styles.completeBtn, completed && styles.completeBtnDone]}
        onPress={() => { if (requireAuth()) app.toggleLessonComplete(courseId, lessonId); }}
      >
        <Text style={styles.completeText}>
          {completed ? `✓ ${t('player.completed')}` : t('player.markComplete')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
