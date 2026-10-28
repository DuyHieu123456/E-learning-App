// AuthContext — app-wide login state, backed by src/services/auth.ts.
// Wrap the app once (App.tsx). Screens read `user` (null = chưa đăng nhập)
// and call signIn / signUp / signOut. The app is NOT hard-gated: browsing
// stays open for guests, only account actions need a session.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { AuthUser } from '../data/types';
import { getValidSession, signIn as signInSvc, signOut as signOutSvc, signUp as signUpSvc } from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  initializing: true,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signOut: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getValidSession()
      .then((session) => {
        if (!cancelled) setUser(session?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setInitializing(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await signInSvc(email, password);
    setUser(session.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const session = await signUpSvc(email, password, name);
    setUser(session.user);
  }, []);

  const signOut = useCallback(async () => {
    await signOutSvc();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, signIn, signUp, signOut }),
    [user, initializing, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
