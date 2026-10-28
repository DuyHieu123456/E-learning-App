// Navigation param lists — E-Learning App
// Routes carry ONLY ids (courseId / teacherId); screens look the data up
// via getCourseById / getTeacherById so mock data changes never desync routes.
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  // NavigatorScreenParams lets stack screens jump straight to a tab,
  // e.g. after checkout: navigate('MainTabs', { screen: 'MyCourses' }).
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  CourseDetails: { courseId: string };
  Learning: { courseId: string };
  SearchResults: { query?: string; categoryId?: string };
  TeacherProfile: { teacherId: string };
  Cart: undefined;
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  MyCourses: undefined;
  Profile: undefined;
};
