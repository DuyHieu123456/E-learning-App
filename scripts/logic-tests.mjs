// Logic tests — E-Learning App
// Compiles the pure modules (src/utils/logic.ts and, when present,
// src/services/ai.ts) to a temp dir with the project's own TypeScript
// and runs plain assertions in Node. No network is used: the AI tests
// only exercise pure helpers (prompt builder, quiz JSON parser) and the
// missing-API-key path, which returns before any fetch.
// Run: npm run test:logic
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = mkdtempSync(path.join(tmpdir(), 'elearn-logic-tests-'));

const inputs = [path.join(root, 'src/utils/logic.ts')];
const aiPath = path.join(root, 'src/services/ai.ts');
const hasAi = existsSync(aiPath);
if (hasAi) inputs.push(aiPath);

execFileSync(
  path.join(root, 'node_modules/.bin/tsc'),
  [
    ...inputs,
    '--ignoreConfig',
    '--ignoreDeprecations', '6.0',
    '--outDir', out,
    '--module', 'commonjs',
    '--target', 'es2021',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);

const require = createRequire(import.meta.url);
const logic = require(path.join(out, 'utils/logic.js'));

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed += 1;
    console.log(`  ok - ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL - ${name}`);
  }
}
function eq(name, actual, expected) {
  check(`${name} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`, actual === expected);
}

function course(partial) {
  return {
    id: 'c-x',
    title: '',
    categoryId: 'cat-1',
    teacherId: 't-1',
    thumbnail: '',
    rating: 4.5,
    ratingCount: 10,
    price: 100000,
    originalPrice: 200000,
    description: '',
    benefits: [],
    chapters: [],
    ...partial,
  };
}
const lesson = (id) => ({ id, title: id, duration: '05:00', status: 'locked' });

// ---------------------------------------------------------------------
console.log('normalizeText / diacritic-insensitive search');
eq('normalizeText strips tones', logic.normalizeText('Lập trình'), 'lap trinh');
eq('normalizeText maps Đ/đ', logic.normalizeText('Đồ họa & Thiết kế'), 'do hoa & thiet ke');
eq('normalizeText lowercases + collapses spaces', logic.normalizeText('  TIẾNG   Anh '), 'tieng anh');
eq('normalizeText keeps plain ascii', logic.normalizeText('React Native'), 'react native');

const catalog = [
  course({ id: 'c1', title: 'Lập trình React Native từ cơ bản', description: 'Xây dựng app mobile' }),
  course({ id: 'c2', title: 'Thiết kế UI/UX cho người mới', description: 'Figma cơ bản' }),
  course({ id: 'c3', title: 'Marketing số căn bản', description: 'Quảng cáo online', teacherId: 't-9', categoryId: 'cat-9' }),
];
eq('"lap trinh" matches "Lập trình"', logic.filterCourses(catalog, { query: 'lap trinh' }).map((c) => c.id).join(','), 'c1');
eq('"thiet ke" matches "Thiết kế"', logic.filterCourses(catalog, { query: 'thiet ke' }).map((c) => c.id).join(','), 'c2');
eq('mixed-case query matches', logic.filterCourses(catalog, { query: 'LậP TrÌnH' }).map((c) => c.id).join(','), 'c1');
eq('diacritic query matches ascii title',
  logic.filterCourses([course({ id: 'c9', title: 'Lap trinh Python co ban' })], { query: 'lập trình' }).length, 1);
eq('teacher name is searched (diacritic-free)',
  logic.filterCourses(catalog, { query: 'van duc', teacherNames: { 't-9': 'Nguyễn Văn Đức' } }).map((c) => c.id).join(','), 'c3');
eq('category name is searched (diacritic-free)',
  logic.filterCourses(catalog, { query: 'thiet ke', categoryNames: { 'cat-9': 'Thiết kế' } }).map((c) => c.id).join(','), 'c2,c3');
eq('non-matching query returns nothing', logic.filterCourses(catalog, { query: 'am nhac' }).length, 0);
eq('empty query returns all', logic.filterCourses(catalog, {}).length, 3);

// ---------------------------------------------------------------------
console.log('regression: cart / promo / progress / filters');
const priced = course({ id: 'p1', price: 400000, originalPrice: 500000 });
const cartState = { cart: [{ courseId: 'p1' }] };
const totals = logic.cartTotals(cartState, [priced], 'ELEARN10');
eq('cart subtotal', totals.subtotal, 400000);
eq('cart promo discount 10%', totals.promoDiscount, 40000);
eq('cart payable', totals.payable, 360000);
eq('promo code case-insensitive', logic.promoPercentFor('student20'), 20);
eq('unknown promo code', logic.promoPercentFor('XXX'), 0);

const progCourse = course({
  id: 'pc',
  chapters: [
    { id: 'ch1', order: 1, title: 'A', lessons: [lesson('l1'), lesson('l2')] },
    { id: 'ch2', order: 2, title: 'B', lessons: [lesson('l3')] },
  ],
});
const statusMap = logic.deriveLessonStatus(progCourse, ['l1']);
eq('completed lesson status', statusMap.get('l1'), 'completed');
eq('next lesson is current', statusMap.get('l2'), 'current');
eq('later lesson is locked', statusMap.get('l3'), 'locked');
eq('progress percent 1/3', logic.progressPercentFor({ progress: [{ courseId: 'pc', completedLessonIds: ['l1'] }] }, progCourse), 33);
eq('priceAsc sort', logic.filterCourses([course({ id: 'a', price: 2 }), course({ id: 'b', price: 1 })], { sort: 'priceAsc' }).map((c) => c.id).join(','), 'b,a');
eq('categoryId filter', logic.filterCourses(catalog, { categoryId: 'cat-9' }).map((c) => c.id).join(','), 'c3');
const merged = logic.mergeReviews(
  [{ id: 'r1', courseId: 'c1', author: 'A', rating: 5, comment: 'x' }],
  { myReviews: [{ id: 'my-r', courseId: 'c1', author: 'Me', rating: 4, comment: 'y' }] },
  'c1',
);
eq('mergeReviews puts mine first', merged[0].id, 'my-r');

// ---------------------------------------------------------------------
if (hasAi) {
  console.log('ai.ts pure helpers');
  const ai = require(path.join(out, 'services/ai.js'));
  const prompt = ai.buildSystemPrompt(
    [course({ id: 'c1', title: 'Lập trình React Native', price: 399000, rating: 4.8 })],
    { 't-1': 'Trần Văn An' },
  );
  check('system prompt contains course title', prompt.includes('Lập trình React Native'));
  check('system prompt contains price', prompt.includes('399'));
  check('system prompt contains teacher', prompt.includes('Trần Văn An'));

  const ctxPrompt = ai.buildSystemPrompt(catalog, {}, {
    course: { ...catalog[0], chapters: [{ id: 'ch', order: 1, title: 'Mở đầu', lessons: [lesson('Bài 1: Cài đặt')] }] },
  });
  check('system prompt contains lesson context', ctxPrompt.includes('Cài đặt'));

  const valid = JSON.stringify([
    { question: 'Q1?', options: ['a', 'b', 'c', 'd'], correctIndex: 2, explanation: 'Vì...' },
    { question: 'Q2?', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'Vì...' },
  ]);
  const parsed = ai.parsePracticeQuiz('Đây là câu hỏi:\n```json\n' + valid + '\n```', 'c1');
  check('parser accepts fenced JSON', Array.isArray(parsed) && parsed.length === 2);
  check('parser keeps correctIndex', parsed && parsed[0].correctIndex === 2);
  check('parser stamps courseId', parsed && parsed[0].courseId === 'c1');
  eq('parser rejects non-JSON', ai.parsePracticeQuiz('không phải json', 'c1'), null);
  eq('parser rejects wrong option count',
    ai.parsePracticeQuiz(JSON.stringify([{ question: 'Q?', options: ['a', 'b'], correctIndex: 0, explanation: '' }]), 'c1'), null);
  eq('parser rejects out-of-range correctIndex',
    ai.parsePracticeQuiz(JSON.stringify([{ question: 'Q?', options: ['a', 'b', 'c', 'd'], correctIndex: 7, explanation: '' }]), 'c1'), null);
  eq('parser rejects empty array', ai.parsePracticeQuiz('[]', 'c1'), null);

  if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
    const res = await ai.askAi([], 'Xin chào');
    check('missing key returns ok:false (no network)', res.ok === false);
    check('missing key error is the config message', !res.ok && res.error.includes('API key'));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
