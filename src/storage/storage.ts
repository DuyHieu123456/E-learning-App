// AsyncStorage persistence — E-Learning App (shared file, owner: Hieu)
// Only personal state is stored locally: bookmarks, cart, learning progress.
// Progress is stored as completedLessonIds; the % is always derived with
// courseProgressPercent() — never store the % itself.

import AsyncStorage from '@react-native-async-storage/async-storage';

import { initialPersistedState } from '../data/mockData';
import type { PersistedState } from '../data/types';

const STORAGE_KEY = 'elearning.persistedState.v1';

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return initialPersistedState;
    const parsed = JSON.parse(raw) as PersistedState;
    // Defensive merge so a stale/partial saved shape cannot crash screens.
    return {
      bookmarkedCourseIds: parsed.bookmarkedCourseIds ?? [],
      cart: parsed.cart ?? [],
      progress: parsed.progress ?? [],
    };
  } catch {
    return initialPersistedState;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
