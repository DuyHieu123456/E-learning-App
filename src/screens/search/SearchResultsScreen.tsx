// SearchResultsScreen — owner: Khanh
// Real search + filters over the catalog (api.ts): keyword matches title
// AND description; filters for category, price band and minimum rating;
// four sort orders. All matching logic lives in filterCourses()
// (src/utils/logic.ts) — this screen only holds the filter UI state.
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCategories, fetchCourses } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { filterCourses } from '../../utils/logic';
import type { PriceBand, SortKey } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'SearchResults'>['route'];

const PRICE_OPTIONS: { key: PriceBand; label: string }[] = [
  { key: 'all', label: 'Mọi giá' },
  { key: 'under300', label: 'Dưới 300K' },
  { key: 'b300to450', label: '300–450K' },
  { key: 'over450', label: 'Trên 450K' },
];
const RATING_OPTIONS: { key: number; label: string }[] = [
  { key: 0, label: 'Mọi rating' },
  { key: 4.0, label: '4.0+' },
  { key: 4.5, label: '4.5+' },
];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'popular', label: 'Phổ biến' },
  { key: 'rating', label: 'Đánh giá cao' },
  { key: 'priceAsc', label: 'Giá tăng dần' },
  { key: 'priceDesc', label: 'Giá giảm dần' },
];

export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const [text, setText] = useState(route.params?.query ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(route.params?.categoryId);
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>('popular');

  const { data, loading, error, retry } = useAsyncData(async () => {
    const [courses, categories] = await Promise.all([fetchCourses(), fetchCategories()]);
    return { courses, categories };
  });

  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error} onRetry={retry} />;
  const { courses, categories } = data;

  const results = filterCourses(courses, { query: text, categoryId, priceBand, minRating, sort });

  const chip = (active: boolean) => [styles.chip, active && styles.chipActive];
  const chipText = (active: boolean) => [styles.chipText, active && styles.chipTextActive];

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View>
          <TextInput
            style={styles.input}
            placeholder="Search course"
            value={text}
            onChangeText={setText}
            returnKeyType="search"
          />

          <Text style={styles.groupLabel}>Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TouchableOpacity style={chip(!categoryId)} onPress={() => setCategoryId(undefined)}>
              <Text style={chipText(!categoryId)}>Tất cả</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={chip(categoryId === cat.id)}
                onPress={() => setCategoryId(categoryId === cat.id ? undefined : cat.id)}
              >
                <Text style={chipText(categoryId === cat.id)}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.groupLabel}>Giá</Text>
          <View style={styles.chipRow}>
            {PRICE_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.key} style={chip(priceBand === opt.key)} onPress={() => setPriceBand(opt.key)}>
                <Text style={chipText(priceBand === opt.key)}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.groupLabel}>Đánh giá</Text>
          <View style={styles.chipRow}>
            {RATING_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.key} style={chip(minRating === opt.key)} onPress={() => setMinRating(opt.key)}>
                <Text style={chipText(minRating === opt.key)}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.groupLabel}>Sắp xếp</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.key} style={chip(sort === opt.key)} onPress={() => setSort(opt.key)}>
                <Text style={chipText(sort === opt.key)}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.count}>{results.length} Results</Text>
          {text.trim() ? <Text style={styles.hint}>for “{text.trim()}”</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Không có khóa học nào khớp bộ lọc. Thử từ khóa hoặc bộ lọc khác.</Text>
      }
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  groupLabel: { ...typography.bodyBold, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  count: { ...typography.heading, color: colors.text, marginTop: spacing.lg },
  hint: { color: colors.textSecondary, marginBottom: spacing.md },
  empty: { color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
});
