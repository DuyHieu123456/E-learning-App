// Local mock data — E-Learning App
// For now ALL data comes from this local file (no mockapi.io yet).
// src/services/api.ts reads from here; later it will switch to mockapi
// (EXPO_PUBLIC_API_URL) without changing the screens.
// Note: prices keep the mockup's USD numbers; discountPercent() computes the
// real % from price/originalPrice (259/1020 is ~75%, not a hard-coded 80%).

import type {
  Category, Chapter, Course, Currency, CourseStatus, Lesson, LessonStatus,
  PersistedState, Project, QaQuestion, Review, Teacher, UserProfile,
} from './types';

export const MOCK_CURRENCY: Currency = 'USD'; // giữ USD theo mockup, xem lưu ý đầu file

export const mockCategories: Category[] = [
  { id: 'cat-design', name: 'Design' },
  { id: 'cat-development', name: 'Development' },
  { id: 'cat-marketing', name: 'Marketing' },
  { id: 'cat-business', name: 'Business' },
  { id: 'cat-photography', name: 'Photography' },
  { id: 'cat-music', name: 'Music' },
];

export const mockTeachers: Teacher[] = [
  { id: 't-1', name: 'Anna Nguyen', title: 'UX Design Instructor', avatar: '', rating: 4.8, students: 12400 },
  { id: 't-2', name: 'Minh Tran', title: 'Mobile Development Instructor', avatar: '', rating: 4.7, students: 9800 },
  { id: 't-3', name: 'Linh Pham', title: 'Marketing Instructor', avatar: '', rating: 4.6, students: 7600 },
];

const uxChapters: Chapter[] = [
  {
    id: 'ux-ch1', order: 1, title: 'Introduction to UX Research',
    lessons: [
      { id: 'ux-l1', title: 'What is UX Research?', duration: '01:23', status: 'completed' },
      { id: 'ux-l2', title: 'Research methods overview', duration: '02:10', status: 'current' },
      { id: 'ux-l3', title: 'Planning your first study', duration: '01:45', status: 'locked' },
    ],
  },
  {
    id: 'ux-ch2', order: 2, title: 'Plan for your UX Research',
    lessons: [
      { id: 'ux-l4', title: 'Define research goals', duration: '01:50', status: 'locked' },
      { id: 'ux-l5', title: 'Recruit participants', duration: '02:05', status: 'locked' },
    ],
  },
  {
    id: 'ux-ch3', order: 3, title: 'Conduct UX research',
    lessons: [
      { id: 'ux-l6', title: 'Run a usability test', duration: '02:30', status: 'locked' },
      { id: 'ux-l7', title: 'Interview techniques', duration: '01:58', status: 'locked' },
    ],
  },
  {
    id: 'ux-ch4', order: 4, title: 'Analyze and present findings',
    lessons: [
      { id: 'ux-l8', title: 'Synthesize insights', duration: '02:12', status: 'locked' },
      { id: 'ux-l9', title: 'Present to stakeholders', duration: '01:40', status: 'locked' },
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
    teacherId: 't-1', thumbnail: '', rating: 4.5, ratingCount: 1233,
    price: 259, originalPrice: 1020,
    description: 'Learn how to plan, run and analyze UX research studies from start to finish.',
    benefits: ['Plan a complete research study', 'Run usability tests and interviews', 'Turn findings into design decisions'],
    chapters: uxChapters,
  },
  {
    id: 'c-react-native', title: 'React Native for Beginners', categoryId: 'cat-development',
    teacherId: 't-2', thumbnail: '', rating: 4.7, ratingCount: 860,
    price: 199, originalPrice: 799,
    description: 'Build your first mobile app with React Native and TypeScript.',
    benefits: ['Set up an Expo project', 'Build screens with navigation', 'Ship a working MVP'],
    chapters: simpleChapters('c-react-native', 12),
  },
  {
    id: 'c-marketing', title: 'Digital Marketing Essentials', categoryId: 'cat-marketing',
    teacherId: 't-3', thumbnail: '', rating: 4.4, ratingCount: 540,
    price: 149, originalPrice: 599,
    description: 'The core channels and metrics every marketer needs.',
    benefits: ['Plan a campaign', 'Read analytics with confidence'],
    chapters: simpleChapters('c-marketing', 10),
  },
  {
    id: 'c-ui-design', title: 'UI Design with Figma', categoryId: 'cat-design',
    teacherId: 't-1', thumbnail: '', rating: 4.6, ratingCount: 720,
    price: 179, originalPrice: 699,
    description: 'Design clean mobile interfaces in Figma, from wireframe to prototype.',
    benefits: ['Master Figma auto layout', 'Build a reusable component set'],
    chapters: simpleChapters('c-ui-design', 8),
  },
  {
    id: 'c-business', title: 'Business Communication', categoryId: 'cat-business',
    teacherId: 't-3', thumbnail: '', rating: 4.3, ratingCount: 310,
    price: 129, originalPrice: 499,
    description: 'Write and present clearly in a professional setting.',
    benefits: ['Structure a persuasive message', 'Present with confidence'],
    chapters: simpleChapters('c-business', 6),
  },
  {
    id: 'c-photo', title: 'Mobile Photography Basics', categoryId: 'cat-photography',
    teacherId: 't-2', thumbnail: '', rating: 4.5, ratingCount: 420,
    price: 99, originalPrice: 399,
    description: 'Take better photos with the phone you already own.',
    benefits: ['Understand light and composition', 'Edit on your phone'],
    chapters: simpleChapters('c-photo', 7),
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

// Trạng thái mẫu ban đầu: chưa bookmark, giỏ trống, chưa học bài nào.
// Khánh (Search/Learning) và Lộc (My Courses/Profile) dùng chung các hàm dưới đây.
export const initialPersistedState: PersistedState = {
  bookmarkedCourseIds: [],
  cart: [],
  progress: [],
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
