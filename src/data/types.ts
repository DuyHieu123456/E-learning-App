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

// Tài khoản đăng nhập qua Supabase Auth (bảng auth.users do Supabase quản,
// KHÔNG phải bảng public do nhóm tự tạo). name lấy từ user_metadata khi
// đăng ký, thiếu thì suy từ phần trước @ của email.
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  user: AuthUser;
}

// Dữ liệu CÁ NHÂN lưu trên máy bằng AsyncStorage (không lên server):
// bookmark, giỏ, tiến độ, khóa học đã mua (checkout mô phỏng), giáo viên
// đã follow, và nội dung người dùng tự tạo trên máy này (review, project,
// câu hỏi Q&A, bình luận, lượt like). Nội dung tự tạo được GỘP với dữ
// liệu catalog từ Supabase khi hiển thị (xem src/utils/logic.ts).
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
  // Khóa học đã "mua" qua checkout mô phỏng ở Cart — đây là danh sách
  // hiện trong My Courses (vai trò như bảng enrollments, nhưng trên máy).
  purchasedCourseIds: string[];
  followedTeacherIds: string[];
  myReviews: Review[];
  myProjects: Project[];
  myQuestions: QaQuestion[];
  // Bình luận của người dùng trên câu hỏi CÓ SẴN từ server, khóa theo id
  // câu hỏi (bình luận trên câu hỏi tự tạo nằm ngay trong myQuestions).
  myComments: Record<string, QaComment[]>;
  likedQuestionIds: string[];
}
