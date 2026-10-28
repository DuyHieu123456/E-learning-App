// Navigation param lists — E-Learning App
// Routes carry ONLY ids (courseId / teacherId); screens look the data up
// via getCourseById / getTeacherById so mock data changes never desync routes.

export type RootStackParamList = {
  MainTabs: undefined;
  CourseDetails: { courseId: string };
  Learning: { courseId: string };
  SearchResults: { query?: string; categoryId?: string };
  TeacherProfile: { teacherId: string };
  Cart: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  MyCourses: undefined;
  Profile: undefined;
};
