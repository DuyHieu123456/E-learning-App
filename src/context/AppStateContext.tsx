// AppStateContext — E-Learning App (shared file, owner: Hieu)
//
// The single source of truth for PERSONAL state (everything that is about
// THIS user on THIS device, as opposed to the shared catalog in api.ts):
// bookmarks, cart, learning progress, purchased courses, followed
// teachers, and content the user creates on-device (reviews, projects,
// Q&A questions/comments, likes).
//
// How it works:
// - SIGNED-IN: on sign-in it loads that account's own PersistedState
//   partition from AsyncStorage (one storage key per Google account
//   id), and every action saves back to the same partition — two
//   accounts on one phone have fully separate cart/purchases/progress.
// - GUEST: session-only. A guest always starts from the empty initial
//   state on every cold start, and guest changes are kept in memory
//   only — never written over the signed-in store. Signing out drops
//   back to that clean guest state. (Owner decision 2026-10-30: a
//   guest must not see, or leave behind, another session's data.)
// - SYNC: the signed-in partition is mirrored to Supabase
//   (public.user_state, one JSON row per account): after sign-in the
//   server copy wins, local changes are pushed up (debounced 1s), so
//   personal data follows the ACCOUNT across devices. The local
//   partition stays as the offline cache / fallback.
// - Screens read via useAppState() and never touch AsyncStorage directly.
// - Catalog data (courses, teachers...) is NOT here — use api.ts.
// - The signed-in account is NOT here — use AuthContext (Supabase Auth).

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { initialPersistedState } from '../data/mockData';
import type { Order, PersistedState, Project, QaComment, QaQuestion, QuizScore, Review } from '../data/types';
import { fetchRemoteState, pushRemoteState } from '../services/userState';
import { loadPersistedState, persistedStateKeyFor, savePersistedState } from '../storage/storage';
import { useAuth } from './AuthContext';

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
  updateReview: (id: string, rating: number, comment: string) => void;
  removeReview: (id: string) => void;
  addProject: (project: Project) => void;
  removeProject: (id: string) => void;
  addQuestion: (question: QaQuestion) => void;
  removeQuestion: (id: string) => void;
  addComment: (questionId: string, comment: QaComment) => void;
  isLiked: (questionId: string) => boolean;
  toggleLike: (questionId: string) => void;

  // Orders + quiz results
  addOrder: (order: Order) => void;
  recordQuizScore: (score: QuizScore) => void;
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
  const { user, initializing } = useAuth();
  // Signed-in: personal state comes from the account's own on-device
  // partition (activeKeyRef) and every change is saved back to it.
  // Guest: session-only — starts empty, never saved to disk.
  const modeRef = useRef<string>('unknown'); // 'unknown' | 'guest' | userId
  const activeKeyRef = useRef<string | null>(null);
  // Bumped by every local mutation; the post-sign-in server fetch
  // compares it to decide whether local or remote state wins.
  const localVersionRef = useRef(0);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRemotePush = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void pushRemoteState(stateRef.current);
    }, 1000);
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (user) {
      if (modeRef.current === user.id) return;
      modeRef.current = user.id;
      const key = persistedStateKeyFor(user.id);
      activeKeyRef.current = key;
      let cancelled = false;
      loadPersistedState(key).then((loaded) => {
        if (cancelled) return;
        setState(loaded);
        setReady(true);
        // Reconcile with the account's server copy (the account truth
        // since the 2026-10-30 sync): remote wins when the user has
        // not changed anything locally yet; if they already did, the
        // local change wins and is pushed up instead. No server copy
        // yet -> seed it from this device's partition.
        const versionAtLoad = localVersionRef.current;
        void fetchRemoteState().then((remote) => {
          if (cancelled) return;
          if (localVersionRef.current !== versionAtLoad) {
            void pushRemoteState(stateRef.current);
          } else if (remote) {
            setState(remote);
            void savePersistedState(remote, key);
          } else {
            void pushRemoteState(loaded);
          }
        });
      });
      return () => {
        cancelled = true;
      };
    }
    modeRef.current = 'guest';
    activeKeyRef.current = null;
    setState(initialPersistedState);
    setReady(true);
  }, [user, initializing]);

  // Single write path: every mutation goes through here so the in-memory
  // state and AsyncStorage can never drift apart. Guests skip the disk
  // write entirely — their state dies with the session. Signed-in
  // changes are also pushed (debounced) to the account's Supabase copy.
  const update = useCallback(
    (fn: (prev: PersistedState) => PersistedState) => {
      localVersionRef.current += 1;
      setState((prev) => {
        const next = fn(prev);
        if (activeKeyRef.current) void savePersistedState(next, activeKeyRef.current);
        return next;
      });
      if (activeKeyRef.current) scheduleRemotePush();
    },
    [scheduleRemotePush],
  );

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
      updateReview: (id, rating, comment) =>
        update((prev) => ({
          ...prev,
          myReviews: prev.myReviews.map((r) => (r.id === id ? { ...r, rating, comment } : r)),
        })),
      removeReview: (id) =>
        update((prev) => ({ ...prev, myReviews: prev.myReviews.filter((r) => r.id !== id) })),
      addProject: (project) => update((prev) => ({ ...prev, myProjects: [project, ...prev.myProjects] })),
      removeProject: (id) =>
        update((prev) => ({ ...prev, myProjects: prev.myProjects.filter((p) => p.id !== id) })),
      addQuestion: (question) =>
        update((prev) => ({ ...prev, myQuestions: [question, ...prev.myQuestions] })),
      removeQuestion: (id) =>
        update((prev) => {
          const myComments = { ...prev.myComments };
          delete myComments[id];
          return {
            ...prev,
            myQuestions: prev.myQuestions.filter((q) => q.id !== id),
            myComments,
            likedQuestionIds: prev.likedQuestionIds.filter((x) => x !== id),
          };
        }),
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
      addOrder: (order) => update((prev) => ({ ...prev, orders: [order, ...prev.orders] })),
      recordQuizScore: (score) =>
        update((prev) => ({
          ...prev,
          // Keep only the latest attempt per course.
          quizScores: [...prev.quizScores.filter((s) => s.courseId !== score.courseId), score],
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
