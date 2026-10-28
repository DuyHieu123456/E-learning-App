// HomeScreen — owner: Hieu (Duy)
// Greeting (real account name), data-driven promo banner (the course
// with the biggest real discount), categories, continue-learning for
// in-progress purchases, popular courses, top teachers, cart shortcut
// with a live badge. Pull-to-refresh reloads the catalog from Supabase.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import ProgressBar from '../../components/ProgressBar';
import SectionHeader from '../../components/SectionHeader';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useDisplayName, useSettings } from '../../context/SettingsContext';
import { discountPercent, totalLessons } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCategories, fetchCourses, fetchTeachers } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { completedIdsFor, progressPercentFor, purchasedCourses } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const displayName = useDisplayName(user?.name);
  const app = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, error, retry } = useAsyncData(async () => {
    const [categories, courses, teachers] = await Promise.all([
      fetchCategories(),
      fetchCourses(),
      fetchTeachers(),
    ]);
    return { categories, courses, teachers };
  });

  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error} onRetry={retry} />;
  const { categories, teachers } = data;
  // "Popular" = most enrolled/rated first (ratingCount from the catalog).
  const courses = data.courses.slice().sort((a, b) => b.ratingCount - a.ratingCount);
  const cartCount = app.state.cart.length;

  // Promo banner = the real course with the deepest discount right now.
  const bannerCourse = data.courses
    .slice()
    .sort((a, b) => discountPercent(b) - discountPercent(a))[0];
  // Continue learning = purchased courses that are started but not done.
  const continuing = purchasedCourses(app.state, data.courses)
    .map((course) => ({ course, percent: progressPercentFor(app.state, course) }))
    .filter((x) => x.percent > 0 && x.percent < 100);

  const onRefresh = () => {
    setRefreshing(true);
    retry();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>
                {user ? t('home.greeting', { name: displayName.split(' ').slice(-1)[0] }) : t('home.greetingGuest')}
              </Text>
              <Text style={styles.sub}>{t('home.sub')}</Text>
            </View>
            <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
              <Ionicons name="cart-outline" size={24} color={colors.onPrimary} />
              {cartCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          {bannerCourse ? (
            <TouchableOpacity
              style={styles.banner}
              onPress={() => navigation.navigate('CourseDetails', { courseId: bannerCourse.id })}
            >
              <Text style={styles.bannerTitle} numberOfLines={1}>
                {bannerCourse.title.toUpperCase()}
              </Text>
              <Text style={styles.bannerOff}>{t('home.off', { pct: discountPercent(bannerCourse) })}</Text>
            </TouchableOpacity>
          ) : null}

          {continuing.length > 0 ? (
            <View>
              <SectionHeader title={t('home.continueLearning')} />
              {continuing.map(({ course, percent }) => (
                <TouchableOpacity
                  key={course.id}
                  style={styles.continueCard}
                  onPress={() => navigation.navigate('Learning', { courseId: course.id })}
                >
                  {course.thumbnail ? (
                    <Image source={{ uri: course.thumbnail }} style={styles.continueImg} contentFit="cover" />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.continueTitle} numberOfLines={1}>
                      {course.title}
                    </Text>
                    <Text style={styles.hint}>
                      {t('learn.completedOf', {
                        done: completedIdsFor(app.state, course.id).length,
                        total: totalLessons(course),
                      })}
                    </Text>
                    <ProgressBar percent={percent} showLabel={false} />
                  </View>
                  <Ionicons name="play-circle" size={30} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <SectionHeader title={t('home.categories')} />
          <View style={styles.chipWrap}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.chip}
                onPress={() => navigation.navigate('SearchResults', { categoryId: cat.id })}
              >
                <Text style={styles.chipText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionHeader title={t('home.popular')} />
        </View>
      }
      renderItem={({ item }) => (
        <CourseCard
          course={item}
          onPress={(course) => navigation.navigate('CourseDetails', { courseId: course.id })}
        />
      )}
      ListFooterComponent={
        <View>
          <SectionHeader title={t('home.topTeachers')} />
          {teachers.map((teacher) => (
            <TouchableOpacity
              key={teacher.id}
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
          ))}
        </View>
      }
    />
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: c.background },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { ...typography.title, color: c.text },
    sub: { color: c.textSecondary, marginTop: 2 },
    cartBtn: {
      backgroundColor: c.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: c.danger,
      borderRadius: 9,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    banner: {
      backgroundColor: c.banner,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: spacing.lg,
    },
    bannerTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
    bannerOff: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: spacing.xs },
    continueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    continueImg: { width: 52, height: 52, borderRadius: radius.sm },
    continueTitle: { fontWeight: '600', color: c.text },
    hint: { color: c.textSecondary, fontSize: 12 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
    },
    chipText: { color: c.text, fontWeight: '600' },
    teacherRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
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
  });
}
