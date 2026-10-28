// Local catalog data — E-Learning App
// This file is the OFFLINE FALLBACK for src/services/api.ts: the live
// catalog lives in Supabase (PostgreSQL) and this copy mirrors it, so the
// app still works with no network / no .env. Keep the two in sync — the
// seed/update SQL for Supabase is generated FROM this file.
// Prices are VND (formatPrice renders vi-VN). Course/teacher images are
// direct CDN URLs; components fall back to a letter tile if a URL fails.

import type {
  Category, Chapter, Course, Currency, CourseStatus, Lesson, LessonStatus,
  PersistedState, Project, QaQuestion, Review, Teacher, UserProfile,
} from './types';

export const MOCK_CURRENCY: Currency = 'VND';

const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=60`;

// Public sample videos (Google sample bucket) used as lecture-video
// placeholders for the flagship UX course — swap for real lecture URLs
// in the database (lessons.video_url) when the group produces them.
const vid = (name: string) =>
  `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;

export const mockCategories: Category[] = [
  { id: 'cat-design', name: 'Design' },
  { id: 'cat-development', name: 'Development' },
  { id: 'cat-marketing', name: 'Marketing' },
  { id: 'cat-business', name: 'Business' },
  { id: 'cat-photography', name: 'Photography' },
  { id: 'cat-music', name: 'Music' },
  { id: 'cat-art', name: 'Art & Illustration' },
];

export const mockTeachers: Teacher[] = [
  { id: 't-1', name: 'Anna Nguyen', title: 'UX Design Instructor', avatar: img('photo-1494790108377-be9c29b29330', 200), rating: 4.8, students: 12400 },
  { id: 't-2', name: 'Minh Tran', title: 'Mobile Development Instructor', avatar: img('photo-1472099645785-5658abf4ff4e', 200), rating: 4.7, students: 9800 },
  { id: 't-3', name: 'Linh Pham', title: 'Marketing Instructor', avatar: img('photo-1438761681033-6461ffad8d80', 200), rating: 4.6, students: 7600 },
  { id: 't-4', name: 'Duc Anh Hoang', title: 'Data & SQL Instructor', avatar: img('photo-1500648767791-00dcc994a43e', 200), rating: 4.5, students: 6200 },
  { id: 't-5', name: 'Mai Le', title: 'Art & Illustration Instructor', avatar: img('photo-1544005313-94ddf0286df2', 200), rating: 4.9, students: 4300 },
];

const uxChapters: Chapter[] = [
  {
    id: 'ux-ch1', order: 1, title: 'Introduction to UX Research',
    lessons: [
      { id: 'ux-l1', title: 'What is UX Research?', duration: '01:23', status: 'completed', videoUrl: vid('ForBiggerFun') },
      { id: 'ux-l2', title: 'Research methods overview', duration: '02:10', status: 'current', videoUrl: vid('ForBiggerBlazes') },
      { id: 'ux-l3', title: 'Planning your first study', duration: '01:45', status: 'locked', videoUrl: vid('ForBiggerEscapes') },
    ],
  },
  {
    id: 'ux-ch2', order: 2, title: 'Plan for your UX Research',
    lessons: [
      { id: 'ux-l4', title: 'Define research goals', duration: '01:50', status: 'locked', videoUrl: vid('ForBiggerJoyrides') },
      { id: 'ux-l5', title: 'Recruit participants', duration: '02:05', status: 'locked', videoUrl: vid('ForBiggerMeltdowns') },
    ],
  },
  {
    id: 'ux-ch3', order: 3, title: 'Conduct UX research',
    lessons: [
      { id: 'ux-l6', title: 'Run a usability test', duration: '02:30', status: 'locked', videoUrl: vid('BigBuckBunny') },
      { id: 'ux-l7', title: 'Interview techniques', duration: '01:58', status: 'locked', videoUrl: vid('ElephantsDream') },
    ],
  },
  {
    id: 'ux-ch4', order: 4, title: 'Analyze and present findings',
    lessons: [
      { id: 'ux-l8', title: 'Synthesize insights', duration: '02:12', status: 'locked', videoUrl: vid('Sintel') },
      { id: 'ux-l9', title: 'Present to stakeholders', duration: '01:40', status: 'locked', videoUrl: vid('TearsOfSteel') },
    ],
  },
];

function simpleChapters(courseId: string, count: number): Chapter[] {
  return [{
    id: `${courseId}-ch1`, order: 1, title: 'Course overview',
    lessons: Array.from({ length: count }, (_, i) => ({
      id: `${courseId}-l${i + 1}`,
      title: `Lesson ${i + 1}`,
      duration: '01:30',
      status: (i === 0 ? 'current' : 'locked') as LessonStatus,
    })),
  }];
}

export const mockCourses: Course[] = [
  {
    id: 'c-ux-research', title: 'UX Research Fundamentals', categoryId: 'cat-design',
    teacherId: 't-1', thumbnail: img('photo-1559028012-481c04fa702d'), rating: 4.5, ratingCount: 1233,
    price: 599000, originalPrice: 2399000,
    description: 'Learn how to plan, run and analyze UX research studies from start to finish.',
    benefits: ['Plan a complete research study', 'Run usability tests and interviews', 'Turn findings into design decisions'],
    chapters: uxChapters,
  },
  {
    id: 'c-react-native', title: 'React Native for Beginners', categoryId: 'cat-development',
    teacherId: 't-2', thumbnail: img('photo-1551650975-87deedd944c3'), rating: 4.7, ratingCount: 860,
    price: 459000, originalPrice: 1849000,
    description: 'Build your first mobile app with React Native and TypeScript.',
    benefits: ['Set up an Expo project', 'Build screens with navigation', 'Ship a working MVP'],
    chapters: simpleChapters('c-react-native', 12),
  },
  {
    id: 'c-marketing', title: 'Digital Marketing Essentials', categoryId: 'cat-marketing',
    teacherId: 't-3', thumbnail: img('photo-1460925895917-afdab827c52f'), rating: 4.4, ratingCount: 540,
    price: 349000, originalPrice: 1399000,
    description: 'The core channels and metrics every marketer needs.',
    benefits: ['Plan a campaign', 'Read analytics with confidence'],
    chapters: simpleChapters('c-marketing', 10),
  },
  {
    id: 'c-ui-design', title: 'UI Design with Figma', categoryId: 'cat-design',
    teacherId: 't-1', thumbnail: img('photo-1561070791-2526d30994b5'), rating: 4.6, ratingCount: 720,
    price: 419000, originalPrice: 1629000,
    description: 'Design clean mobile interfaces in Figma, from wireframe to prototype.',
    benefits: ['Master Figma auto layout', 'Build a reusable component set'],
    chapters: simpleChapters('c-ui-design', 8),
  },
  {
    id: 'c-business', title: 'Business Communication', categoryId: 'cat-business',
    teacherId: 't-3', thumbnail: img('photo-1507679799987-c73779587ccf'), rating: 4.3, ratingCount: 310,
    price: 299000, originalPrice: 1159000,
    description: 'Write and present clearly in a professional setting.',
    benefits: ['Structure a persuasive message', 'Present with confidence'],
    chapters: simpleChapters('c-business', 6),
  },
  {
    id: 'c-photo', title: 'Mobile Photography Basics', categoryId: 'cat-photography',
    teacherId: 't-2', thumbnail: img('photo-1516035069371-29a1b244cc32'), rating: 4.5, ratingCount: 420,
    price: 229000, originalPrice: 929000,
    description: 'Take better photos with the phone you already own.',
    benefits: ['Understand light and composition', 'Edit on your phone'],
    chapters: simpleChapters('c-photo', 7),
  },
  {
    id: 'c-python', title: 'Python for Beginners', categoryId: 'cat-development',
    teacherId: 't-2', thumbnail: img('photo-1526379095098-d400fd0bf935'), rating: 4.6, ratingCount: 980,
    price: 399000, originalPrice: 1499000,
    description: 'Start programming with Python: variables, loops, functions and your first scripts.',
    benefits: ['Write and run Python scripts', 'Work with lists, dicts and files', 'Build a small CLI project'],
    chapters: simpleChapters('c-python', 10),
  },
  {
    id: 'c-java', title: 'Java Fundamentals', categoryId: 'cat-development',
    teacherId: 't-2', thumbnail: img('photo-1517694712202-14dd9538aa97'), rating: 4.5, ratingCount: 1120,
    price: 439000, originalPrice: 1749000,
    description: 'Core Java and OOP: classes, inheritance, collections and exceptions.',
    benefits: ['Model problems with OOP', 'Use the Java collections framework', 'Handle errors with exceptions'],
    chapters: simpleChapters('c-java', 12),
  },
  {
    id: 'c-sql', title: 'SQL & Database Essentials', categoryId: 'cat-development',
    teacherId: 't-4', thumbnail: img('photo-1551288049-bebda4e38f71'), rating: 4.4, ratingCount: 460,
    price: 369000, originalPrice: 1459000,
    description: 'Query and design relational databases with confidence.',
    benefits: ['Write SELECT/JOIN queries fluently', 'Design tables with keys and relations', 'Read a real ERD'],
    chapters: simpleChapters('c-sql', 8),
  },
  {
    id: 'c-photoshop', title: 'Photoshop Essentials', categoryId: 'cat-design',
    teacherId: 't-1', thumbnail: img('photo-1626785774573-4b799315345d'), rating: 4.3, ratingCount: 380,
    price: 329000, originalPrice: 1279000,
    description: 'Layers, masks and retouching: the Photoshop toolkit every designer needs.',
    benefits: ['Work non-destructively with layers and masks', 'Retouch photos like a pro'],
    chapters: simpleChapters('c-photoshop', 9),
  },
  {
    id: 'c-watercolor', title: 'Watercolor Painting for Beginners', categoryId: 'cat-art',
    teacherId: 't-5', thumbnail: img('photo-1541961017774-22349e4a1262'), rating: 4.7, ratingCount: 290,
    price: 199000, originalPrice: 799000,
    description: 'Brush control, washes and color mixing — paint your first watercolor pieces.',
    benefits: ['Control water and pigment', 'Mix a harmonious palette', 'Paint a complete landscape'],
    chapters: simpleChapters('c-watercolor', 7),
  },
];

export const mockReviews: Review[] = [
  { id: 'r-1', courseId: 'c-ux-research', author: 'Student A', rating: 5, comment: 'Clear structure, easy to follow from the first lesson.' },
  { id: 'r-2', courseId: 'c-ux-research', author: 'Student B', rating: 4, comment: 'Good examples. I wish there were more practice exercises.' },
  { id: 'r-3', courseId: 'c-ux-research', author: 'Student C', rating: 5, comment: 'The research plan chapter alone is worth it.' },
];

export const mockProjects: Project[] = [
  {
    id: 'p-1', courseId: 'c-ux-research', author: 'Student A',
    title: 'Usability test report — food delivery app',
    description: 'Five-task usability test with findings and recommendations.',
    resources: ['test-script.pdf', 'findings-summary.pdf'],
  },
];

export const mockQuestions: QaQuestion[] = [
  {
    id: 'q-1', courseId: 'c-ux-research', author: 'Student B',
    text: 'How many participants do I need for a first usability test?',
    likes: 12,
    comments: [{ author: 'Student A', text: 'Five is a good start for finding major issues.' }],
  },
];

export const mockUser: UserProfile = { id: 'u-me', name: 'Hieu', avatar: '' };

// Trạng thái ban đầu: chưa bookmark, giỏ trống, chưa học/mua gì, chưa có
// nội dung tự tạo. Cả 3 thành viên dùng chung state này qua AppStateContext.
export const initialPersistedState: PersistedState = {
  bookmarkedCourseIds: [],
  cart: [],
  progress: [],
  purchasedCourseIds: [],
  followedTeacherIds: [],
  myReviews: [],
  myProjects: [],
  myQuestions: [],
  myComments: {},
  likedQuestionIds: [],
  orders: [],
  quizScores: [],
};

// ---------------------------------------------------------------- helpers (dùng chung, không phụ thuộc UI)

export function getCourseById(id: string): Course | undefined {
  return mockCourses.find((c) => c.id === id);
}

export function getTeacherById(id: string): Teacher | undefined {
  return mockTeachers.find((t) => t.id === id);
}

export function getChapters(course: Course): Chapter[] {
  return [...course.chapters].sort((a, b) => a.order - b.order);
}

export function totalLessons(course: Course): number {
  return course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
}

// % tiến độ (FR-MYCOURSES-02): chỉ đếm bài trong completedLessonIds.
export function courseProgressPercent(course: Course, completedLessonIds: string[]): number {
  const total = totalLessons(course);
  if (total === 0) return 0;
  const done = course.chapters
    .flatMap((ch) => ch.lessons)
    .filter((l) => completedLessonIds.includes(l.id)).length;
  return Math.round((done / total) * 100);
}

export function courseStatus(course: Course, completedLessonIds: string[]): CourseStatus {
  const pct = courseProgressPercent(course, completedLessonIds);
  if (pct >= 100) return 'completed';
  if (pct > 0) return 'ongoing';
  return 'not-started';
}

export function formatPrice(amount: number, currency: Currency = MOCK_CURRENCY): string {
  return currency === 'VND' ? `${amount.toLocaleString('vi-VN')}₫` : `$${amount}`;
}

export function discountPercent(course: Course): number {
  if (course.originalPrice <= 0) return 0;
  return Math.round((1 - course.price / course.originalPrice) * 100);
}
