// OnboardingScreen — shown ONCE on first launch (SettingsContext
// hasOnboarded). Three swipeable slides introducing the app; Skip or the
// final button marks onboarding as done and the entry gate moves on to
// the Login screen (with guest skip) / main app.
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { useSettings } from '../../context/SettingsContext';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const { width } = Dimensions.get('window');

const SLIDES = [
  { icon: 'phone-portrait-outline', titleKey: 'onboarding.s1Title', bodyKey: 'onboarding.s1Body' },
  { icon: 'time-outline', titleKey: 'onboarding.s2Title', bodyKey: 'onboarding.s2Body' },
  { icon: 'trophy-outline', titleKey: 'onboarding.s3Title', bodyKey: 'onboarding.s3Body' },
] as const;

export default function OnboardingScreen() {
  const { colors, completeOnboarding } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // RN's current typings type the ScrollView ref unusually; `any` keeps
  // the pager ref simple (only scrollTo is used).
  const scrollRef = useRef<any>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (last) completeOnboarding();
    else scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.titleKey} style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={slide.icon as never} size={64} color={colors.onPrimary} />
            </View>
            <Text style={styles.title}>{t(slide.titleKey)}</Text>
            <Text style={styles.body}>{t(slide.bodyKey)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.titleKey} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={next}>
        <Text style={styles.primaryText}>{last ? t('onboarding.start') : t('onboarding.next')}</Text>
      </TouchableOpacity>
      {!last ? (
        <TouchableOpacity onPress={completeOnboarding}>
          <Text style={styles.link}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingBottom: spacing.xl },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    iconCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: c.banner,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxl,
    },
    title: { ...typography.title, color: c.text, textAlign: 'center', marginBottom: spacing.md },
    body: { color: c.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.lg },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
    dotActive: { backgroundColor: c.primary, width: 22 },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginHorizontal: spacing.lg,
    },
    primaryText: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
    link: { color: c.primary, fontWeight: '600', textAlign: 'center', marginTop: spacing.md },
  });
}
