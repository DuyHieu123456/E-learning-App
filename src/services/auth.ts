// Auth service — Supabase Auth (GoTrue) over plain REST, same style as
// api.ts: no extra SDK dependency. Accounts live in Supabase's own
// auth.users table (managed by Supabase, NOT one of the group's 8 public
// tables). The session (access + refresh token) is stored in AsyncStorage
// so the user stays signed in across app restarts; the access token is
// refreshed automatically when it is about to expire.
//
// Setup requirement (see HUONG-DAN-supabase.md): for this class demo the
// group DISABLES "Confirm email" in Supabase Dashboard (Authentication →
// Providers → Email), so sign-up returns a session immediately. If it is
// left on, signUp() throws AuthError with code 'email_not_confirmed'.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession, AuthUser } from '../data/types';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

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

type ApiUser = { id: string; email?: string; user_metadata?: { name?: string } };

function toAuthUser(u: ApiUser): AuthUser {
  const email = u.email ?? '';
  const name = u.user_metadata?.name?.trim() || email.split('@')[0] || 'User';
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

function mapError(json: unknown): AuthError {
  const rec = (json ?? {}) as { error_code?: string; code?: string; msg?: string; message?: string; error_description?: string };
  const code = rec.error_code ?? rec.code ?? '';
  const raw = rec.msg ?? rec.message ?? rec.error_description ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(raw)) {
    return new AuthError('invalid_credentials', 'Email hoặc mật khẩu không đúng.');
  }
  if (code === 'user_already_exists' || /already registered/i.test(raw)) {
    return new AuthError('user_already_exists', 'Email này đã được đăng ký. Hãy đăng nhập.');
  }
  if (code === 'email_not_confirmed' || /not confirmed/i.test(raw)) {
    return new AuthError(
      'email_not_confirmed',
      'Email chưa được xác thực. Kiểm tra hộp thư hoặc tắt "Confirm email" trong Supabase.',
    );
  }
  if (code === 'weak_password' || /password should be/i.test(raw)) {
    return new AuthError('weak_password', 'Mật khẩu quá ngắn (tối thiểu 6 ký tự).');
  }
  return new AuthError(code || 'unknown', raw || 'Đã có lỗi xảy ra. Thử lại sau.');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function signUp(email: string, password: string, name?: string): Promise<AuthSession> {
  ensureConfigured();
  const json = (await authRequest('/signup', {
    email,
    password,
    data: name ? { name } : undefined,
  })) as Partial<TokenResponse> & { id?: string };
  if (json.access_token && json.refresh_token && json.user) {
    const session = toSession(json as TokenResponse);
    await saveSession(session);
    return session;
  }
  // Account created but no session -> the project still requires email
  // confirmation (see the setup note at the top of this file).
  throw new AuthError(
    'email_not_confirmed',
    'Đã tạo tài khoản nhưng cần xác thực email. Kiểm tra hộp thư, hoặc tắt "Confirm email" trong Supabase rồi đăng ký lại.',
  );
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  ensureConfigured();
  const json = (await authRequest('/token?grant_type=password', { email, password })) as TokenResponse;
  const session = toSession(json);
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
