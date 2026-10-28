// SearchScreen — owner: Khanh
// Input + submit -> SearchResults{query}; hot topics / categories ->
// SearchResults{categoryId}. Hot topics are aligned with the real
// catalog: every topic listed here returns at least one course.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import SectionHeader from '../../components/SectionHeader';
import { useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCategories } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Every topic must match at least one real course title/description.
const HOT_TOPICS = ['UX', 'Python', 'Java', 'SQL', 'Figma', 'Marketing', 'Photography', 'Watercolor'];

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.filterBtn} onPress={submit}>
          <Text style={styles.filterText}>{t('search.button')}</Text>
        </TouchableOpacity>
      </View>

      <SectionHeader title={t('search.hotTopics')} />
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

      <SectionHeader title={t('search.categories')} />
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

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    searchRow: { flexDirection: 'row', gap: spacing.sm },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    filterBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    filterText: { color: c.onPrimary, fontWeight: '700' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    chipText: { color: c.primaryDark, fontWeight: '600' },
    categoryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    categoryText: { fontWeight: '600', color: c.text },
    chevron: { color: c.textSecondary, fontSize: 18 },
  });
}
