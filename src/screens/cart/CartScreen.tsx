// CartScreen — owner: Hieu (Duy)
// Real cart: reads PersistedState.cart through AppStateContext, joins it
// with the catalog to show titles/prices, supports removing items and a
// promo code, and checkout MOVES the cart into purchasedCourseIds (the
// courses then appear in My Courses), records an Order for the Profile
// history, and clears the cart. Checkout is an in-app simulation — no
// real payment is charged, and the UI says so.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import { newLocalId, useAppState } from '../../context/AppStateContext';
import { useSettings } from '../../context/SettingsContext';
import { formatPrice, getTeacherById } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { cartCourses, cartTotals, promoPercentFor } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();
  const [justBought, setJustBought] = useState<string[] | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | undefined>(undefined);
  const [promoError, setPromoError] = useState(false);
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;

  // ---- Success state right after checkout --------------------------------
  if (justBought) {
    return (
      <View style={styles.container}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.title}>{t('cart.successTitle')}</Text>
        <Text style={styles.body}>{t('cart.successBody', { count: justBought.length })}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'MyCourses' })}
        >
          <Text style={styles.primaryText}>{t('cart.toMyCourses')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = cartCourses(app.state, courses);
  const totals = cartTotals(app.state, courses, appliedCode);

  // ---- Empty state ---------------------------------------------------------
  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('cart.title')}</Text>
        <Text style={styles.body}>{t('cart.empty')}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
        >
          <Text style={styles.primaryText}>{t('cart.browse')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (promoPercentFor(code) > 0) {
      setAppliedCode(code);
      setPromoError(false);
    } else {
      setAppliedCode(undefined);
      setPromoError(true);
    }
  };

  const doCheckout = () => {
    const bought = app.checkout();
    app.addOrder({
      id: newLocalId('ord'),
      courseIds: bought,
      total: totals.payable,
      originalTotal: totals.originalTotal,
      ...(appliedCode ? { promoCode: appliedCode } : {}),
      createdAt: Date.now(),
    });
    setJustBought(bought);
  };

  // ---- Cart with items -----------------------------------------------------
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {t('cart.title')} ({totals.count})
      </Text>

      {items.map((course) => {
        const teacher = getTeacherById(course.teacherId);
        return (
          <View key={course.id} style={styles.row}>
            {course.thumbnail ? (
              <Image source={{ uri: course.thumbnail }} style={styles.thumbImg} contentFit="cover" />
            ) : (
              <View style={styles.thumb}>
                <Text style={styles.thumbText}>{course.title.slice(0, 1)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              {teacher ? <Text style={styles.hint}>{teacher.name}</Text> : null}
              <Text style={styles.price}>
                {formatPrice(course.price)}{' '}
                <Text style={styles.original}>{formatPrice(course.originalPrice)}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => app.removeFromCart(course.id)}>
              <Text style={styles.remove}>✕ {t('cart.remove')}</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <Text style={styles.promoLabel}>{t('cart.promoLabel')}</Text>
      <View style={styles.promoRow}>
        <TextInput
          style={styles.promoInput}
          placeholder={t('cart.promoPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={promoInput}
          onChangeText={setPromoInput}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.promoBtn} onPress={applyPromo}>
          <Text style={styles.primaryText}>{t('cart.apply')}</Text>
        </TouchableOpacity>
      </View>
      {appliedCode ? (
        <Text style={styles.promoOk}>
          {t('cart.promoApplied', { code: appliedCode, pct: promoPercentFor(appliedCode) })}
        </Text>
      ) : null}
      {promoError ? <Text style={styles.promoBad}>{t('cart.promoInvalid')}</Text> : null}

      <View style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.body}>{t('cart.originalTotal')}</Text>
          <Text style={styles.body}>{formatPrice(totals.originalTotal)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.body}>{t('cart.courseDiscount')}</Text>
          <Text style={[styles.body, styles.savings]}>−{formatPrice(totals.savings)}</Text>
        </View>
        {totals.promoDiscount > 0 ? (
          <View style={styles.sumRow}>
            <Text style={styles.body}>{t('cart.promoDiscount', { code: appliedCode ?? '' })}</Text>
            <Text style={[styles.body, styles.savings]}>−{formatPrice(totals.promoDiscount)}</Text>
          </View>
        ) : null}
        <View style={[styles.sumRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text style={styles.totalValue}>{formatPrice(totals.payable)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={doCheckout}>
        <Text style={styles.primaryText}>
          {t('cart.checkout')} · {formatPrice(totals.payable)}
        </Text>
      </TouchableOpacity>
      <Text style={styles.note}>{t('cart.checkoutNote')}</Text>
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: spacing.lg },
    scroll: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    title: { ...typography.title, color: c.text, marginBottom: spacing.md },
    body: { color: c.textSecondary, fontSize: 14, lineHeight: 20 },
    hint: { color: c.textSecondary, fontSize: 12 },
    successIcon: { fontSize: 48, textAlign: 'center', marginTop: spacing.xxl, marginBottom: spacing.md },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      backgroundColor: c.banner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbImg: { width: 56, height: 56, borderRadius: radius.sm },
    thumbText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    courseTitle: { fontWeight: '600', color: c.text },
    price: { fontSize: 14, fontWeight: '700', color: c.price, marginTop: 2 },
    original: { color: c.textSecondary, fontWeight: '400', textDecorationLine: 'line-through' },
    remove: { color: c.danger, fontWeight: '600', fontSize: 13 },
    promoLabel: { ...typography.bodyBold, color: c.text, marginTop: spacing.md, marginBottom: spacing.sm },
    promoRow: { flexDirection: 'row', gap: spacing.sm },
    promoInput: {
      flex: 1,
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    promoBtn: {
      backgroundColor: c.primaryDark,
      borderRadius: radius.sm,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    promoOk: { color: c.price, fontWeight: '600', marginTop: spacing.sm },
    promoBad: { color: c.danger, marginTop: spacing.sm },
    summary: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
    savings: { color: c.price, fontWeight: '700' },
    totalRow: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: spacing.sm },
    totalLabel: { fontSize: 16, fontWeight: '700', color: c.text },
    totalValue: { fontSize: 16, fontWeight: '800', color: c.text },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    primaryText: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
    note: { color: c.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.sm },
  });
}
