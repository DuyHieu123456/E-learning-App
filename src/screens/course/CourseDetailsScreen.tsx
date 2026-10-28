// CourseDetailsScreen — owner: Hieu (Duy)
// The "not yet bought" view: internal tabs Overview / Lessons / Review.
// (The "already learning" view is a separate route: Learning — do not merge.)
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import RatingStars from '../../components/RatingStars';
import { discountPercent, formatPrice, getChapters } from '../../data/mockData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById, fetchReviewsForCourse, fetchTeacherById } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'CourseDetails'>['route'];
type Tab = 'overview' | 'lessons' | 'review';

export default function CourseDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const [tab, setTab] = useState<Tab>('overview');

  const course = fetchCourseById(route.params.courseId);
  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Course not found.</Text>
      </View>
    );
  }
  const teacher = fetchTeacherById(course.teacherId);
  const reviews = fetchReviewsForCourse(course.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{course.title}</Text>
      </View>

      <Text style={styles.title}>{course.title}</Text>
      <RatingStars rating={course.rating} ratingCount={course.ratingCount} />

      <View style={styles.tabRow}>
        {(['overview', 'lessons', 'review'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.toUpperCase()}</Text>
            {tab === t ? <View style={styles.tabUnderline} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' && (
        <View>
          {teacher ? (
            <TouchableOpacity
              style={styles.teacherRow}
              onPress={() => navigation.navigate('TeacherProfile', { teacherId: teacher.id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{teacher.name.slice(0, 1)}</Text>
              </View>
              <View>
                <Text style={styles.teacherName}>{teacher.name}</Text>
                <Text style={styles.teacherTitle}>{teacher.title}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.body}>{course.description}</Text>
          <Text style={styles.sectionTitle}>Benefits</Text>
          {course.benefits.map((b) => (
            <Text key={b} style={styles.body}>
              • {b}
            </Text>
          ))}
        </View>
      )}

      {tab === 'lessons' &&
        getChapters(course).map((chapter) => (
          <View key={chapter.id} style={styles.chapter}>
            <Text style={styles.sectionTitle}>
              {chapter.order} - {chapter.title}
            </Text>
            {chapter.lessons.map((lesson, idx) => (
              <View key={lesson.id} style={styles.lessonRow}>
                <Text style={styles.lessonNo}>{String(idx + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.body}>{lesson.title}</Text>
                  <Text style={styles.hint}>{lesson.duration} mins</Text>
                </View>
                <Text style={styles.hint}>
                  {lesson.status === 'completed' ? '✓' : lesson.status === 'current' ? '▶' : '🔒'}
                </Text>
              </View>
            ))}
          </View>
        ))}

      {tab === 'review' && (
        <View>
          <Text style={styles.sectionTitle}>
            {course.rating.toFixed(1)}/5 ({course.ratingCount}+ reviews)
          </Text>
          {reviews.length === 0 ? (
            <Text style={styles.hint}>No reviews yet for this course.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <Text style={styles.teacherName}>{review.author}</Text>
                <RatingStars rating={review.rating} />
                <Text style={styles.body}>{review.comment}</Text>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{formatPrice(course.price)}</Text>
          <Text style={styles.hint}>
            {discountPercent(course)}% Disc. {formatPrice(course.originalPrice)}
          </Text>
        </View>
        {/* TODO(week 2): persist the cart item via storage.savePersistedState()
            before navigating — for the Day-26 skeleton we just open Cart. */}
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.addText}>Add to cart</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
  hero: {
    backgroundColor: colors.banner,
    borderRadius: radius.lg,
    padding: spacing.xl,
    minHeight: 140,
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  title: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.primary },
  tabUnderline: { height: 2, backgroundColor: colors.primary, alignSelf: 'stretch', marginTop: spacing.xs },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.textSecondary, fontSize: 12 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  teacherName: { fontWeight: '600', color: colors.text },
  teacherTitle: { color: colors.textSecondary, fontSize: 12 },
  chapter: { marginBottom: spacing.sm },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lessonNo: { color: colors.textSecondary, fontWeight: '600' },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  price: { fontSize: 18, fontWeight: '800', color: colors.text },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  addText: { color: '#fff', fontWeight: '700' },
});
