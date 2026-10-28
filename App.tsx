import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import './src/i18n';
import { AppStateProvider } from './src/context/AppStateContext';
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
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppStateProvider>
          <Shell />
        </AppStateProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
