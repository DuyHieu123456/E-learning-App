// Data service — E-Learning App (shared file, owner: Hieu)
//
// The app reads its catalog (categories, teachers, courses, chapters,
// lessons, reviews, projects, questions) from the group's mockapi.io
// project when EXPO_PUBLIC_API_URL is set in .env:
//
//   EXPO_PUBLIC_API_URL=https://<project-id>.mockapi.io/api/v1
//
// Behaviour:
// - No URL configured, network error, or bad response -> fall back to the
//   LOCAL mock data in src/data/mockData.ts, so the app (and the demo)
//   never shows a blank screen just because the API is unreachable.
// - The mockapi free plan allows only 2 resources, so the project uses a
//   nested layout: `courses` (each record embeds chapters[] with
//   lessons[], plus reviews[] / projects[] / questions[]) and `catalog`
//   (one record embedding categories[] and teachers[]). This module maps
//   that shape onto the types in src/data/types.ts. Lesson `status` does
//   not exist on the API (it is personal progress, kept in AsyncStorage)
//   — while assembling, the first lesson of a course is marked
//   'current', the rest 'locked', exactly as documented in
//   MOCKAPI-setup.md. Real per-lesson status is derived from
//   PersistedState progress when screens are wired to it.
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
  QaQuestion,
  Review,
  Teacher,
  UserProfile,
} from '../data/types';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
const TIMEOUT_MS = 8000;

export function isApiConfigured(): boolean {
  return API_URL.length > 0;
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
const strArr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(str);
  if (typeof v === 'string') {
    try {
      const parsed: unknown = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.map(str) : [];
    } catch {
      return [];
    }
  }
  return [];
};

async function fetchJson(path: string): Promise<ApiRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
    const json: unknown = await res.json();
    if (!Array.isArray(json)) throw new Error(`GET ${path} -> not an array`);
    return json as ApiRecord[];
  } finally {
    clearTimeout(timer);
  }
}

// Nested fields come back as arrays when the mockapi field type preserves
// them, but a field created with the wrong type can return a JSON string —
// accept both instead of crashing the catalog load.
function objArr(v: unknown): ApiRecord[] {
  if (Array.isArray(v)) {
    return v.filter((x): x is ApiRecord => typeof x === 'object' && x !== null);
  }
  if (typeof v === 'string') {
    try {
      return objArr(JSON.parse(v));
    } catch {
      return [];
    }
  }
  if (typeof v === 'object' && v !== null) return [v as ApiRecord];
  return [];
}

function assembleCatalog(rawCourses: ApiRecord[], rawCatalog: ApiRecord[]): Catalog {
  const catalogRecord = rawCatalog[0] ?? {};

  const categories: Category[] = objArr(catalogRecord.categories).map((c) => ({
    id: str(c.id),
    name: str(c.name),
  }));
  const teachers: Teacher[] = objArr(catalogRecord.teachers).map((t) => ({
    id: str(t.id),
    name: str(t.name),
    title: str(t.title),
    avatar: str(t.avatar),
    rating: num(t.rating),
    students: num(t.students),
  }));

  const reviews: Review[] = [];
  const projects: Project[] = [];
  const questions: QaQuestion[] = [];

  const courses: Course[] = rawCourses.map((c) => {
    const courseId = str(c.id);
    let firstLessonPending = true;
    const chapters: Chapter[] = objArr(c.chapters)
      .slice()
      .sort((a, b) => num(a.order) - num(b.order))
      .map((ch) => {
        const lessons: Lesson[] = objArr(ch.lessons).map((l) => {
          const status = firstLessonPending ? 'current' : 'locked';
          firstLessonPending = false;
          return { id: str(l.id), title: str(l.title), duration: str(l.duration), status };
        });
        return { id: str(ch.id), order: num(ch.order), title: str(ch.title), lessons };
      });

    objArr(c.reviews).forEach((r, i) => {
      reviews.push({
        id: str(r.id) || `${courseId}-rev${i + 1}`,
        courseId,
        author: str(r.author),
        rating: num(r.rating),
        comment: str(r.comment),
      });
    });
    objArr(c.projects).forEach((p, i) => {
      projects.push({
        id: str(p.id) || `${courseId}-proj${i + 1}`,
        courseId,
        author: str(p.author),
        title: str(p.title),
        description: str(p.description),
        resources: strArr(p.resources),
      });
    });
    // Nested questions carry no comments (comments are not seeded).
    objArr(c.questions).forEach((q, i) => {
      questions.push({
        id: str(q.id) || `${courseId}-q${i + 1}`,
        courseId,
        author: str(q.author),
        text: str(q.text),
        likes: num(q.likes),
        comments: [],
      });
    });

    return {
      id: courseId,
      title: str(c.title),
      categoryId: str(c.categoryId),
      teacherId: str(c.teacherId),
      thumbnail: str(c.thumbnail),
      rating: num(c.rating),
      ratingCount: num(c.ratingCount),
      price: num(c.price),
      originalPrice: num(c.originalPrice),
      description: str(c.description),
      benefits: strArr(c.benefits),
      chapters,
    };
  });

  return { categories, teachers, courses, reviews, projects, questions };
}

async function loadCatalogFromApi(): Promise<Catalog> {
  const [courses, catalog] = await Promise.all([fetchJson('/courses'), fetchJson('/catalog')]);
  return assembleCatalog(courses, catalog);
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
          '[api] mockapi fetch failed, using local mock data:',
          err instanceof Error ? err.message : String(err),
        );
        return localCatalog();
      });
    }
  }
  return catalogPromise;
}

// ---------------------------------------------------------------------------
// Public API (all catalog functions are async now)
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
