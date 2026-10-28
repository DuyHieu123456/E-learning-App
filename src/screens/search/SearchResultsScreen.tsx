// SearchResultsScreen — owner: Khanh
// Real search + filters over the catalog (api.ts): keyword matches title
// AND description; filters for category, price band and minimum rating;
// four sort orders. All matching logic lives in filterCourses()
// (src/utils/logic.ts) — this screen only holds the filter UI state.
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import { useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCategories, fetchCourses } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { filterCourses } from '../../utils/logic';
import type { PriceBand, SortKey } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'SearchResults'>['route'];

const PRICE_KEYS: { key: PriceBand; labelKey: string }[] = [
  { key: 'all', labelKey: 'results.priceAll' },
  { key: 'under300', labelKey: 'results.priceUnder' },
  { key: 'b300to450', labelKey: 'results.priceMid' },
  { key: 'over450', labelKey: 'results.priceOver' },
];
const RATING_KEYS: { key: number; label: string }[] = [
  { key: 0, label: '' }, // label comes from results.ratingAll
  { key: 4.0, label: '4.0+' },
  { key: 4.5, label: '4.5+' },
];
const SORT_KEYS: { key: SortKey; labelKey: string }[] = [
  { key: 'popular', labelKey: 'results.sortPopular' },
  { key: 'rating', labelKey: 'results.sortRating' },
  { key: 'priceAsc', labelKey: 'results.sortPriceAsc' },
  { key: 'priceDesc', labelKey: 'results.sortPriceDesc' },
];

export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [text, setText] = useState(route.params?.query ?? '');
  const [categoryId, setCategoryId] = useState<string | undefined>(route.params?.categoryId);
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortKey>('popular');
  const [refreshing, setRefreshing] = useState(false);

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
  const onRefresh = () => {
    setRefreshing(true);
    retry();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <TextInput
            style={styles.input}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            returnKeyType="search"
          />

          <Text style={styles.groupLabel}>{t('results.category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TouchableOpacity style={chip(!categoryId)} onPress={() => setCategoryId(undefined)}>
              <Text style={chipText(!categoryId)}>{t('results.all')}</Text>
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

          <Text style={styles.groupLabel}>{t('results.price')}</Text>
          <View style={styles.chipRow}>
            {PRICE_KEYS.map((opt) => (
              <TouchableOpacity key={opt.key} style={chip(priceBand === opt.key)} onPress={() => setPriceBand(opt.key)}>
                <Text style={chipText(priceBand === opt.key)}>{t(opt.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.groupLabel}>{t('results.rating')}</Text>
          <View style={styles.chipRow}>
            {RATING_KEYS.map((opt) => (
              <TouchableOpacity key={opt.key} style={chip(minRating === opt.key)} onPress={() => setMinRating(opt.key)}>
                <Text style={chipText(minRating === opt.key)}>{opt.key === 0 ? t('results.ratingAll') : opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.groupLabel}>{t('results.sort')}</Text>
          <View style={styles.chipRow}>
            {SORT_KEYS.map((opt) => (
              <TouchableOpacity key={opt.key} style={chip(sort === opt.key)} onPress={() => setSort(opt.key)}>
                <Text style={chipText(sort === opt.key)}>{t(opt.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.count}>{t('results.count', { count: results.length })}</Text>
          {text.trim() ? <Text style={styles.hint}>{t('results.forQuery', { query: text.trim() })}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>{t('results.empty')}</Text>}
      renderItem={({ item }) => (
        <CourseCard
          course={item}
          onPress={(course) => navigation.navigate('CourseDetails', { courseId: course.id })}
        />
      )}
    />
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { padding: spacing.lg, backgroundColor: c.background },
    input: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    groupLabel: { ...typography.bodyBold, color: c.text, marginTop: spacing.md, marginBottom: spacing.sm },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { color: c.text, fontWeight: '600', fontSize: 13 },
    chipTextActive: { color: c.onPrimary },
    count: { ...typography.heading, color: c.text, marginTop: spacing.lg },
    hint: { color: c.textSecondary, marginBottom: spacing.md },
    empty: { color: c.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
  });
}
