// LoginScreen — đăng nhập CHỈ bằng Google (Supabase Auth, OAuth).
// Không có form đăng ký và không có mật khẩu: lần đầu đăng nhập bằng
// Google, Supabase tự tạo tài khoản. Màn này là CỔNG VÀO MỀM: lần đầu mở
// app (sau onboarding) nó hiện trước, nhưng luôn có nút "Vào với tư cách
// khách" — khách xem được toàn bộ app, đăng nhập chỉ để cá nhân hóa.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import type { RootStackParamList } from '../../navigation/types';
import { AuthError } from '../../services/auth';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, skipAsGuest, guestSkipped } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return; // người dùng tự hủy ở màn chọn tài khoản Google
      // In the full app (opened from Profile) go back; at the entry gate
      // there is nothing to go back to — the gate lifts by itself once
      // `user` is set and RootNavigator re-renders.
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : t('login.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const continueAsGuest = () => {
    skipAsGuest();
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
      <Image source={require('../../../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>{t('login.welcome')}</Text>
      <Text style={styles.sub}>{t('login.sub')}</Text>

      <TouchableOpacity
        style={[styles.googleBtn, submitting && styles.btnDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.googleG}>G</Text>
        <Text style={styles.googleText}>{submitting ? t('login.opening') : t('login.google')}</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity onPress={continueAsGuest}>
        <Text style={styles.link}>{guestSkipped ? t('login.later') : t('login.skipGuest')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: spacing.lg },
    logo: { width: 84, height: 84, borderRadius: 20, alignSelf: 'center', marginTop: spacing.xxl, marginBottom: spacing.lg },
    title: { ...typography.title, color: c.text, textAlign: 'center' },
    sub: { color: c.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 20, textAlign: 'center' },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      marginTop: spacing.md,
    },
    btnDisabled: { opacity: 0.6 },
    googleG: { color: '#4285F4', fontWeight: '800', fontSize: 18 },
    googleText: { color: c.text, fontWeight: '700', fontSize: 15 },
    error: { color: c.danger, marginTop: spacing.md, lineHeight: 20 },
    link: { color: c.primary, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg },
  });
}
