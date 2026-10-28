// MyCoursesScreen — owner: Loc
// Day-26 skeleton: all courses with a progress bar.
// Progress % is derived from completedLessonIds (never stored as a number).
// Skeleton uses a small sample set of completed lessons for the first course
// so the bar is visible; week 2 loads the real ids from AsyncStorage.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ProgressBar from '../../components/ProgressBar';
import { courseProgressPercent } from '../../data/mockData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Sample progress for the skeleton demo only (first 2 lessons of the UX course).
const SAMPLE_COMPLETED: Record<string, string[]> = {
  'c-ux-research': ['ux-l1', 'ux-l2'],
};

export default function MyCoursesScreen() {
  const navigation = useNavigation<Nav>();
  const courses = fetchCourses();

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={<Text style={styles.title}>My Courses</Text>}
      renderItem={({ item }) => {
        const percent = courseProgressPercent(item, SAMPLE_COMPLETED[item.id] ?? []);
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
  title: { ...typography.title, color: colors.text, marginBottom: spacing.lg },
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
});
