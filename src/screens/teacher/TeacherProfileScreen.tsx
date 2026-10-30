// TeacherProfileScreen — owner: Loc
// Teacher info (real avatar image) + their courses from the catalog,
// with a working Follow button (persisted on-device via AppStateContext).
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import RatingStars from '../../components/RatingStars';
import SectionHeader from '../../components/SectionHeader';
import { useAppState } from '../../context/AppStateContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses, fetchTeacherById } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'TeacherProfile'>['route'];

export default function TeacherProfileScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();
  const requireAuth = useRequireAuth();
  const [avatarError, setAvatarError] = useState(false);
  const { data, loading, error, retry } = useAsyncData(async () => {
    const found = await fetchTeacherById(route.params.teacherId);
    if (!found) return null;
    const all = await fetchCourses();
    return { teacher: found, courses: all.filter((c) => c.teacherId === found.id) };
  }, [route.params.teacherId]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>{t('teacher.notFound')}</Text>
      </View>
    );
  }
  const { teacher, courses } = data;
  const following = app.isFollowing(teacher.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {teacher.avatar && !avatarError ? (
        <Image
          source={{ uri: teacher.avatar }}
          style={styles.avatarImg}
          contentFit="cover"
          onError={() => setAvatarError(true)}
        />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{teacher.name.slice(0, 1)}</Text>
        </View>
      )}
      <Text style={styles.name}>{teacher.name}</Text>
      <Text style={styles.title}>{teacher.title}</Text>
      <View style={styles.starsRow}>
        <RatingStars rating={teacher.rating} />
      </View>
      <Text style={styles.hint}>
        {t('teacher.meta', { students: teacher.students.toLocaleString(), count: courses.length })}
      </Text>
      <TouchableOpacity
        style={[styles.followBtn, following && styles.followBtnActive]}
        onPress={() => { if (requireAuth()) app.toggleFollow(teacher.id); }}
      >
        <Text style={[styles.followText, following && styles.followTextActive]}>
          {following ? `✓ ${t('teacher.following')}` : `+ ${t('teacher.follow')}`}
        </Text>
      </TouchableOpacity>

      <SectionHeader title={t('teacher.courses')} />
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onPress={(c) => navigation.navigate('CourseDetails', { courseId: c.id })}
        />
      ))}
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg, alignItems: 'stretch' },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: spacing.lg,
    },
    avatarImg: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center', marginTop: spacing.lg },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    name: { ...typography.title, color: c.text, textAlign: 'center', marginTop: spacing.md },
    title: { color: c.textSecondary, textAlign: 'center', marginTop: 2 },
    starsRow: { alignItems: 'center', marginTop: spacing.xs },
    hint: { color: c.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
    followBtn: {
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 999,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      marginTop: spacing.md,
    },
    followBtnActive: { backgroundColor: c.primary },
    followText: { color: c.primaryDark, fontWeight: '700' },
    followTextActive: { color: c.onPrimary },
  });
}
