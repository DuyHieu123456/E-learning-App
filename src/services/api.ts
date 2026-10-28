// Data service — E-Learning App (shared file, owner: Hieu)
//
// DAY-26 STATE: no backend yet. Every function below reads the LOCAL mock
// data in src/data/mockData.ts, synchronously. Screens should call these
// functions (not import mockData directly) so the switch stays painless.
//
// LATER (when the group creates the mockapi.io project): these functions
// will fetch from `process.env.EXPO_PUBLIC_API_URL` (mockapi REST API)
// and fall back to the local mock data on error — screens won't change.

import {
  getCourseById as getCourseByIdLocal,
  getTeacherById as getTeacherByIdLocal,
  mockCategories,
  mockCourses,
  mockProjects,
  mockQuestions,
  mockReviews,
  mockTeachers,
  mockUser,
} from '../data/mockData';
import type { Category, Course, Project, QaQuestion, Review, Teacher, UserProfile } from '../data/types';

export function fetchCategories(): Category[] {
  return mockCategories;
}

export function fetchCourses(): Course[] {
  return mockCourses;
}

export function fetchCourseById(id: string): Course | undefined {
  return getCourseByIdLocal(id);
}

export function fetchTeachers(): Teacher[] {
  return mockTeachers;
}

export function fetchTeacherById(id: string): Teacher | undefined {
  return getTeacherByIdLocal(id);
}

export function fetchReviewsForCourse(courseId: string): Review[] {
  return mockReviews.filter((r) => r.courseId === courseId);
}

export function fetchProjectsForCourse(courseId: string): Project[] {
  return mockProjects.filter((p) => p.courseId === courseId);
}

export function fetchQuestionsForCourse(courseId: string): QaQuestion[] {
  return mockQuestions.filter((q) => q.courseId === courseId);
}

export function fetchCurrentUser(): UserProfile {
  return mockUser;
}
