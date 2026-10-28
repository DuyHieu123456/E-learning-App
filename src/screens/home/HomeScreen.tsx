// HomeScreen — owner: Hieu (Duy)
// Day-26 skeleton: greeting, categories, courses, teachers from local data.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import SectionHeader from '../../components/SectionHeader';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCategories, fetchCourses, fetchTeachers } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const app = useAppState();
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
  const firstName = user?.name.trim().split(' ').slice(-1)[0];
  const cartCount = app.state.cart.length;

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Hello{firstName ? `, ${firstName}` : ''}!</Text>
              <Text style={styles.sub}>What do you want to learn today?</Text>
            </View>
            <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
              <Text style={styles.cartText}>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>PROJECT MANAGEMENT</Text>
            <Text style={styles.bannerOff}>20% OFF</Text>
          </View>

          <SectionHeader title="Categories" />
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

          <SectionHeader title="Popular courses" />
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
          <SectionHeader title="Top teachers" />
          {teachers.map((teacher) => (
            <TouchableOpacity
              key={teacher.id}
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
          ))}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...typography.title, color: colors.text },
  sub: { color: colors.textSecondary, marginTop: 2 },
  cartBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  cartText: { color: '#fff', fontWeight: '700' },
  banner: {
    backgroundColor: colors.banner,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  bannerTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  bannerOff: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.text, fontWeight: '600' },
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  teacherName: { fontWeight: '600', color: colors.text },
  teacherTitle: { color: colors.textSecondary, fontSize: 12 },
});
