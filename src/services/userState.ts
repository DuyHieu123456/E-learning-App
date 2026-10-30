// userState — per-account sync of the personal state (Supabase).
//
// Since 2026-10-30 the personal state (cart, purchases, progress,
// bookmarks, orders...) belongs to the ACCOUNT, not the device: the
// whole PersistedState is kept as one JSON document in the
// public.user_state table (one row per auth user; RLS lets a user
// read/write only their own row — see the SQL delivered with this
// change). AppStateContext treats the server copy as the account
// truth: it loads it after sign-in, pushes local changes up
// (debounced), and keeps the AsyncStorage partition as an offline
// cache / fallback when the network or Supabase is unavailable.
// Last write wins — fine for one person using their own account.
import type { PersistedState } from '../data/types';
import { normalizePersistedState } from '../storage/storage';
import { getValidSession } from './auth';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

const TIMEOUT_MS = 10000;

async function rest(path: string, init: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${SUPABASE_URL}${path}`, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function authHeaders(): Promise<{ headers: Record<string, string>; userId: string } | null> {
  const session = await getValidSession();
  if (!session) return null;
  return {
    userId: session.user.id,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}

// The account's server copy, or null when there is none yet / offline.
export async function fetchRemoteState(): Promise<PersistedState | null> {
  if (!isSupabaseConfigured()) return null;
  const auth = await authHeaders();
  if (!auth) return null;
  const res = await rest(`/rest/v1/user_state?user_id=eq.${auth.userId}&select=state`, {
    method: 'GET',
    headers: auth.headers,
  });
  if (!res || !res.ok) return null;
  try {
    const rows = (await res.json()) as { state: unknown }[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return normalizePersistedState(rows[0].state as Partial<PersistedState>);
  } catch {
    return null;
  }
}

// Upsert the account's server copy. Best-effort: failures are ignored
// (the local partition still has the data; the next change retries).
export async function pushRemoteState(state: PersistedState): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const auth = await authHeaders();
  if (!auth) return;
  await rest('/rest/v1/user_state', {
    method: 'POST',
    headers: { ...auth.headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: auth.userId, state, updated_at: new Date().toISOString() }),
  });
}
