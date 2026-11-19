// SettingsScreen — owner: Hieu (shared infrastructure)
// Appearance (light/dark via SettingsContext), UI language (vi/en via
// i18next), account summary + sign out, app version/about.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { AuthError } from '../../services/auth';
import { requestNotificationPermission, syncStudyReminder } from '../../services/reminders';
import { useSettings } from '../../context/SettingsContext';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export default function SettingsScreen() {
  const settings = useSettings();
  const { user, signOut, signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(settings.colors), [settings.colors]);
  const c = settings.colors;

  const seg = (active: boolean) => [styles.segment, active && styles.segmentActive];
  const segText = (active: boolean) => [styles.segmentText, active && styles.segmentTextActive];

  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  // Daily study reminder: enabling asks for the OS permission first
  // (the only place in the app that prompts); the SettingsContext
  // effect also re-syncs the schedule whenever the setting changes.
  const applyReminder = async (enabled: boolean, hour: number) => {
    if (enabled) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        setReminderError(t('settings.reminderDenied'));
        return;
      }
    }
    setReminderError(null);
    settings.setReminder(enabled, hour, settings.reminderMinute);
    void syncStudyReminder({
      enabled,
      hour,
      minute: settings.reminderMinute,
      title: t('settings.reminderNotifTitle'),
      body: t('settings.reminderNotifBody'),
    });
  };

  // One-tap sign-in (same as Profile): no detour through Login.
  const signIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof AuthError ? err.message : t('login.failed'));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.group}>{t('settings.appearance')}</Text>
      <View style={styles.segmentRow}>
        <TouchableOpacity style={seg(settings.scheme === 'light')} onPress={() => settings.setScheme('light')}>
          <Text style={segText(settings.scheme === 'light')}>☀ {t('settings.light')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={seg(settings.scheme === 'dark')} onPress={() => settings.setScheme('dark')}>
          <Text style={segText(settings.scheme === 'dark')}>☾ {t('settings.dark')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.group}>{t('settings.language')}</Text>
      <View style={styles.segmentRow}>
        <TouchableOpacity style={seg(settings.language === 'vi')} onPress={() => settings.setLanguage('vi')}>
          <Text style={segText(settings.language === 'vi')}>Tiếng Việt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={seg(settings.language === 'en')} onPress={() => settings.setLanguage('en')}>
          <Text style={segText(settings.language === 'en')}>English</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS !== 'web' ? (
        <>
          <Text style={styles.group}>{t('settings.reminder')}</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity style={seg(settings.reminderEnabled)} onPress={() => void applyReminder(true, settings.reminderHour)}>
              <Text style={segText(settings.reminderEnabled)}>{t('settings.reminderOn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={seg(!settings.reminderEnabled)} onPress={() => void applyReminder(false, settings.reminderHour)}>
              <Text style={segText(!settings.reminderEnabled)}>{t('settings.reminderOff')}</Text>
            </TouchableOpacity>
          </View>
          {settings.reminderEnabled ? (
            <View style={[styles.segmentRow, { marginTop: spacing.sm }]}>
              {[7, 19, 20].map((h) => (
                <TouchableOpacity key={h} style={seg(settings.reminderHour === h)} onPress={() => void applyReminder(true, h)}>
                  <Text style={segText(settings.reminderHour === h)}>{`${h}:00`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <Text style={[styles.hint, { marginTop: spacing.sm }]}>{t('settings.reminderHint')}</Text>
          {reminderError ? <Text style={[styles.hint, { color: c.danger }]}>{reminderError}</Text> : null}
        </>
      ) : null}

      <Text style={styles.group}>{t('settings.account')}</Text>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.hint}>{user.email}</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { settings.resetGuestSkip(); void signOut(); }}>
            <Text style={[styles.logoutText, { color: c.danger }]}>{t('settings.logout')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void signIn()} disabled={signingIn}>
            <Text style={styles.primaryText}>{signingIn ? t('login.opening') : t('profile.loginGoogle')}</Text>
          </TouchableOpacity>
          {authError ? <Text style={[styles.hint, { color: c.danger }]}>{authError}</Text> : null}
        </View>
      )}

      <Text style={styles.group}>{t('settings.version')}</Text>
      <View style={styles.card}>
        <Text style={styles.name}>E-Learning App · 1.0.0</Text>
        <Text style={styles.hint}>{t('settings.about')}</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    group: { ...typography.bodyBold, color: c.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    segmentRow: { flexDirection: 'row', gap: spacing.sm },
    segment: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      backgroundColor: c.surface,
    },
    segmentActive: { backgroundColor: c.primary, borderColor: c.primary },
    segmentText: { color: c.text, fontWeight: '600' },
    segmentTextActive: { color: c.onPrimary },
    card: { backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.md, gap: 4 },
    name: { fontWeight: '600', color: c.text },
    hint: { color: c.textSecondary, fontSize: 12 },
    logoutBtn: { marginTop: spacing.sm },
    logoutText: { fontWeight: '600' },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    primaryText: { color: c.onPrimary, fontWeight: '700' },
  });
}
