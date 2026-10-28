// Pure app logic — E-Learning App (shared file, owner: Hieu)
// No React / no AsyncStorage / no network here: every function takes plain
// data in and returns plain data out, so the rules of the app can be unit
// tested in Node and reused by all three members' screens.
//
// The screens NEVER compute these things inline:
// - lesson status comes from deriveLessonStatus() (progress is stored as
//   completedLessonIds, the status is always derived),
// - cart money comes from cartTotals(),
// - search/filter/sort comes from filterCourses(),
// - server content + the user's own on-device content is merged with the
//   merge* functions before anything renders.

import { courseProgressPercent } from '../data/mockData';
import type {
  Course,
  LessonStatus,
  PersistedState,
  Project,
  QaQuestion,
  Review,
} from '../data/types';

// ---------------------------------------------------------------------------
// Lessons / progress
// ---------------------------------------------------------------------------

// Flatten a course's lessons in chapter order (the order the learner meets
// them). "Current" = the first lesson not yet completed.
export function flatLessons(course: Course) {
  return course.chapters
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((ch) => ch.lessons);
}

// One entry per lesson id: completed (in the progress list), current
// (the first unfinished one), locked (everything after current).
export function deriveLessonStatus(
  course: Course,
  completedLessonIds: string[],
): Map<string, LessonStatus> {
  const done = new Set(completedLessonIds);
  const result = new Map<string, LessonStatus>();
  let currentAssigned = false;
  for (const lesson of flatLessons(course)) {
    if (done.has(lesson.id)) {
      result.set(lesson.id, 'completed');
    } else if (!currentAssigned) {
      result.set(lesson.id, 'current');
      currentAssigned = true;
    } else {
      result.set(lesson.id, 'locked');
    }
  }
  return result;
}

export function completedIdsFor(state: PersistedState, courseId: string): string[] {
  return state.progress.find((p) => p.courseId === courseId)?.completedLessonIds ?? [];
}

export function progressPercentFor(state: PersistedState, course: Course): number {
  return courseProgressPercent(course, completedIdsFor(state, course.id));
}

// ---------------------------------------------------------------------------
// Cart / checkout
// ---------------------------------------------------------------------------

export interface CartTotals {
  count: number;
  subtotal: number; // sum of current prices, before any promo code
  originalTotal: number; // sum of original prices
  savings: number; // originalTotal - subtotal (course discounts)
  promoDiscount: number; // extra amount off from a promo code
  payable: number; // subtotal - promoDiscount — what checkout "charges"
}

// Promo codes (percent off the subtotal). In a production app these would
// be validated by the server; for the MVP they are a client-side table.
export const PROMO_CODES: Record<string, number> = {
  ELEARN10: 10,
  STUDENT20: 20,
};

export function promoPercentFor(code: string | undefined): number {
  if (!code) return 0;
  return PROMO_CODES[code.trim().toUpperCase()] ?? 0;
}

export function cartCourses(state: PersistedState, courses: Course[]): Course[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  return state.cart
    .map((item) => byId.get(item.courseId))
    .filter((c): c is Course => c !== undefined);
}

export function cartTotals(state: PersistedState, courses: Course[], promoCode?: string): CartTotals {
  const items = cartCourses(state, courses);
  const subtotal = items.reduce((sum, c) => sum + c.price, 0);
  const originalTotal = items.reduce((sum, c) => sum + c.originalPrice, 0);
  const promoDiscount = Math.round((subtotal * promoPercentFor(promoCode)) / 100);
  return {
    count: items.length,
    subtotal,
    originalTotal,
    savings: originalTotal - subtotal,
    promoDiscount,
    payable: subtotal - promoDiscount,
  };
}

// ---------------------------------------------------------------------------
// Search / filter / sort (Search Results screen)
// ---------------------------------------------------------------------------

export type PriceBand = 'all' | 'under300' | 'b300to450' | 'over450';
export type SortKey = 'popular' | 'rating' | 'priceAsc' | 'priceDesc';

export interface CourseFilter {
  query?: string;
  categoryId?: string;
  priceBand?: PriceBand;
  minRating?: number; // 0 = no rating filter
  sort?: SortKey;
}

function inPriceBand(course: Course, band: PriceBand): boolean {
  // Prices are VND: bands are < 300.000₫ / 300–450.000₫ / > 450.000₫.
  switch (band) {
    case 'under300':
      return course.price < 300000;
    case 'b300to450':
      return course.price >= 300000 && course.price <= 450000;
    case 'over450':
      return course.price > 450000;
    default:
      return true;
  }
}

export function filterCourses(courses: Course[], filter: CourseFilter): Course[] {
  const q = (filter.query ?? '').trim().toLowerCase();
  const results = courses.filter((course) => {
    if (filter.categoryId && course.categoryId !== filter.categoryId) return false;
    if (q) {
      const inTitle = course.title.toLowerCase().includes(q);
      const inDescription = course.description.toLowerCase().includes(q);
      if (!inTitle && !inDescription) return false;
    }
    if (filter.priceBand && !inPriceBand(course, filter.priceBand)) return false;
    if (filter.minRating && course.rating < filter.minRating) return false;
    return true;
  });
  switch (filter.sort ?? 'popular') {
    case 'rating':
      return results.sort((a, b) => b.rating - a.rating);
    case 'priceAsc':
      return results.sort((a, b) => a.price - b.price);
    case 'priceDesc':
      return results.sort((a, b) => b.price - a.price);
    default:
      return results.sort((a, b) => b.ratingCount - a.ratingCount);
  }
}

// ---------------------------------------------------------------------------
// Merging server content with the user's own on-device content
// ---------------------------------------------------------------------------

// Reviews shown on a course = catalog reviews + reviews this user wrote
// on this device (theirs first so the user sees their own post at once).
export function mergeReviews(catalog: Review[], state: PersistedState, courseId: string): Review[] {
  const mine = state.myReviews.filter((r) => r.courseId === courseId);
  return [...mine, ...catalog.filter((r) => r.courseId === courseId)];
}

// The course's displayed rating is a catalog aggregate (rating x
// ratingCount). The user's own reviews are not in that aggregate, so the
// Review tab recomputes a live average that includes them.
export function aggregateRating(
  course: Course,
  myReviews: Review[],
): { average: number; count: number } {
  const mine = myReviews.filter((r) => r.courseId === course.id);
  if (mine.length === 0) return { average: course.rating, count: course.ratingCount };
  const totalScore = course.rating * course.ratingCount + mine.reduce((s, r) => s + r.rating, 0);
  const count = course.ratingCount + mine.length;
  return { average: Math.round((totalScore / count) * 10) / 10, count };
}

// Star distribution of a visible review list: [5★, 4★, 3★, 2★, 1★] counts.
export function ratingDistribution(reviews: Review[]): number[] {
  const dist = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    const idx = 5 - Math.min(5, Math.max(1, Math.round(r.rating)));
    dist[idx] += 1;
  }
  return dist;
}

export function mergeProjects(catalog: Project[], state: PersistedState, courseId: string): Project[] {
  const mine = state.myProjects.filter((p) => p.courseId === courseId);
  return [...mine, ...catalog.filter((p) => p.courseId === courseId)];
}

// Questions = catalog questions + the user's own questions. On every
// question, the user's own comments are appended and the like count
// reflects the user's like toggle (+1 when liked).
export function mergeQuestions(catalog: QaQuestion[], state: PersistedState, courseId: string): QaQuestion[] {
  const withMine = (q: QaQuestion): QaQuestion => {
    const extraComments = [
      ...(state.myComments[q.id] ?? []),
      // Comments on the user's OWN questions live inside myQuestions too,
      // but addComment() stores everything in myComments uniformly — except
      // the questions created this session already carry them; dedupe by
      // (author,text) pair against what is already embedded.
    ];
    const embedded = new Set(q.comments.map((c) => `${c.author}::${c.text}`));
    const fresh = extraComments.filter((c) => !embedded.has(`${c.author}::${c.text}`));
    return {
      ...q,
      comments: [...q.comments, ...fresh],
      likes: q.likes + (state.likedQuestionIds.includes(q.id) ? 1 : 0),
    };
  };
  const mine = state.myQuestions.filter((q) => q.courseId === courseId).map(withMine);
  const theirs = catalog.filter((q) => q.courseId === courseId).map(withMine);
  return [...mine, ...theirs];
}

// ---------------------------------------------------------------------------
// My Courses grouping (by derived progress status)
// ---------------------------------------------------------------------------

export type MyCourseGroup = 'all' | 'ongoing' | 'completed';

export function purchasedCourses(state: PersistedState, courses: Course[]): Course[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  return state.purchasedCourseIds
    .map((id) => byId.get(id))
    .filter((c): c is Course => c !== undefined);
}

export function groupOf(state: PersistedState, course: Course): Exclude<MyCourseGroup, 'all'> {
  return progressPercentFor(state, course) >= 100 ? 'completed' : 'ongoing';
}
