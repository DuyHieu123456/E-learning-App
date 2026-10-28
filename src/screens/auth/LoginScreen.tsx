// LoginScreen — đăng nhập CHỈ bằng Google (Supabase Auth, OAuth).
// Không có form đăng ký và không có mật khẩu: lần đầu đăng nhập bằng
// Google, Supabase tự tạo tài khoản. Khách vẫn xem được app; màn này chỉ
// mở khi người dùng tự bấm đăng nhập (từ tab Profile). Đăng nhập xong
// quay lại màn trước đó.
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { AuthError } from '../../services/auth';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await signInWithGoogle();
      if (!signedIn) return; // người dùng tự hủy ở màn chọn tài khoản Google
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('MainTabs');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Đăng nhập thất bại. Thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chào mừng bạn</Text>
      <Text style={styles.sub}>
        Đăng nhập bằng tài khoản Google để đồng bộ trải nghiệm học. Chưa có tài khoản? Không cần đăng ký —
        lần đầu đăng nhập Google sẽ tự tạo tài khoản cho bạn.
      </Text>

      <TouchableOpacity
        style={[styles.googleBtn, submitting && styles.btnDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.googleG}>G</Text>
        <Text style={styles.googleText}>{submitting ? 'Đang mở Google…' : 'Đăng nhập bằng Google'}</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Để sau — tiếp tục xem với tư cách khách</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: { ...typography.title, color: colors.text },
  sub: { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 20 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.6 },
  googleG: { color: '#4285F4', fontWeight: '800', fontSize: 18 },
  googleText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  error: { color: '#D92D20', marginTop: spacing.md, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg },
});
