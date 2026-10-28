// AppStateContext — E-Learning App (shared file, owner: Hieu)
//
// The single source of truth for PERSONAL state (everything that is about
// THIS user on THIS device, as opposed to the shared catalog in api.ts):
// bookmarks, cart, learning progress, purchased courses, followed
// teachers, and content the user creates on-device (reviews, projects,
// Q&A questions/comments, likes).
//
// How it works:
// - On mount it loads PersistedState from AsyncStorage (storage.ts).
// - Every action returns a NEW state object, updates React state, and
//   saves the whole state back to AsyncStorage — so anything the user
//   does survives closing and reopening the app.
// - Screens read via useAppState() and never touch AsyncStorage directly.
// - Catalog data (courses, teachers...) is NOT here — use api.ts.
// - The signed-in account is NOT here — use AuthContext (Supabase Auth).
//   Personal state is per-device; signing in does not move it (MVP scope).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { initialPersistedState } from '../data/mockData';
import type { PersistedState, Project, QaComment, QaQuestion, Review } from '../data/types';
import { loadPersistedState, savePersistedState } from '../storage/storage';

export interface AppStateContextValue {
  state: PersistedState;
  ready: boolean; // false until the saved state has been loaded from disk

  // Bookmarks
  isBookmarked: (courseId: string) => boolean;
  toggleBookmark: (courseId: string) => void;

  // Cart + checkout
  isInCart: (courseId: string) => boolean;
  addToCart: (courseId: string) => void;
  removeFromCart: (courseId: string) => void;
  checkout: () => string[]; // returns the purchased course ids

  // Ownership + learning progress
  isPurchased: (courseId: string) => boolean;
  toggleLessonComplete: (courseId: string, lessonId: string) => void;

  // Teachers
  isFollowing: (teacherId: string) => boolean;
  toggleFollow: (teacherId: string) => void;

  // User-created content
  addReview: (review: Review) => void;
  addProject: (project: Project) => void;
  addQuestion: (question: QaQuestion) => void;
  addComment: (questionId: string, comment: QaComment) => void;
  isLiked: (questionId: string) => boolean;
  toggleLike: (questionId: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialPersistedState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    loadPersistedState().then((loaded) => {
      if (cancelled) return;
      setState(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Single write path: every mutation goes through here so the in-memory
  // state and AsyncStorage can never drift apart.
  const update = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = fn(prev);
      void savePersistedState(next);
      return next;
    });
  }, []);

  const value = useMemo<AppStateContextValue>(() => {
    const current = stateRef.current;
    return {
      state,
      ready,
      isBookmarked: (courseId) => current.bookmarkedCourseIds.includes(courseId),
      toggleBookmark: (courseId) =>
        update((prev) => ({
          ...prev,
          bookmarkedCourseIds: toggleInList(prev.bookmarkedCourseIds, courseId),
        })),
      isInCart: (courseId) => current.cart.some((item) => item.courseId === courseId),
      addToCart: (courseId) =>
        update((prev) =>
          prev.cart.some((item) => item.courseId === courseId) ||
          prev.purchasedCourseIds.includes(courseId)
            ? prev
            : { ...prev, cart: [...prev.cart, { courseId }] },
        ),
      removeFromCart: (courseId) =>
        update((prev) => ({ ...prev, cart: prev.cart.filter((item) => item.courseId !== courseId) })),
      checkout: () => {
        const bought = stateRef.current.cart.map((item) => item.courseId);
        update((prev) => ({
          ...prev,
          purchasedCourseIds: Array.from(new Set([...prev.purchasedCourseIds, ...bought])),
          cart: [],
        }));
        return bought;
      },
      isPurchased: (courseId) => current.purchasedCourseIds.includes(courseId),
      toggleLessonComplete: (courseId, lessonId) =>
        update((prev) => {
          const existing = prev.progress.find((p) => p.courseId === courseId);
          const completed = existing ? toggleInList(existing.completedLessonIds, lessonId) : [lessonId];
          const progress = existing
            ? prev.progress.map((p) => (p.courseId === courseId ? { ...p, completedLessonIds: completed } : p))
            : [...prev.progress, { courseId, completedLessonIds: completed }];
          return { ...prev, progress };
        }),
      isFollowing: (teacherId) => current.followedTeacherIds.includes(teacherId),
      toggleFollow: (teacherId) =>
        update((prev) => ({
          ...prev,
          followedTeacherIds: toggleInList(prev.followedTeacherIds, teacherId),
        })),
      addReview: (review) => update((prev) => ({ ...prev, myReviews: [review, ...prev.myReviews] })),
      addProject: (project) => update((prev) => ({ ...prev, myProjects: [project, ...prev.myProjects] })),
      addQuestion: (question) =>
        update((prev) => ({ ...prev, myQuestions: [question, ...prev.myQuestions] })),
      addComment: (questionId, comment) =>
        update((prev) => ({
          ...prev,
          myComments: {
            ...prev.myComments,
            [questionId]: [...(prev.myComments[questionId] ?? []), comment],
          },
        })),
      isLiked: (questionId) => current.likedQuestionIds.includes(questionId),
      toggleLike: (questionId) =>
        update((prev) => ({
          ...prev,
          likedQuestionIds: toggleInList(prev.likedQuestionIds, questionId),
        })),
    };
  }, [state, ready, update]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}

// Ids for user-created content: timestamp + counter is unique enough on one
// device and keeps the text-id style of the catalog ("my-q-1699...", ...).
let counter = 0;
export function newLocalId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
