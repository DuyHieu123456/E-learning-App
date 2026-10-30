// AuthPromptContext — in-place sign-in prompt for gated actions.
//
// Guests browse freely; when a guest taps a personal action (cart,
// bookmark, follow, checkout...), useRequireAuth calls promptLogin()
// and the action is skipped. The prompt is a small modal IN PLACE —
// no second Login screen (owner complaint 2026-10-30: guests were
// sent to a full Login screen and had to choose twice). "Sign in"
// runs the Google flow directly; on success AuthContext flips and
// every screen re-renders signed-in. The full LoginScreen remains
// only as the entry gate.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Palette } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

interface AuthPromptValue {
  promptLogin: () => void;
}

const AuthPromptContext = createContext<AuthPromptValue | null>(null);

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const promptLogin = useCallback(() => setVisible(true), []);
  const value = useMemo(() => ({ promptLogin }), [promptLogin]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      // Stay a guest; the prompt closes either way.
    } finally {
      setSigningIn(false);
      setVisible(false);
    }
  };

  return (
    <AuthPromptContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{t('authPrompt.title')}</Text>
            <Text style={styles.body}>{t('authPrompt.body')}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleSignIn()} disabled={signingIn}>
              <Text style={styles.primaryText}>{signingIn ? t('login.opening') : t('authPrompt.signIn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.laterBtn} onPress={() => setVisible(false)}>
              <Text style={styles.laterText}>{t('authPrompt.later')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt(): AuthPromptValue {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error('useAuthPrompt must be used inside <AuthPromptProvider>');
  return ctx;
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 420,
      gap: spacing.sm,
    },
    title: { ...typography.title, color: c.text, textAlign: 'center' },
    body: { color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    primaryText: { color: c.onPrimary, fontWeight: '700' },
    laterBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
    laterText: { color: c.primary, fontWeight: '600' },
  });
}
