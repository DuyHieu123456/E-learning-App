// RootNavigator — E-Learning App (shared file, owner: Hieu)
// Entry flow (gates, in order):
//   1. Settings/Auth still loading -> splash loading view.
//   2. First launch ever -> Onboarding (once).
//   3. Not signed in and never chose "continue as guest" -> Login screen
//      first (SOFT gate: the guest link on that screen skips the gate).
//   4. Otherwise -> the full app (MainTabs + stack screens).
// Stack (root) -> MainTabs (bottom tabs) + stack screens.
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { LoadingView } from '../components/DataState';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import LoginScreen from '../screens/auth/LoginScreen';
import CartScreen from '../screens/cart/CartScreen';
import CertificateScreen from '../screens/course/CertificateScreen';
import CourseDetailsScreen from '../screens/course/CourseDetailsScreen';
import HomeScreen from '../screens/home/HomeScreen';
import LearningScreen from '../screens/learn/LearningScreen';
import LessonPlayerScreen from '../screens/learn/LessonPlayerScreen';
import QuizScreen from '../screens/learn/QuizScreen';
import MyCoursesScreen from '../screens/mycourses/MyCoursesScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import SearchScreen from '../screens/search/SearchScreen';
import SearchResultsScreen from '../screens/search/SearchResultsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { colors } = useSettings();
  const { t } = useTranslation();
  const icon =
    (focusedName: string, outlineName: string) =>
    ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <Ionicons name={(focused ? focusedName : outlineName) as never} color={color} size={size} />
    );
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('tabs.home'), tabBarIcon: icon('home', 'home-outline') }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: t('tabs.search'), tabBarIcon: icon('search', 'search-outline') }}
      />
      <Tab.Screen
        name="MyCourses"
        component={MyCoursesScreen}
        options={{ title: t('tabs.myCourses'), tabBarIcon: icon('book', 'book-outline') }}
      />
      <Tab.Screen
        name="Profile"
        component={UserProfileScreen}
        options={{ title: t('tabs.profile'), tabBarIcon: icon('person', 'person-outline') }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, initializing } = useAuth();
  const settings = useSettings();
  const { t } = useTranslation();

  if (!settings.ready || initializing) return <LoadingView />;

  if (!settings.hasOnboarded) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('login.title') }} />
      </Stack.Navigator>
    );
  }

  if (!user && !settings.guestSkipped) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: t('details.title') }} />
      <Stack.Screen name="Learning" component={LearningScreen} options={{ title: t('learn.title') }} />
      <Stack.Screen name="LessonPlayer" component={LessonPlayerScreen} options={{ title: 'Video' }} />
      <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: t('quiz.title') }} />
      <Stack.Screen name="Certificate" component={CertificateScreen} options={{ title: t('certificate.title') }} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: t('tabs.search') }} />
      <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} options={{ title: t('teacher.title') }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: t('cart.title') }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('login.title') }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings.title') }} />
    </Stack.Navigator>
  );
}
