// AsyncStorage persistence — E-Learning App (shared file, owner: Hieu)
// Only personal state is stored locally: bookmarks, cart, learning progress.
// Progress is stored as completedLessonIds; the % is always derived with
// courseProgressPercent() — never store the % itself.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { initialPersistedState } from '../data/mockData';
import type { PersistedState } from '../data/types';

const STORAGE_KEY = 'elearning.persistedState.v1';

// One on-device partition per Google account (owner decision
// 2026-10-30): two accounts on the same phone must never see each
// other's cart, purchases or progress. The bare STORAGE_KEY was the
// pre-partition shared store and is no longer read by the app.
export function persistedStateKeyFor(userId: string): string {
  return `${STORAGE_KEY}.${userId}`;
}

// Defensive merge so a stale/partial saved shape (an older app
// version, or the server copy from user_state) cannot crash screens.
// Shared by the local loader below and the Supabase sync service.
export function normalizePersistedState(
  parsed: Partial<PersistedState> | null | undefined,
): PersistedState {
  if (!parsed) return initialPersistedState;
  return {
    bookmarkedCourseIds: parsed.bookmarkedCourseIds ?? [],
    cart: parsed.cart ?? [],
    progress: parsed.progress ?? [],
    purchasedCourseIds: parsed.purchasedCourseIds ?? [],
    followedTeacherIds: parsed.followedTeacherIds ?? [],
    myReviews: parsed.myReviews ?? [],
    myProjects: parsed.myProjects ?? [],
    myQuestions: parsed.myQuestions ?? [],
    myComments: parsed.myComments ?? {},
    likedQuestionIds: parsed.likedQuestionIds ?? [],
    orders: parsed.orders ?? [],
    quizScores: parsed.quizScores ?? [],
  };
}

export async function loadPersistedState(key: string = STORAGE_KEY): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return initialPersistedState;
    return normalizePersistedState(JSON.parse(raw) as PersistedState);
  } catch {
    return initialPersistedState;
  }
}

export async function savePersistedState(state: PersistedState, key: string = STORAGE_KEY): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage is best-effort in the skeleton; ignore write failures.
  }
}

export async function clearPersistedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
