// Data service — E-Learning App (shared file, owner: Hieu)
//
// The catalog (categories, teachers, courses, chapters, lessons, reviews,
// projects, questions) lives in a real PostgreSQL database on Supabase
// (8 flat tables with foreign keys, exactly the ERD in the SDS). The app
// reads it through the Supabase REST API (PostgREST) when both values are
// set in .env:
//
//   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
//
// Behaviour:
// - No config, network error, or bad response -> fall back to the LOCAL
//   mock data in src/data/mockData.ts, so the app (and the demo) never
//   shows a blank screen just because the API is unreachable.
// - Tables are flat (relational), so this module joins chapters/lessons
//   into the nested Course.chapters[].lessons[] shape the screens use.
//   Database columns are snake_case; app types are camelCase — the
//   mapping happens here and nowhere else.
// - Lesson `status` is NOT a database column: it is personal progress,
//   kept in AsyncStorage. While assembling, the first lesson of a course
//   is marked 'current', the rest 'locked'; real per-lesson status is
//   derived from PersistedState progress when screens are wired to it.
// - Database ids are the same text ids as the local mock data
//   ("c-ux-research", "ux-l1", ...), so AsyncStorage bookmark / cart /
//   progress references stay valid across API and fallback modes.
// - The catalog is fetched once and cached in memory; call
//   refreshCatalog() to force a refetch (used by retry buttons).
// - Personal data (bookmark / cart / progress) is NOT here — it lives in
//   AsyncStorage via src/storage/storage.ts. fetchCurrentUser() stays
//   local and synchronous for the same reason: the user is device-local.

import {
  mockCategories,
  mockCourses,
  mockProjects,
  mockQuestions,
  mockReviews,
  mockTeachers,
  mockUser,
} from '../data/mockData';
import type {
  Category,
  Chapter,
  Course,
  Lesson,
  Project,
  QaComment,
  QaQuestion,
  Review,
  Teacher,
  UserProfile,
} from '../data/types';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
const TIMEOUT_MS = 8000;

export function isApiConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

interface Catalog {
  categories: Category[];
  teachers: Teacher[];
  courses: Course[];
  reviews: Review[];
  projects: Project[];
  questions: QaQuestion[];
}

function localCatalog(): Catalog {
  return {
    categories: mockCategories,
    teachers: mockTeachers,
    courses: mockCourses,
    reviews: mockReviews,
    projects: mockProjects,
    questions: mockQuestions,
  };
}

type ApiRecord = Record<string, unknown>;

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(str) : []);

async function fetchTable(table: string): Promise<ApiRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`GET ${table} -> HTTP ${res.status}`);
    const json: unknown = await res.json();
    if (!Array.isArray(json)) throw new Error(`GET ${table} -> not an array`);
    return json as ApiRecord[];
  } finally {
    clearTimeout(timer);
  }
}

function assembleCatalog(
  rawCategories: ApiRecord[],
  rawTeachers: ApiRecord[],
  rawCourses: ApiRecord[],
  rawChapters: ApiRecord[],
  rawLessons: ApiRecord[],
  rawReviews: ApiRecord[],
  rawProjects: ApiRecord[],
  rawQuestions: ApiRecord[],
): Catalog {
  const lessonsByChapter = new Map<string, ApiRecord[]>();
  for (const l of rawLessons) {
    const key = str(l.chapter_id);
    const list = lessonsByChapter.get(key) ?? [];
    list.push(l);
    lessonsByChapter.set(key, list);
  }

  const chaptersByCourse = new Map<string, ApiRecord[]>();
  for (const ch of rawChapters) {
    const key = str(ch.course_id);
    const list = chaptersByCourse.get(key) ?? [];
    list.push(ch);
    chaptersByCourse.set(key, list);
  }

  const courses: Course[] = rawCourses.map((c) => {
    const courseId = str(c.id);
    let firstLessonPending = true;
    const chapters: Chapter[] = (chaptersByCourse.get(courseId) ?? [])
      .slice()
      .sort((a, b) => num(a.sort_order) - num(b.sort_order))
      .map((ch) => {
        const chapterId = str(ch.id);
        const lessons: Lesson[] = (lessonsByChapter.get(chapterId) ?? []).map((l) => {
          const status = firstLessonPending ? 'current' : 'locked';
          firstLessonPending = false;
          return { id: str(l.id), title: str(l.title), duration: str(l.duration), status };
        });
        return { id: chapterId, order: num(ch.sort_order), title: str(ch.title), lessons };
      });

    return {
      id: courseId,
      title: str(c.title),
      categoryId: str(c.category_id),
      teacherId: str(c.teacher_id),
      thumbnail: str(c.thumbnail),
      rating: num(c.rating),
      ratingCount: num(c.rating_count),
      price: num(c.price),
      originalPrice: num(c.original_price),
      description: str(c.description),
      benefits: strArr(c.benefits),
      chapters,
    };
  });

  return {
    categories: rawCategories.map((c) => ({ id: str(c.id), name: str(c.name) })),
    teachers: rawTeachers.map((t) => ({
      id: str(t.id),
      name: str(t.name),
      title: str(t.title),
      avatar: str(t.avatar),
      rating: num(t.rating),
      students: num(t.students),
    })),
    courses,
    reviews: rawReviews.map((r) => ({
      id: str(r.id),
      courseId: str(r.course_id),
      author: str(r.author),
      rating: num(r.rating),
      comment: str(r.comment),
    })),
    projects: rawProjects.map((p) => ({
      id: str(p.id),
      courseId: str(p.course_id),
      author: str(p.author),
      title: str(p.title),
      description: str(p.description),
      resources: strArr(p.resources),
    })),
    questions: rawQuestions.map((q) => ({
      id: str(q.id),
      courseId: str(q.course_id),
      author: str(q.author),
      text: str(q.text),
      likes: num(q.likes),
      // comments is a jsonb column holding [{ author, text }] (QaComment
      // has no id of its own — it only exists inside its question).
      comments: (Array.isArray(q.comments) ? q.comments : []).map(
        (cm): QaComment => ({
          author: str((cm as ApiRecord).author),
          text: str((cm as ApiRecord).text),
        }),
      ),
    })),
  };
}

async function loadCatalogFromApi(): Promise<Catalog> {
  const [categories, teachers, courses, chapters, lessons, reviews, projects, questions] =
    await Promise.all([
      fetchTable('categories'),
      fetchTable('teachers'),
      fetchTable('courses'),
      fetchTable('chapters'),
      fetchTable('lessons'),
      fetchTable('reviews'),
      fetchTable('projects'),
      fetchTable('questions'),
    ]);
  return assembleCatalog(categories, teachers, courses, chapters, lessons, reviews, projects, questions);
}

let catalogPromise: Promise<Catalog> | null = null;

export function refreshCatalog(): void {
  catalogPromise = null;
}

function loadCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    if (!isApiConfigured()) {
      catalogPromise = Promise.resolve(localCatalog());
    } else {
      catalogPromise = loadCatalogFromApi().catch((err: unknown) => {
        // Fall back to local data for THIS load, but do not cache the
        // failure — the next loadCatalog() call retries the API.
        catalogPromise = null;
        console.warn(
          '[api] Supabase fetch failed, using local mock data:',
          err instanceof Error ? err.message : String(err),
        );
        return localCatalog();
      });
    }
  }
  return catalogPromise;
}

// ---------------------------------------------------------------------------
// Public API (all catalog functions are async)
// ---------------------------------------------------------------------------

export async function fetchCategories(): Promise<Category[]> {
  return (await loadCatalog()).categories;
}

export async function fetchCourses(): Promise<Course[]> {
  return (await loadCatalog()).courses;
}

export async function fetchCourseById(id: string): Promise<Course | undefined> {
  return (await loadCatalog()).courses.find((c) => c.id === id);
}

export async function fetchTeachers(): Promise<Teacher[]> {
  return (await loadCatalog()).teachers;
}

export async function fetchTeacherById(id: string): Promise<Teacher | undefined> {
  return (await loadCatalog()).teachers.find((t) => t.id === id);
}

export async function fetchReviewsForCourse(courseId: string): Promise<Review[]> {
  return (await loadCatalog()).reviews.filter((r) => r.courseId === courseId);
}

export async function fetchProjectsForCourse(courseId: string): Promise<Project[]> {
  return (await loadCatalog()).projects.filter((p) => p.courseId === courseId);
}

export async function fetchQuestionsForCourse(courseId: string): Promise<QaQuestion[]> {
  return (await loadCatalog()).questions.filter((q) => q.courseId === courseId);
}

// The current user is device-local (no login in the MVP), so this one
// intentionally stays synchronous and never touches the API.
export function fetchCurrentUser(): UserProfile {
  return mockUser;
}
