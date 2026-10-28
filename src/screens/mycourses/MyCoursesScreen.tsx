// MyCoursesScreen — owner: Loc
// Shows ONLY the courses this user owns (bought through Cart checkout —
// PersistedState.purchasedCourseIds), grouped All / On Going / Completed.
// Progress % is derived live from completedLessonIds via AppStateContext,
// so completing a lesson in the Learning screen updates this list (and
// the Profile stats) immediately. Completed courses (100%) offer the
// certificate. Pull-to-refresh reloads the catalog.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import ProgressBar from '../../components/ProgressBar';
import { useAppState } from '../../context/AppStateContext';
import { useSettings } from '../../context/SettingsContext';
import { totalLessons } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { completedIdsFor, groupOf, progressPercentFor, purchasedCourses } from '../../utils/logic';
import type { MyCourseGroup } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GROUP_KEYS: { key: MyCourseGroup; labelKey: string }[] = [
  { key: 'all', labelKey: 'myCourses.all' },
  { key: 'ongoing', labelKey: 'myCourses.ongoing' },
  { key: 'completed', labelKey: 'myCourses.completed' },
];

export default function MyCoursesScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();
  const [group, setGroup] = useState<MyCourseGroup>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;

  const owned = purchasedCourses(app.state, courses);
  const counts: Record<MyCourseGroup, number> = {
    all: owned.length,
    ongoing: owned.filter((c) => groupOf(app.state, c) === 'ongoing').length,
    completed: owned.filter((c) => groupOf(app.state, c) === 'completed').length,
  };
  const visible = group === 'all' ? owned : owned.filter((c) => groupOf(app.state, c) === group);
  const onRefresh = () => {
    setRefreshing(true);
    retry();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{t('myCourses.title')}</Text>
          <View style={styles.segmentRow}>
            {GROUP_KEYS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.segment, group === g.key && styles.segmentActive]}
                onPress={() => setGroup(g.key)}
              >
                <Text style={[styles.segmentText, group === g.key && styles.segmentTextActive]}>
                  {t(g.labelKey)} ({counts[g.key]})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {owned.length === 0
            ? t('myCourses.emptyNone')
            : group === 'completed'
              ? t('myCourses.emptyCompleted')
              : t('myCourses.emptyOngoing')}
        </Text>
      }
      renderItem={({ item }) => {
        const percent = progressPercentFor(app.state, item);
        const doneCount = completedIdsFor(app.state, item.id).length;
        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardMain}
              onPress={() => navigation.navigate('Learning', { courseId: item.id })}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumbImg} contentFit="cover" />
              ) : (
                <View style={styles.thumb}>
                  <Text style={styles.thumbText}>{item.title.slice(0, 1)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.courseTitle}>{item.title}</Text>
                <Text style={styles.hint}>
                  {t('myCourses.lessonsOf', { done: doneCount, total: totalLessons(item) })}
                  {percent >= 100 ? `  ·  ✓ ${t('myCourses.doneBadge')}` : ''}
                </Text>
                <ProgressBar percent={percent} />
              </View>
            </TouchableOpacity>
            {percent >= 100 ? (
              <TouchableOpacity
                style={styles.certBtn}
                onPress={() => navigation.navigate('Certificate', { courseId: item.id })}
              >
                <Text style={styles.certText}>🏆 {t('myCourses.certBtn')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }}
    />
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: c.background },
    title: { ...typography.title, color: c.text, marginBottom: spacing.md },
    segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    segment: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
    },
    segmentActive: { backgroundColor: c.primary, borderColor: c.primary },
    segmentText: { color: c.text, fontWeight: '600', fontSize: 13 },
    segmentTextActive: { color: c.onPrimary },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardMain: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      backgroundColor: c.banner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbImg: { width: 56, height: 56, borderRadius: radius.sm },
    thumbText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    courseTitle: { fontWeight: '600', color: c.text },
    hint: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
    certBtn: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    certText: { color: c.primaryDark, fontWeight: '700' },
    empty: { color: c.textSecondary, marginTop: spacing.xl, textAlign: 'center', lineHeight: 20 },
  });
}
