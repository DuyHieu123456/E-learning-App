// Auth service — Supabase Auth (GoTrue) over plain REST, same style as
// api.ts: no extra SDK dependency. Login is GOOGLE ONLY (decided by Duy on
// 2026-10-27): there is no app-side registration form and no password —
// the first Google sign-in automatically creates the account in Supabase
// Auth's own auth.users table (managed by Supabase, NOT one of the group's
// 8 public tables). The session (access + refresh token) is stored in
// AsyncStorage so the user stays signed in across app restarts; the
// access token is refreshed automatically when it is about to expire.
//
// Developer setup (one time, see HUONG-DAN-supabase-google.md):
//   1. Create a Google Cloud OAuth client (Web application) with the
//      authorized redirect URI https://<project-ref>.supabase.co/auth/v1/callback
//   2. Paste its Client ID + Secret into Supabase Dashboard →
//      Authentication → Providers → Google and enable the provider.
//   3. Add the app redirect URLs (exp://** for Expo Go, elearningapp://**
//      for builds) under Authentication → URL Configuration.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { AuthSession, AuthUser } from '../data/types';
import { buildGoogleAuthorizeUrl, oauthRedirectError, parseOAuthRedirect } from './oauthRedirect';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

// Completes a pending browser auth session on web / when the app is
// reopened via the redirect; a no-op in the normal native flow.
WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = 'elearning.authSession.v1';
const TIMEOUT_MS = 10000;

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function ensureConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new AuthError(
      'not_configured',
      'Chưa cấu hình Supabase (.env). Đăng nhập chỉ hoạt động khi đã nối Supabase.',
    );
  }
}

type ApiUser = {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string };
};

function toAuthUser(u: ApiUser): AuthUser {
  const email = u.email ?? '';
  const name =
    u.user_metadata?.name?.trim() || u.user_metadata?.full_name?.trim() || email.split('@')[0] || 'User';
  return { id: u.id, email, name };
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: ApiUser;
}

function toSession(t: TokenResponse): AuthSession {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: Date.now() + t.expires_in * 1000,
    user: toAuthUser(t.user),
  };
}

async function saveSession(session: AuthSession | null): Promise<void> {
  try {
    if (session) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // Best-effort persistence, mirrors storage.ts.
  }
}

async function authRequest(path: string, body: unknown, accessToken?: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) throw mapError(json);
    return json;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('network', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  } finally {
    clearTimeout(timer);
  }
}

async function authGetUser(accessToken: string): Promise<AuthUser> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) throw mapError(json);
    return toAuthUser(json as ApiUser);
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError('network', 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  } finally {
    clearTimeout(timer);
  }
}

function mapError(json: unknown): AuthError {
  const rec = (json ?? {}) as { error_code?: string; code?: string; msg?: string; message?: string; error_description?: string };
  const code = rec.error_code ?? rec.code ?? '';
  const raw = rec.msg ?? rec.message ?? rec.error_description ?? '';
  return new AuthError(code || 'unknown', raw || 'Đã có lỗi xảy ra. Thử lại sau.');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Opens Google's account picker in a browser session and completes the
// Supabase OAuth flow. Returns the new session, or null when the user
// cancelled/closed the browser (not an error — the app stays a guest).
// NO separate sign-up exists: a first-time Google account is created by
// Supabase Auth automatically on this same call.
export async function signInWithGoogle(): Promise<AuthSession | null> {
  ensureConfigured();
  const redirectTo = Linking.createURL('auth-callback');
  const authorizeUrl = buildGoogleAuthorizeUrl(SUPABASE_URL, redirectTo);
  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectTo);
  if (result.type !== 'success') return null;
  const oauthError = oauthRedirectError(result.url);
  if (oauthError) {
    throw new AuthError('oauth_failed', `Đăng nhập Google thất bại: ${oauthError}`);
  }
  const tokens = parseOAuthRedirect(result.url);
  if (!tokens) {
    throw new AuthError('oauth_failed', 'Không nhận được phiên đăng nhập từ Google. Thử lại.');
  }
  const user = await authGetUser(tokens.accessToken);
  const session: AuthSession = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    user,
  };
  await saveSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  const session = await getStoredSession();
  if (session && isSupabaseConfigured()) {
    try {
      await authRequest('/logout', {}, session.accessToken);
    } catch {
      // Server-side logout is best-effort; the local session is cleared anyway.
    }
  }
  await saveSession(null);
}

export async function getStoredSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function refreshSession(session: AuthSession): Promise<AuthSession> {
  ensureConfigured();
  const json = (await authRequest('/token?grant_type=refresh_token', {
    refresh_token: session.refreshToken,
  })) as TokenResponse;
  const next = toSession(json);
  await saveSession(next);
  return next;
}

// Returns the stored session, refreshing it first if it expires within
// the next minute. Returns null when signed out (or refresh fails, in
// which case the stale session is cleared).
export async function getValidSession(): Promise<AuthSession | null> {
  const session = await getStoredSession();
  if (!session) return null;
  if (session.expiresAt - Date.now() > 60_000) return session;
  try {
    return await refreshSession(session);
  } catch {
    await saveSession(null);
    return null;
  }
}
