// SearchResultsScreen — owner: Khanh
// Day-26 skeleton: simple filter of mockCourses by query and/or categoryId.
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'SearchResults'>['route'];

export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { query, categoryId } = route.params ?? {};
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;

  const results = courses.filter((course) => {
    if (categoryId && course.categoryId !== categoryId) return false;
    if (query && !course.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <Text style={styles.count}>{results.length} Results</Text>
          {query ? <Text style={styles.hint}>for “{query}”</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No courses match. Try another keyword.</Text>}
      renderItem={({ item }) => (
        <CourseCard
          course={item}
          onPress={(course) => navigation.navigate('CourseDetails', { courseId: course.id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.background },
  count: { ...typography.heading, color: colors.text },
  hint: { color: colors.textSecondary, marginBottom: spacing.md },
  empty: { color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
});
