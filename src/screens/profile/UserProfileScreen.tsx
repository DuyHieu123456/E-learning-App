// UserProfileScreen — owner: Loc
// Day-26 skeleton: current user + stats placeholders + saved courses list.
// Week 2: saved list comes from PersistedState.bookmarkedCourseIds.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import SectionHeader from '../../components/SectionHeader';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses, fetchCurrentUser } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function UserProfileScreen() {
  const navigation = useNavigation<Nav>();
  const user = fetchCurrentUser();
  // Skeleton placeholder: first two courses stand in for "saved" courses.
  const savedCourses = fetchCourses().slice(0, 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.name.slice(0, 1)}</Text>
      </View>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.title}>UX/UI Designer</Text>

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
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.xl },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  hint: { color: colors.textSecondary, fontSize: 12 },
});
