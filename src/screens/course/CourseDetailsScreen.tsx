// CourseDetailsScreen — owner: Hieu (Duy)
// The "not yet bought" view: internal tabs Overview / Lessons / Review.
// (The "already learning" view is a separate route: Learning — do not merge.)
//
// Real behaviour:
// - Bookmark button toggles PersistedState.bookmarkedCourseIds (shows up
//   in Profile > Saved courses); Share button shares the course.
// - Lessons tab derives each lesson's status from real progress
//   (deriveLessonStatus), it is NOT read from the catalog data.
// - Review tab merges catalog reviews with reviews written on this
//   device (editable/deletable), recomputes the average including the
//   user's own reviews, and shows the star distribution.
// - Footer button is state-aware: Add to cart -> (in cart) View cart ->
//   after checkout it becomes "Start learning" (Go to Learning).
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import RatingStars from '../../components/RatingStars';
import { newLocalId, useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useDisplayName, useSettings } from '../../context/SettingsContext';
import { discountPercent, formatPrice, getChapters } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById, fetchReviewsForCourse, fetchTeacherById } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  aggregateRating,
  completedIdsFor,
  deriveLessonStatus,
  mergeReviews,
  ratingDistribution,
} from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'CourseDetails'>['route'];
type Tab = 'overview' | 'lessons' | 'review';

export default function CourseDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const author = useDisplayName(user?.name);
  const [tab, setTab] = useState<Tab>('overview');
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [heroError, setHeroError] = useState(false);

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
        <Text style={styles.empty}>{t('details.notFound')}</Text>
      </View>
    );
  }
  const { course, teacher } = data;
  const reviews = mergeReviews(data.reviews, app.state, course.id);
  const live = aggregateRating(course, app.state.myReviews);
  const distribution = ratingDistribution(reviews);
  const lessonStatus = deriveLessonStatus(course, completedIdsFor(app.state, course.id));
  const bookmarked = app.isBookmarked(course.id);
  const purchased = app.isPurchased(course.id);
  const inCart = app.isInCart(course.id);

  const submitReview = () => {
    if (!requireAuth()) return;
    const text = myComment.trim();
    if (!text) return;
    if (editingId) {
      app.updateReview(editingId, myRating, text);
      setEditingId(null);
    } else {
      app.addReview({
        id: newLocalId('my-r'),
        courseId: course.id,
        author,
        rating: myRating,
        comment: text,
      });
    }
    setMyComment('');
    setMyRating(5);
  };

  const startEdit = (id: string, rating: number, comment: string) => {
    setEditingId(id);
    setMyRating(rating);
    setMyComment(comment);
  };

  const shareCourse = () => {
    void Share.share({
      message: t('details.shareText', { title: course.title, price: formatPrice(course.price) }),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {course.thumbnail && !heroError ? (
        <Image
          source={{ uri: course.thumbnail }}
          style={styles.heroImg}
          contentFit="cover"
          onError={() => setHeroError(true)}
        />
      ) : (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{course.title}</Text>
        </View>
      )}

      <View style={styles.titleRow}>
        <Text style={[styles.title, { flex: 1 }]}>{course.title}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => { if (requireAuth()) app.toggleBookmark(course.id); }}>
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={bookmarked ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={shareCourse}>
          <Ionicons name="share-social-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <RatingStars rating={course.rating} ratingCount={course.ratingCount} />

      <View style={styles.tabRow}>
        {(['overview', 'lessons', 'review'] as Tab[]).map((tb) => (
          <TouchableOpacity key={tb} onPress={() => setTab(tb)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === tb && styles.tabTextActive]}>
              {t(`details.${tb === 'review' ? 'review' : tb}`)}
            </Text>
            {tab === tb ? <View style={styles.tabUnderline} /> : null}
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
              {teacher.avatar ? (
                <Image source={{ uri: teacher.avatar }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{teacher.name.slice(0, 1)}</Text>
                </View>
              )}
              <View>
                <Text style={styles.teacherName}>{teacher.name}</Text>
                <Text style={styles.teacherTitle}>{teacher.title}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.sectionTitle}>{t('details.description')}</Text>
          <Text style={styles.body}>{course.description}</Text>
          <Text style={styles.sectionTitle}>{t('details.benefits')}</Text>
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
                  {lesson.videoUrl ? (
                    <Ionicons name="play-circle-outline" size={18} color={colors.primary} style={styles.videoIcon} />
                  ) : null}
                  <Ionicons
                    name={
                      status === 'completed'
                        ? 'checkmark-circle'
                        : status === 'current'
                          ? 'play-circle'
                          : 'lock-closed'
                    }
                    size={18}
                    color={status === 'locked' ? colors.textSecondary : colors.primary}
                  />
                </View>
              );
            })}
          </View>
        ))}

      {tab === 'review' && (
        <View>
          <Text style={styles.sectionTitle}>
            {live.average.toFixed(1)}/5 ({live.count}+)
          </Text>
          <Text style={styles.hint}>{t('details.liveRating', { avg: live.average.toFixed(1), count: live.count })}</Text>
          <Text style={[styles.hint, { marginTop: spacing.sm }]}>{t('details.distribution')}</Text>
          {distribution.map((count, i) => (
            <View key={i} style={styles.distRow}>
              <Text style={styles.hint}>{5 - i}★</Text>
              <View style={styles.distTrack}>
                <View
                  style={[
                    styles.distFill,
                    { width: `${reviews.length ? Math.round((count / reviews.length) * 100) : 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.hint}>{count}</Text>
            </View>
          ))}

          <View style={{ marginTop: spacing.md }}>
            {reviews.length === 0 ? (
              <Text style={styles.hint}>{t('details.noReviews')}</Text>
            ) : (
              reviews.map((review) => {
                const mine = review.id.startsWith('my-r');
                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHead}>
                      <Text style={styles.teacherName}>
                        {review.author}
                        {mine ? `  ·  ${t('details.yourReviewTag')}` : ''}
                      </Text>
                      {mine ? (
                        <View style={styles.reviewActions}>
                          <TouchableOpacity onPress={() => startEdit(review.id, review.rating, review.comment)}>
                            <Text style={styles.actionText}>{t('common.edit')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => app.removeReview(review.id)}>
                            <Text style={[styles.actionText, { color: colors.danger }]}>{t('common.delete')}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                    <RatingStars rating={review.rating} />
                    <Text style={styles.body}>{review.comment}</Text>
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.sectionTitle}>{t('details.writeReview')}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setMyRating(n)}>
                <Ionicons name={n <= myRating ? 'star' : 'star-outline'} size={28} color={colors.star} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder={t('details.reviewPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={myComment}
            onChangeText={setMyComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitBtn, !myComment.trim() && styles.submitBtnDisabled]}
            onPress={submitReview}
            disabled={!myComment.trim()}
          >
            <Text style={styles.submitText}>{editingId ? t('details.saveReview') : t('details.sendReview')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <View>
          <Text style={styles.price}>{formatPrice(course.price)}</Text>
          <Text style={styles.hint}>
            {t('details.discount', { pct: discountPercent(course) })} · {formatPrice(course.originalPrice)}
          </Text>
        </View>
        {purchased ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('Learning', { courseId: course.id })}
          >
            <Text style={styles.addText}>{t('details.goLearn')}</Text>
          </TouchableOpacity>
        ) : inCart ? (
          <TouchableOpacity style={[styles.addBtn, styles.inCartBtn]} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.addText}>{t('details.inCart')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => { if (requireAuth()) app.addToCart(course.id); }}>
            <Text style={styles.addText}>{t('details.addToCart')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
    hero: {
      backgroundColor: c.banner,
      borderRadius: radius.lg,
      padding: spacing.xl,
      minHeight: 140,
      justifyContent: 'flex-end',
      marginBottom: spacing.lg,
    },
    heroImg: { width: '100%', height: 190, borderRadius: radius.lg, marginBottom: spacing.lg },
    heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    title: { ...typography.heading, color: c.text, marginBottom: spacing.sm },
    iconBtn: { padding: spacing.xs },
    tabRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tabBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
    tabText: { color: c.textSecondary, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: c.primary },
    tabUnderline: { height: 2, backgroundColor: c.primary, alignSelf: 'stretch', marginTop: spacing.xs },
    sectionTitle: { ...typography.bodyBold, color: c.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    body: { color: c.text, fontSize: 14, lineHeight: 20 },
    hint: { color: c.textSecondary, fontSize: 12 },
    teacherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImg: { width: 44, height: 44, borderRadius: 22 },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    teacherName: { fontWeight: '600', color: c.text },
    teacherTitle: { color: c.textSecondary, fontSize: 12 },
    chapter: { marginBottom: spacing.sm },
    lessonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    lessonNo: { color: c.textSecondary, fontWeight: '600' },
    videoIcon: { marginRight: -spacing.xs },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
    distTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' },
    distFill: { height: '100%', backgroundColor: c.star },
    reviewCard: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: 4,
    },
    reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewActions: { flexDirection: 'row', gap: spacing.md },
    actionText: { color: c.primaryDark, fontWeight: '600', fontSize: 13 },
    starRow: { flexDirection: 'row', gap: spacing.xs },
    reviewInput: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 64,
      marginTop: spacing.sm,
      textAlignVertical: 'top',
    },
    submitBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitText: { color: c.onPrimary, fontWeight: '700' },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    price: { fontSize: 18, fontWeight: '800', color: c.text },
    addBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    inCartBtn: { backgroundColor: c.primaryDark },
    addText: { color: c.onPrimary, fontWeight: '700' },
  });
}
