// CertificateScreen — shown when a purchased course reaches 100%.
// Renders a certificate card in-app and can export the same design to a
// PDF (expo-print) and share/save it (expo-sharing).
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useDisplayName, useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { progressPercentFor } from '../../utils/logic';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Certificate'>['route'];

export default function CertificateScreen() {
  const route = useRoute<RouteProps>();
  const { courseId } = route.params;
  const { colors, language } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();
  const { user } = useAuth();
  const name = useDisplayName(user?.name);
  const [sharing, setSharing] = useState(false);

  const { data: course, loading, error, retry } = useAsyncData(() => fetchCourseById(courseId), [courseId]);

  if (loading) return <LoadingView />;
  if (error || !course) return <ErrorView message={error} onRetry={retry} />;

  const order = app.state.orders.find((o) => o.courseIds.includes(courseId));
  const date = new Date(order?.createdAt ?? Date.now()).toLocaleDateString(
    language === 'vi' ? 'vi-VN' : 'en-US',
  );
  const complete = progressPercentFor(app.state, course) >= 100;

  const sharePdf = async () => {
    setSharing(true);
    try {
      const html = `<html><body style="font-family: Georgia, serif; margin: 0; padding: 48px;">
        <div style="border: 4px double #0097A7; padding: 48px; text-align: center;">
          <div style="font-size: 28px; letter-spacing: 4px; color: #0097A7;">${t('certificate.heading')}</div>
          <p style="margin-top: 32px;">${t('certificate.certify')}</p>
          <div style="font-size: 30px; font-weight: bold; margin: 12px 0;">${name}</div>
          <p>${t('certificate.completed')}</p>
          <div style="font-size: 22px; font-weight: bold; margin: 12px 0;">${course.title}</div>
          <p>${t('certificate.date', { date })}</p>
          <p style="margin-top: 32px; color: #666;">${t('certificate.issuer')}</p>
        </div></body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t('certificate.title') });
    } catch {
      // Sharing is best-effort; the on-screen certificate stays available.
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cert}>
        <Ionicons name="ribbon" size={44} color={colors.primary} style={styles.ribbon} />
        <Text style={styles.heading}>{t('certificate.heading')}</Text>
        <Text style={styles.body}>{t('certificate.certify')}</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.body}>{t('certificate.completed')}</Text>
        <Text style={styles.courseTitle}>{course.title}</Text>
        <Text style={styles.hint}>{t('certificate.date', { date })}</Text>
        <Text style={styles.issuer}>{t('certificate.issuer')}</Text>
      </View>

      {complete ? (
        <TouchableOpacity style={[styles.shareBtn, sharing && styles.btnDisabled]} onPress={sharePdf} disabled={sharing}>
          <Text style={styles.shareText}>{t('certificate.sharePdf')}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.hintCenter}>{progressPercentFor(app.state, course)}% — {t('myCourses.emptyCompleted')}</Text>
      )}
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    cert: {
      borderWidth: 3,
      borderColor: c.primary,
      borderRadius: radius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    ribbon: { marginBottom: spacing.sm },
    heading: { fontSize: 19, fontWeight: '800', letterSpacing: 2, color: c.primaryDark, textAlign: 'center' },
    body: { color: c.text, fontSize: 14 },
    name: { fontSize: 24, fontWeight: '800', color: c.text, textAlign: 'center' },
    courseTitle: { fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' },
    hint: { color: c.textSecondary, fontSize: 12 },
    hintCenter: { color: c.textSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
    issuer: { color: c.textSecondary, fontSize: 12, marginTop: spacing.md },
    shareBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
    },
    btnDisabled: { opacity: 0.6 },
    shareText: { color: c.onPrimary, fontWeight: '700' },
    title: { ...typography.title },
  });
}
