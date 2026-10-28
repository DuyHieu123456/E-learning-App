// Shared types — E-Learning App (from SRS-draft.md / TYPES-mock-data.ts)
// Owner of shared files: Hieu (Duy). Teammates: do not edit without telling Hieu.

export type Currency = 'USD' | 'VND';
export type LessonStatus = 'completed' | 'current' | 'locked';
// Trạng thái khóa học cho tab My Courses (FR-MYCOURSES-01): tab "All" hiển thị mọi
// khóa, nên trạng thái chỉ phân biệt not-started / ongoing / completed.
export type CourseStatus = 'not-started' | 'ongoing' | 'completed';

export interface Category {
  id: string;
  name: string;
}

export interface Teacher {
  id: string;
  name: string;
  title: string; // vd: "UX Design Instructor"
  avatar: string; // URL ảnh hoặc require() local — nhóm chốt 1 cách dùng chung
  rating: number; // 0–5
  students: number;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string; // dạng "01:23" như mẫu FR-DETAIL-03 (phút:giây)
  status: LessonStatus;
}

export interface Chapter {
  id: string;
  order: number; // 1..4, hiển thị dạng số La Mã I–IV ở UI
  title: string;
  lessons: Lesson[];
}

export interface Review {
  id: string;
  courseId: string;
  author: string;
  rating: number; // 1–5, dùng cho bộ lọc FR-DETAIL-04
  comment: string;
}

export interface Course {
  id: string;
  title: string;
  categoryId: string;
  teacherId: string;
  thumbnail: string;
  rating: number; // vd 4.5 (FR-DETAIL-02)
  ratingCount: number; // vd 1233
  price: number; // giá hiện tại, đơn vị = MOCK_CURRENCY (xem lưu ý đầu file)
  originalPrice: number;
  description: string;
  benefits: string[];
  chapters: Chapter[];
}

export interface Project {
  id: string;
  courseId: string;
  author: string;
  title: string;
  description: string;
  resources: string[]; // tên file/tài liệu tải xuống (FR-LEARN-03)
}

export interface QaComment {
  author: string;
  text: string;
}

export interface QaQuestion {
  id: string;
  courseId: string;
  author: string;
  text: string;
  likes: number;
  comments: QaComment[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

// Chỉ 3 thứ SRS/NFR-OFF-01 đã chốt lưu AsyncStorage: bookmark, giỏ, tiến độ.
// Tiến độ KHÔNG lưu % riêng: % tính từ completedLessonIds để khỏi lệch nhau.
export interface CartItem {
  courseId: string;
}

export interface CourseProgress {
  courseId: string;
  completedLessonIds: string[];
}

export interface PersistedState {
  bookmarkedCourseIds: string[];
  cart: CartItem[];
  progress: CourseProgress[];
}
