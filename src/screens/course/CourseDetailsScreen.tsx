// CourseDetailsScreen — owner: Hieu (Duy)
// The "not yet bought" view: internal tabs Overview / Lessons / Review.
// (The "already learning" view is a separate route: Learning — do not merge.)
//
// Real behaviour:
// - Bookmark button toggles PersistedState.bookmarkedCourseIds (shows up
//   in Profile > Saved courses).
// - Lessons tab derives each lesson's status from real progress
//   (deriveLessonStatus), it is NOT read from the catalog data.
// - Review tab merges catalog reviews with reviews written on this
//   device, and has a working write-a-review form.
// - Footer button is state-aware: Add to cart -> (in cart) View cart ->
//   after checkout it becomes "Vào học ngay" (Go to Learning).
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import RatingStars from '../../components/RatingStars';
import { newLocalId, useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { discountPercent, formatPrice, getChapters } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById, fetchReviewsForCourse, fetchTeacherById } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { completedIdsFor, deriveLessonStatus, mergeReviews } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'CourseDetails'>['route'];
type Tab = 'overview' | 'lessons' | 'review';

export default function CourseDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const app = useAppState();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');

  const { data, loading, error, retry } = useAsyncData(async () => {
    const found = await fetchCourseById(route.params.courseId);
    if (!found) return null;
    const [teacher, reviews] = await Promise.all([
      fetchTeacherById(found.teacherId),
      fetchReviewsForCourse(found.id),
    ]);
    return { course: found, teacher, reviews };
  }, [route.params.courseId]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Course not found.</Text>
      </View>
    );
  }
  const { course, teacher } = data;
  const reviews = mergeReviews(data.reviews, app.state, course.id);
  const lessonStatus = deriveLessonStatus(course, completedIdsFor(app.state, course.id));
  const bookmarked = app.isBookmarked(course.id);
  const purchased = app.isPurchased(course.id);
  const inCart = app.isInCart(course.id);

  const submitReview = () => {
    const text = myComment.trim();
    if (!text) return;
    app.addReview({
      id: newLocalId('my-r'),
      courseId: course.id,
      author: user?.name ?? 'Bạn',
      rating: myRating,
      comment: text,
    });
    setMyComment('');
    setMyRating(5);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{course.title}</Text>
      </View>

      <View style={styles.titleRow}>
        <Text style={[styles.title, { flex: 1 }]}>{course.title}</Text>
        <TouchableOpacity
          style={[styles.bookmarkBtn, bookmarked && styles.bookmarkBtnActive]}
          onPress={() => app.toggleBookmark(course.id)}
        >
          <Text style={[styles.bookmarkText, bookmarked && styles.bookmarkTextActive]}>
            {bookmarked ? '♥ Đã lưu' : '♡ Lưu'}
          </Text>
        </TouchableOpacity>
      </View>
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
            {chapter.lessons.map((lesson, idx) => {
              const status = lessonStatus.get(lesson.id) ?? 'locked';
              return (
                <View key={lesson.id} style={styles.lessonRow}>
                  <Text style={styles.lessonNo}>{String(idx + 1).padStart(2, '0')}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.body}>{lesson.title}</Text>
                    <Text style={styles.hint}>{lesson.duration} mins</Text>
                  </View>
                  <Text style={styles.hint}>{status === 'completed' ? '✓' : status === 'current' ? '▶' : '🔒'}</Text>
                </View>
              );
            })}
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
                <Text style={styles.teacherName}>
                  {review.author}
                  {review.id.startsWith('my-r') ? '  ·  Đánh giá của bạn' : ''}
                </Text>
                <RatingStars rating={review.rating} />
                <Text style={styles.body}>{review.comment}</Text>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Viết đánh giá của bạn</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setMyRating(n)}>
                <Text style={[styles.starPick, n <= myRating && styles.starPickActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder="Chia sẻ cảm nhận về khóa học…"
            value={myComment}
            onChangeText={setMyComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitBtn, !myComment.trim() && styles.submitBtnDisabled]}
            onPress={submitReview}
            disabled={!myComment.trim()}
          >
            <Text style={styles.submitText}>Gửi đánh giá</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{formatPrice(course.price)}</Text>
          <Text style={styles.hint}>
            {discountPercent(course)}% Disc. {formatPrice(course.originalPrice)}
          </Text>
        </View>
        {purchased ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('Learning', { courseId: course.id })}
          >
            <Text style={styles.addText}>Vào học ngay</Text>
          </TouchableOpacity>
        ) : inCart ? (
          <TouchableOpacity style={[styles.addBtn, styles.inCartBtn]} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.addText}>✓ Trong giỏ — Xem giỏ</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => app.addToCart(course.id)}>
            <Text style={styles.addText}>Add to cart</Text>
          </TouchableOpacity>
        )}
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
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  title: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  bookmarkBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bookmarkBtnActive: { backgroundColor: colors.primary },
  bookmarkText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  bookmarkTextActive: { color: '#fff' },
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
  starRow: { flexDirection: 'row', gap: spacing.xs },
  starPick: { fontSize: 28, color: colors.border },
  starPickActive: { color: colors.star },
  reviewInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 64,
    marginTop: spacing.sm,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '700' },
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
  inCartBtn: { backgroundColor: colors.primaryDark },
  addText: { color: '#fff', fontWeight: '700' },
});
