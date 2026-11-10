// ai — Trợ lý học tập AI (Google Gemini) — E-Learning App
//
// The app calls the Gemini generateContent REST API directly with
// fetch (no backend, no SDK): React Native cannot use Spring AI (that
// is a Java library), so the mobile pattern is a thin REST client.
//
// Config (.env — Expo exposes EXPO_PUBLIC_* to the bundle):
//   EXPO_PUBLIC_GEMINI_API_KEY=<key from Google AI Studio>
//   EXPO_PUBLIC_GEMINI_MODEL=gemini-3.8-flash   (optional, this default)
//
// Grounding: the system prompt embeds the app's REAL catalog (course
// titles, teachers, VND prices, ratings — read from api.ts data by the
// caller) plus, when opened from a course/lesson, that course's lesson
// titles — so the assistant recommends only courses that exist in the
// app and explains the actual lesson being studied, instead of
// answering in a vacuum. This is the prompt-injection counterpart of
// the tool-calling design used in the group's Spring AI project.
//
// Safety: with no key configured, every entry point returns a clear
// "chưa cấu hình API key" result — the app never crashes. All errors
// are mapped to Vietnamese messages. NOTE (known limitation, also
// documented in the report): a client-side key can be extracted from
// the app bundle; acceptable for this coursework MVP, the production
// fix is proxying through a backend / Edge Function.
import { formatPrice } from '../data/mockData';
import type { Course, QuizQuestion } from '../data/types';

export const GEMINI_MODEL =
  (process.env.EXPO_PUBLIC_GEMINI_MODEL ?? '').trim() || 'gemini-3.8-flash';
const GEMINI_API_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '').trim();
const TIMEOUT_MS = 30000;
const MAX_HISTORY_TURNS = 10;

export function isAiConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}

export const AI_ERROR_NOT_CONFIGURED =
  'Trợ lý AI chưa được cấu hình API key. Nhóm cần tạo key miễn phí tại Google AI Studio và thêm EXPO_PUBLIC_GEMINI_API_KEY vào file .env rồi khởi động lại app.';
export const AI_ERROR_QUOTA =
  'Trợ lý AI đang hết hạn mức miễn phí (quota) hoặc bị giới hạn tốc độ. Thử lại sau ít phút.';
export const AI_ERROR_NETWORK =
  'Không kết nối được tới máy chủ AI. Kiểm tra mạng rồi thử lại.';
export const AI_ERROR_BAD_QUIZ =
  'AI trả về câu hỏi không đúng định dạng nên không hiển thị được. Thử tạo lại.';

export interface AiContext {
  course: Course;
  lessonTitle?: string;
}

export interface AiTurn {
  role: 'user' | 'model';
  text: string;
}

export type AiResult = { ok: true; text: string } | { ok: false; error: string };
export type AiQuizResult =
  | { ok: true; questions: QuizQuestion[] }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Prompt building (pure — unit tested)
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  courses: Course[],
  teacherNames: Record<string, string> = {},
  context?: AiContext,
): string {
  const lines: string[] = [
    'Bạn là trợ lý học tập AI của ứng dụng E-Learning App, hỗ trợ học viên Việt Nam học trực tuyến.',
    'QUY TẮC:',
    '- Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, thân thiện; cho ví dụ cụ thể khi giải thích kiến thức.',
    '- Khi tư vấn/gợi ý khóa học, CHỈ được nhắc tới các khóa trong danh sách dưới đây (kèm đúng giá tiền), không bịa khóa học khác.',
    '- Nếu học viên hỏi ngoài phạm vi học tập và các khóa học này, hãy khéo léo hướng về chủ đề học tập.',
    '',
    'DANH SÁCH KHÓA HỌC HIỆN CÓ TRONG APP:',
  ];
  for (const c of courses) {
    const teacher = teacherNames[c.teacherId];
    lines.push(
      `- "${c.title}"${teacher ? ` — Giảng viên: ${teacher}` : ''} — Giá: ${formatPrice(c.price)} — Đánh giá: ${c.rating}/5 (${c.ratingCount} lượt)`,
    );
  }
  if (context) {
    const lessonTitles = context.course.chapters
      .slice()
      .sort((a, b) => a.order - b.order)
      .flatMap((ch) => ch.lessons.map((l) => l.title));
    lines.push(
      '',
      `NGỮ CẢNH HIỆN TẠI: học viên đang xem khóa "${context.course.title}".`,
      `Các bài học của khóa: ${lessonTitles.join(' | ')}`,
    );
    if (context.lessonTitle) {
      lines.push(`Bài học học viên đang quan tâm: "${context.lessonTitle}".`);
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Gemini REST plumbing
// ---------------------------------------------------------------------------

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

async function callGemini(systemPrompt: string, contents: GeminiContent[]): Promise<AiResult> {
  if (!isAiConfigured()) return { ok: false, error: AI_ERROR_NOT_CONFIGURED };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.7 },
        }),
      },
    );
    if (res.status === 429) return { ok: false, error: AI_ERROR_QUOTA };
    if (!res.ok) {
      return {
        ok: false,
        error: `Trợ lý AI tạm thời không trả lời được (lỗi máy chủ ${res.status}). Thử lại sau.`,
      };
    }
    const json = (await res.json()) as GeminiResponse;
    const text = (json.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
    if (!text) return { ok: false, error: 'AI không trả về nội dung. Thử hỏi lại theo cách khác.' };
    return { ok: true, text };
  } catch {
    return { ok: false, error: AI_ERROR_NETWORK };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export async function askAi(
  history: AiTurn[],
  message: string,
  courses: Course[],
  teacherNames: Record<string, string> = {},
  context?: AiContext,
): Promise<AiResult> {
  if (!isAiConfigured()) return { ok: false, error: AI_ERROR_NOT_CONFIGURED };
  const contents: GeminiContent[] = [
    ...history.slice(-MAX_HISTORY_TURNS).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: 'user' as const, parts: [{ text: message }] },
  ];
  return callGemini(buildSystemPrompt(courses, teacherNames, context), contents);
}

// ---------------------------------------------------------------------------
// AI practice quiz (pure parser — unit tested)
// ---------------------------------------------------------------------------

// Extract and validate the JSON array Gemini was asked to return.
// Accepts surrounding prose / markdown fences; any shape violation
// (non-array, wrong option count, bad correctIndex, empty question)
// rejects the whole set — a partially broken quiz is never shown.
export function parsePracticeQuiz(raw: string, courseId: string): QuizQuestion[] | null {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const questions: QuizQuestion[] = [];
  for (const item of data as Record<string, unknown>[]) {
    const question = typeof item?.question === 'string' ? item.question.trim() : '';
    const options = Array.isArray(item?.options)
      ? item.options.map((o) => (typeof o === 'string' ? o.trim() : ''))
      : [];
    const correctIndex = item?.correctIndex;
    if (!question || options.length !== 4 || options.some((o) => !o)) return null;
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex > 3) return null;
    questions.push({
      id: `ai-q-${courseId}-${questions.length}`,
      courseId,
      question,
      options,
      correctIndex,
      explanation: typeof item.explanation === 'string' ? item.explanation : '',
    });
    if (questions.length >= 5) break;
  }
  return questions.length > 0 ? questions : null;
}

export async function generatePracticeQuiz(course: Course): Promise<AiQuizResult> {
  const lessonTitles = course.chapters
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((ch) => ch.lessons.map((l) => l.title));
  const system =
    'Bạn là giáo viên tạo câu hỏi trắc nghiệm ôn tập. CHỈ trả về một mảng JSON hợp lệ, không thêm bất kỳ chữ nào khác ngoài JSON.';
  const prompt = [
    `Tạo đúng 5 câu hỏi trắc nghiệm bằng tiếng Việt về khóa học "${course.title}".`,
    `Các bài học của khóa: ${lessonTitles.join(' | ')}`,
    'Mỗi phần tử của mảng JSON có dạng:',
    '{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..."}',
    'options phải có đúng 4 lựa chọn, correctIndex là số nguyên 0-3 chỉ đáp án đúng, explanation giải thích ngắn vì sao đúng.',
  ].join('\n');
  const res = await callGemini(system, [{ role: 'user', parts: [{ text: prompt }] }]);
  if (!res.ok) return res;
  const questions = parsePracticeQuiz(res.text, course.id);
  if (!questions) return { ok: false, error: AI_ERROR_BAD_QUIZ };
  return { ok: true, questions };
}
