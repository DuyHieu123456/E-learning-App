// CartScreen — owner: Hieu (Duy)
// Day-26 skeleton: placeholder. The real cart reads PersistedState.cart
// (see src/storage/storage.ts) and is wired up in week 2 of the plan.
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function CartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cart</Text>
      <Text style={styles.body}>
        Your cart is empty for now. Items added from Course Details will be stored in
        PersistedState (AsyncStorage) and listed here.
      </Text>
      {/* TODO(week 2): loadPersistedState() -> list cart courses + total + checkout (simulated). */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
});
