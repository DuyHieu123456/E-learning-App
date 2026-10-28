import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  rating: number; // 0–5
  ratingCount?: number;
}

// Simple text-star rating (no icon library in the skeleton yet).
export default function RatingStars({ rating, ratingCount }: Props) {
  const full = Math.round(rating);
  const stars = '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  return (
    <View style={styles.row}>
      <Text style={styles.stars}>{stars}</Text>
      <Text style={styles.label}>
        {rating.toFixed(1)}
        {ratingCount !== undefined ? ` (${ratingCount})` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stars: { color: colors.star, fontSize: 13 },
  label: { color: colors.textSecondary, fontSize: 12 },
});
