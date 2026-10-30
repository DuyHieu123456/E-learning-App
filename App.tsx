import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Platform, View } from 'react-native';

import './src/i18n';
import { AppStateProvider } from './src/context/AppStateContext';
import { AuthPromptProvider } from './src/context/AuthPromptContext';
import { AuthProvider } from './src/context/AuthContext';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import RootNavigator from './src/navigation/RootNavigator';

// Inner shell so the navigation theme + status bar follow the user's
// light/dark choice from SettingsContext.
function Shell() {
  const { colors, scheme } = useSettings();
  const navTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, scheme]);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  // Web only: the Google sign-in popup loads this app at
  // /auth-callback. expo-web-browser forwards the result to the main
  // window and closes the popup — render nothing so the popup never
  // flashes a second login screen (owner report 2026-10-30).
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location.pathname.includes('auth-callback')
  ) {
    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
  }
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppStateProvider>
          <AuthPromptProvider>
            <Shell />
          </AuthPromptProvider>
        </AppStateProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
