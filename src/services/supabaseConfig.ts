// Shared Supabase connection settings — read once from .env (Expo exposes
// EXPO_PUBLIC_* variables to the app bundle). Used by both the data
// service (api.ts, PostgREST) and the auth service (auth.ts, GoTrue).
// Restart Metro with `npx expo start -c` after changing .env.

export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
