// MyCoursesScreen — owner: Loc
// Shows ONLY the courses this user owns (bought through Cart checkout —
// PersistedState.purchasedCourseIds), grouped All / On Going / Completed.
// Progress % is derived live from completedLessonIds via AppStateContext,
// so completing a lesson in the Learning screen updates this list (and
// the Profile stats) immediately. An owned course counts as "On Going"
// until it reaches 100%, then it moves to Completed.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import ProgressBar from '../../components/ProgressBar';
import { useAppState } from '../../context/AppStateContext';
import { totalLessons } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { completedIdsFor, groupOf, progressPercentFor, purchasedCourses } from '../../utils/logic';
import type { MyCourseGroup } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const GROUPS: { key: MyCourseGroup; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ongoing', label: 'On Going' },
  { key: 'completed', label: 'Completed' },
];

export default function MyCoursesScreen() {
  const navigation = useNavigation<Nav>();
  const app = useAppState();
  const [group, setGroup] = useState<MyCourseGroup>('all');
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

  return (
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>My Courses</Text>
          <View style={styles.segmentRow}>
            {GROUPS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.segment, group === g.key && styles.segmentActive]}
                onPress={() => setGroup(g.key)}
              >
                <Text style={[styles.segmentText, group === g.key && styles.segmentTextActive]}>
                  {g.label} ({counts[g.key]})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {owned.length === 0
            ? 'Bạn chưa mua khóa học nào.\nKhám phá khóa học ở tab Home, thêm vào giỏ và checkout — khóa học sẽ xuất hiện tại đây.'
            : group === 'completed'
              ? 'Chưa có khóa học nào hoàn thành 100%. Cố lên!'
              : 'Không có khóa học nào đang học dở.'}
        </Text>
      }
      renderItem={({ item }) => {
        const percent = progressPercentFor(app.state, item);
        const doneCount = completedIdsFor(app.state, item.id).length;
        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Learning', { courseId: item.id })}
          >
            <View style={styles.thumb}>
              <Text style={styles.thumbText}>{item.title.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{item.title}</Text>
              <Text style={styles.hint}>
                {doneCount}/{totalLessons(item)} bài học
                {percent >= 100 ? '  ·  ✓ Hoàn thành' : ''}
              </Text>
              <ProgressBar percent={percent} />
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  segment: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#fff' },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.banner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  courseTitle: { fontWeight: '600', color: colors.text },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  empty: { color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center', lineHeight: 20 },
});
