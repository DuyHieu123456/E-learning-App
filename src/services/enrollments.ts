// enrollments — real registration rows in public.enrollments (Supabase).
//
// PersistedState.purchasedCourseIds stays the app's working source for
// "my courses" (offline-first, mirrored to user_state). Since
// 2026-11-10 a successful checkout ALSO writes one row per purchased
// course into the enrollments table, so the learner–course relation
// from the ERD exists as real database rows (user_id -> auth.users,
// course_id -> courses), not only inside the user_state JSON document.
//
// Best-effort by design: duplicates are ignored server-side
// (Prefer: resolution=ignore-duplicates on the deterministic id), and
// ANY failure (offline, RLS, timeout) is swallowed — this side write
// must never break or delay checkout. Guests never reach it: checkout
// is login-gated (useRequireAuth in CartScreen) and this function also
// returns silently when there is no session.
import { getValidSession } from './auth';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

const TIMEOUT_MS = 10000;

export async function recordEnrollments(courseIds: string[]): Promise<void> {
  try {
    if (!isSupabaseConfigured() || courseIds.length === 0) return;
    const session = await getValidSession();
    if (!session) return;
    const rows = courseIds.map((courseId) => ({
      id: `enr_${session.user.id}_${courseId}`,
      user_id: session.user.id,
      course_id: courseId,
    }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/enrollments`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(rows),
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Best-effort side write — ignore every failure.
  }
}
