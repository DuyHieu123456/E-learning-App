import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

interface Props {
  percent: number; // 0–100
  showLabel?: boolean;
}

export default function ProgressBar({ percent, showLabel = true }: Props) {
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

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.sm },
  label: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs },
});
