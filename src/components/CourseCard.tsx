import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatPrice, getTeacherById, totalLessons } from '../data/mockData';
import type { Course } from '../data/types';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import RatingStars from './RatingStars';

interface Props {
  course: Course;
  onPress?: (course: Course) => void;
}

// Shared course row/card used by Home, Search Results, Teacher Profile, Profile.
// Day-26 skeleton: text-first (thumbnail URLs are empty in mock data for now).
export default function CourseCard({ course, onPress }: Props) {
  const teacher = getTeacherById(course.teacherId);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(course)} activeOpacity={0.7}>
      <View style={styles.thumb}>
        <Text style={styles.thumbText}>{course.title.slice(0, 1)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        {teacher ? <Text style={styles.teacher}>{teacher.name}</Text> : null}
        <Text style={styles.price}>{formatPrice(course.price)}</Text>
        <View style={styles.metaRow}>
          <RatingStars rating={course.rating} ratingCount={course.ratingCount} />
          <Text style={styles.meta}>{totalLessons(course)} lessons</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.banner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  teacher: { fontSize: 12, color: colors.textSecondary },
  price: { fontSize: 14, fontWeight: '700', color: colors.price },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: colors.textSecondary },
});
