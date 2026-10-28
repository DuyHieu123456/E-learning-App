import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../context/SettingsContext';
import type { Palette } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

interface Props {
  percent: number; // 0–100
  showLabel?: boolean;
}

export default function ProgressBar({ percent, showLabel = true }: Props) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      {showLabel ? <Text style={styles.label}>{clamped}% Complete</Text> : null}
    </View>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    track: {
      height: 6,
      borderRadius: radius.sm,
      backgroundColor: c.border,
      overflow: 'hidden',
      marginTop: spacing.sm,
    },
    fill: { height: '100%', backgroundColor: c.primary, borderRadius: radius.sm },
    label: { color: c.textSecondary, fontSize: 12, marginTop: spacing.xs },
  });
}
