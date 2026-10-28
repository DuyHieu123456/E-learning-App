// UserProfileScreen — owner: Loc
// Real data throughout: the account comes from AuthContext (Supabase
// Auth / Google), and everything else from AppStateContext — Saved =
// courses the user actually bookmarked in Course Details; On Going /
// Completed are counted from owned courses by their real progress.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import SectionHeader from '../../components/SectionHeader';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { groupOf, purchasedCourses } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function UserProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const app = useAppState();
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;
  const savedCourses = courses.filter((c) => app.state.bookmarkedCourseIds.includes(c.id));
  const owned = purchasedCourses(app.state, courses);
  const ongoingCount = owned.filter((c) => groupOf(app.state, c) === 'ongoing').length;
  const completedCount = owned.filter((c) => groupOf(app.state, c) === 'completed').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(user?.name ?? '?').slice(0, 1).toUpperCase()}</Text>
      </View>
      {user ? (
        <View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.title}>{user.email}</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => void signOut()}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={styles.name}>Khách</Text>
          <Text style={styles.title}>Bạn chưa đăng nhập</Text>
          <View style={styles.authRow}>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Đăng nhập bằng Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{savedCourses.length}</Text>
          <Text style={styles.hint}>Save</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{ongoingCount}</Text>
          <Text style={styles.hint}>On Going</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.hint}>Completed</Text>
        </View>
      </View>

      <SectionHeader title="Saved courses" />
      {savedCourses.length === 0 ? (
        <Text style={styles.hint}>
          Chưa có khóa học nào được lưu. Mở một khóa học và bấm “Lưu” (bookmark) để nó xuất hiện tại
          đây.
        </Text>
      ) : null}
      {savedCourses.map((course) => (
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
  content: { padding: spacing.lg },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.banner,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { ...typography.title, color: colors.text, textAlign: 'center', marginTop: spacing.md },
  title: { color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  authRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  loginText: { color: '#fff', fontWeight: '700' },
  logoutBtn: { alignSelf: 'center', marginTop: spacing.md },
  logoutText: { color: '#D92D20', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.xl },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  hint: { color: colors.textSecondary, fontSize: 12 },
});
