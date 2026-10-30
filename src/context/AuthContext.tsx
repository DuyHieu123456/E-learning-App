// AuthContext — app-wide login state, backed by src/services/auth.ts.
// Wrap the app once (App.tsx). Screens read `user` (null = chưa đăng nhập)
// and call signInWithGoogle / signOut. Login is Google-only — there is no
// sign-up form: a first Google sign-in creates the account automatically.
// The app is NOT hard-gated: browsing stays open for guests.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { AuthUser } from '../data/types';
import { discardStoredSession, signInWithGoogle as signInWithGoogleSvc, signOut as signOutSvc } from '../services/auth';

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
    // Owner decision 2026-10-30: NO silent auto-login. Every cold start
    // begins signed-out at the Login gate (sign in with Google, or
    // continue as guest), so any stored session is discarded here
    // instead of restored. The session still lives in AsyncStorage
    // DURING a session (e.g. project upload uses its token).
    discardStoredSession()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
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
