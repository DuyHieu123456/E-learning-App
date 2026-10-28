// DataState — shared loading / error placeholders for async screens.
// Same pattern as Lab06 (Loading / ErrorBox): every screen that loads
// catalog data shows one of these instead of a blank screen.
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSettings } from '../context/SettingsContext';
import type { Palette } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

export function LoadingView({ label }: { label?: string }) {
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{label ?? t('common.loading')}</Text>
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry: () => void;
}) {
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message ?? t('common.errorLoad')}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    text: { color: c.textSecondary, fontSize: 14, textAlign: 'center' },
    retryBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    retryText: { color: '#fff', fontWeight: '700' },
  });
}
