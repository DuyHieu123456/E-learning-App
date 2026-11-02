// AuthContext — app-wide login state, backed by src/services/auth.ts.
// Wrap the app once (App.tsx). Screens read `user` (null = chưa đăng nhập)
// and call signInWithGoogle / signOut. Login is Google-only — there is no
// sign-up form: a first Google sign-in creates the account automatically.
// The app is NOT hard-gated: browsing stays open for guests.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import * as Linking from 'expo-linking';

import type { AuthUser } from '../data/types';
import {
  completeSignInFromUrl,
  discardStoredSession,
  isAuthCallbackUrl,
  signInWithGoogle as signInWithGoogleSvc,
  signOut as signOutSvc,
} from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  // Resolves true when a session was created, false when the user
  // cancelled the Google account picker (stay on the login screen).
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
  signInWithGoogle: async () => false,
  signOut: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let subscription: ReturnType<typeof Linking.addEventListener> | null = null;
    // Owner decision 2026-10-30: NO silent auto-login. Every cold start
    // begins signed-out at the Login gate (sign in with Google, or
    // continue as guest), so any stored session is discarded here
    // instead of restored. The session still lives in AsyncStorage
    // DURING a session (e.g. project upload uses its token).
    (async () => {
      await discardStoredSession().catch(() => undefined);
      // Phone sign-in fix (2026-11-02): when the OAuth browser hands the
      // exp:// callback to Expo Go, Expo Go may restart the JS — the
      // pending browser-session promise dies with the old context and
      // the callback URL survives only as this app's initial URL. If the
      // app was opened BY an auth callback, complete that sign-in here
      // (this is not a silent restore: the URL is a fresh login result,
      // delivered seconds ago by the browser the user just used).
      const initialUrl = await Linking.getInitialURL().catch(() => null);
      if (initialUrl && isAuthCallbackUrl(initialUrl)) {
        const session = await completeSignInFromUrl(initialUrl).catch(() => null);
        if (session && !cancelled) setUser(session.user);
      }
      if (!cancelled) setInitializing(false);
      // Warm path: the callback arrives while this JS context is alive
      // (the browser-session promise in auth.ts also races for it; the
      // shared completion helper deduplicates the URL).
      subscription = Linking.addEventListener('url', ({ url }) => {
        if (!isAuthCallbackUrl(url)) return;
        completeSignInFromUrl(url)
          .then((session) => {
            if (session) setUser(session.user);
          })
          .catch(() => undefined);
      });
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const session = await signInWithGoogleSvc();
    if (!session) return false;
    setUser(session.user);
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await signOutSvc();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, signInWithGoogle, signOut }),
    [user, initializing, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
