import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../context/SettingsContext';

interface Props {
  rating: number; // 0–5
  ratingCount?: number;
}

// Star rating rendered with real icons (full / half / outline).
export default function RatingStars({ rating, ratingCount }: Props) {
  const { colors } = useSettings();
  const stars = [1, 2, 3, 4, 5].map((i) => {
    if (rating >= i - 0.25) return 'star';
    if (rating >= i - 0.75) return 'star-half';
    return 'star-outline';
  });
  return (
    <View style={styles.row}>
      <View style={styles.starsRow}>
        {stars.map((name, idx) => (
          <Ionicons key={idx} name={name as never} size={13} color={colors.star} />
        ))}
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {rating.toFixed(1)}
        {ratingCount !== undefined ? ` (${ratingCount})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starsRow: { flexDirection: 'row', gap: 1 },
  label: { fontSize: 12 },
});
