// CartScreen — owner: Hieu (Duy)
// Real cart: reads PersistedState.cart through AppStateContext, joins it
// with the catalog to show titles/prices, supports removing items, and
// checkout MOVES the cart into purchasedCourseIds (the courses then
// appear in My Courses) and clears the cart. Checkout is an in-app
// simulation — no real payment is charged, and the UI says so.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import { useAppState } from '../../context/AppStateContext';
import { formatPrice, getTeacherById } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { cartCourses, cartTotals } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const app = useAppState();
  const [justBought, setJustBought] = useState<string[] | null>(null);
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;

  // ---- Success state right after checkout --------------------------------
  if (justBought) {
    return (
      <View style={styles.container}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.title}>Thanh toán thành công!</Text>
        <Text style={styles.body}>
          {justBought.length} khóa học đã được thêm vào My Courses của bạn. Đây là thanh toán mô
          phỏng trong app — không có khoản tiền thật nào bị trừ.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'MyCourses' })}
        >
          <Text style={styles.primaryText}>Đến My Courses</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = cartCourses(app.state, courses);
  const totals = cartTotals(app.state, courses);

  // ---- Empty state ---------------------------------------------------------
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.body}>
          Giỏ hàng đang trống. Hãy khám phá các khóa học ở trang Home và bấm “Add to cart” trong
          trang chi tiết khóa học.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Text style={styles.primaryText}>Khám phá khóa học</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---- Cart with items -----------------------------------------------------
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cart ({totals.count})</Text>

      {items.map((course) => {
        const teacher = getTeacherById(course.teacherId);
        return (
          <View key={course.id} style={styles.row}>
            <View style={styles.thumb}>
              <Text style={styles.thumbText}>{course.title.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              {teacher ? <Text style={styles.hint}>{teacher.name}</Text> : null}
              <Text style={styles.price}>
                {formatPrice(course.price)}{' '}
                <Text style={styles.original}>{formatPrice(course.originalPrice)}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => app.removeFromCart(course.id)}>
              <Text style={styles.remove}>✕ Xóa</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.body}>Giá gốc</Text>
          <Text style={styles.body}>{formatPrice(totals.originalTotal)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.body}>Giảm giá</Text>
          <Text style={[styles.body, styles.savings]}>−{formatPrice(totals.savings)}</Text>
        </View>
        <View style={[styles.sumRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{formatPrice(totals.subtotal)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => setJustBought(app.checkout())}>
        <Text style={styles.primaryText}>Checkout · {formatPrice(totals.subtotal)}</Text>
      </TouchableOpacity>
      <Text style={styles.note}>Thanh toán mô phỏng — khóa học sẽ xuất hiện ngay trong My Courses.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.md },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  hint: { color: colors.textSecondary, fontSize: 12 },
  successIcon: { fontSize: 48, textAlign: 'center', marginTop: spacing.xxl, marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.banner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  courseTitle: { fontWeight: '600', color: colors.text },
  price: { fontSize: 14, fontWeight: '700', color: colors.price, marginTop: 2 },
  original: { color: colors.textSecondary, fontWeight: '400', textDecorationLine: 'line-through' },
  remove: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  summary: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  savings: { color: colors.price, fontWeight: '700' },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  note: { color: colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
});
