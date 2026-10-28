import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSettings } from '../context/SettingsContext';
import type { Palette } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface Props {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export default function SectionHeader({ title, actionLabel, onActionPress }: Props) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },
    title: { ...typography.heading, color: c.text },
    action: { color: c.primary, fontSize: 13, fontWeight: '600' },
  });
}
