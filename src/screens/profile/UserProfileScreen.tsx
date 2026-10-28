// UserProfileScreen — owner: Loc
// Day-26 skeleton: current user + stats placeholders + saved courses list.
// Week 2: saved list comes from PersistedState.bookmarkedCourseIds.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import SectionHeader from '../../components/SectionHeader';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/spacing';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function UserProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;
  // Skeleton placeholder: first two courses stand in for "saved" courses.
  const savedCourses = courses.slice(0, 2);

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
              <Text style={styles.loginText}>Đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerText}>Đăng ký</Text>
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
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.hint}>On Going</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.hint}>Completed</Text>
        </View>
      </View>

      <SectionHeader title="Saved courses" />
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
  registerBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  registerText: { color: colors.primary, fontWeight: '700' },
  logoutBtn: { alignSelf: 'center', marginTop: spacing.md },
  logoutText: { color: '#D92D20', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.xl },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  hint: { color: colors.textSecondary, fontSize: 12 },
});
