// TeacherProfileScreen — owner: Loc
// Day-26 skeleton: teacher info + their courses (tab set comes later).
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import RatingStars from '../../components/RatingStars';
import SectionHeader from '../../components/SectionHeader';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses, fetchTeacherById } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'TeacherProfile'>['route'];

export default function TeacherProfileScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
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
        <Text style={styles.empty}>Teacher not found.</Text>
      </View>
    );
  }
  const { teacher, courses } = data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{teacher.name.slice(0, 1)}</Text>
      </View>
      <Text style={styles.name}>{teacher.name}</Text>
      <Text style={styles.title}>{teacher.title}</Text>
      <RatingStars rating={teacher.rating} />
      <Text style={styles.hint}>{teacher.students.toLocaleString()} students</Text>

      <SectionHeader title="Courses" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'stretch' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { ...typography.title, color: colors.text, textAlign: 'center', marginTop: spacing.md },
  title: { color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  hint: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
});
