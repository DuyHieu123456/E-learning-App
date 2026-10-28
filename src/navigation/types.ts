// Navigation param lists — E-Learning App
// Routes carry ONLY ids (courseId / teacherId); screens look the data up
// via getCourseById / getTeacherById so mock data changes never desync routes.
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  // NavigatorScreenParams lets stack screens jump straight to a tab,
  // e.g. after checkout: navigate('MainTabs', { screen: 'MyCourses' }).
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Onboarding: undefined;
  CourseDetails: { courseId: string };
  Learning: { courseId: string };
  LessonPlayer: { courseId: string; lessonId: string };
  Quiz: { courseId: string };
  Certificate: { courseId: string };
  SearchResults: { query?: string; categoryId?: string };
  TeacherProfile: { teacherId: string };
  Cart: undefined;
  Login: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  MyCourses: undefined;
  Profile: undefined;
};
