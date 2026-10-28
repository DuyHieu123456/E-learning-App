// SearchScreen — owner: Khanh
// Day-26 skeleton: input + submit -> SearchResults{query};
// hot topics / categories -> SearchResults{categoryId}.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import SectionHeader from '../../components/SectionHeader';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCategories } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HOT_TOPICS = ['Java', 'SQL', 'Javascript', 'Python', 'Digital marketing', 'Photoshop', 'Watercolor'];

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const { data: categories, loading, error, retry } = useAsyncData(() => fetchCategories());

  if (loading) return <LoadingView />;
  if (error || !categories) return <ErrorView message={error} onRetry={retry} />;

  const submit = () => {
    navigation.navigate('SearchResults', { query: query.trim() || undefined });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search course"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.filterBtn} onPress={submit}>
          <Text style={styles.filterText}>Search</Text>
        </TouchableOpacity>
      </View>

      <SectionHeader title="Hot topics" />
      <View style={styles.chipWrap}>
        {HOT_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic}
            style={styles.chip}
            onPress={() => navigation.navigate('SearchResults', { query: topic })}
          >
            <Text style={styles.chipText}>{topic}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionHeader title="Categories" />
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.categoryRow}
          onPress={() => navigation.navigate('SearchResults', { categoryId: cat.id })}
        >
          <Text style={styles.categoryText}>{cat.name}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filterBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  filterText: { color: '#fff', fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.primaryDark, fontWeight: '600' },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoryText: { fontWeight: '600', color: colors.text },
  chevron: { color: colors.textSecondary, fontSize: 18 },
});
