// SettingsContext — E-Learning App (shared file, owner: Hieu)
//
// App-level preferences, kept APART from AppStateContext on purpose:
// AppState is the user's learning data; this is how the app itself is
// configured on this device — color scheme (light/dark), UI language
// (vi/en via i18next), whether onboarding was seen, whether the user
// chose "continue as guest" at the entry gate, and the local profile
// overrides (display name / avatar) used when no Google name is set.
// Persisted under its own AsyncStorage key.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '../i18n';
import type { Language } from '../i18n';
import { darkColors, lightColors } from '../theme/colors';
import type { ColorScheme, Palette } from '../theme/colors';

interface Settings {
  scheme: ColorScheme;
  language: Language;
  hasOnboarded: boolean;
  guestSkipped: boolean;
  displayName: string; // '' = use the Google account name
  avatarUri: string; // '' = letter avatar
}

const DEFAULTS: Settings = {
  scheme: 'light',
  language: 'vi',
  hasOnboarded: false,
  guestSkipped: false,
  displayName: '',
  avatarUri: '',
};

const KEY = 'elearning.settings.v1';

export interface SettingsContextValue {
  ready: boolean;
  scheme: ColorScheme;
  colors: Palette;
  setScheme: (scheme: ColorScheme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  hasOnboarded: boolean;
  completeOnboarding: () => void;
  guestSkipped: boolean;
  skipAsGuest: () => void;
  resetGuestSkip: () => void;
  displayName: string;
  avatarUri: string;
  setProfile: (displayName: string, avatarUri: string) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
            setSettings(parsed);
            void i18n.changeLanguage(parsed.language);
          } catch {
            // corrupted settings fall back to defaults
          }
        }
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ready,
      scheme: settings.scheme,
      colors: settings.scheme === 'dark' ? darkColors : lightColors,
      setScheme: (scheme) => update({ scheme }),
      language: settings.language,
      setLanguage: (language) => {
        update({ language });
        void i18n.changeLanguage(language);
      },
      hasOnboarded: settings.hasOnboarded,
      completeOnboarding: () => update({ hasOnboarded: true }),
      guestSkipped: settings.guestSkipped,
      skipAsGuest: () => update({ guestSkipped: true }),
      resetGuestSkip: () => update({ guestSkipped: false }),
      displayName: settings.displayName,
      avatarUri: settings.avatarUri,
      setProfile: (displayName, avatarUri) => update({ displayName, avatarUri }),
    }),
    [ready, settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

// The name shown across the app: local override wins, then the Google
// account name, then the generic "guest" label.
export function useDisplayName(authName: string | undefined | null): string {
  const { displayName } = useSettings();
  const { t } = useTranslation();
  return displayName.trim() || authName || t('common.guest');
}
