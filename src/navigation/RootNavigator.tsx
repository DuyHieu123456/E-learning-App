// RootNavigator — E-Learning App (shared file, owner: Hieu)
// Stack (root) -> MainTabs (bottom tabs) + stack screens for details/learning/cart.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import CartScreen from '../screens/cart/CartScreen';
import CourseDetailsScreen from '../screens/course/CourseDetailsScreen';
import HomeScreen from '../screens/home/HomeScreen';
import LearningScreen from '../screens/learn/LearningScreen';
import MyCoursesScreen from '../screens/mycourses/MyCoursesScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import SearchScreen from '../screens/search/SearchScreen';
import SearchResultsScreen from '../screens/search/SearchResultsScreen';
import TeacherProfileScreen from '../screens/teacher/TeacherProfileScreen';
import { colors } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function tabIcon(label: string) {
  return function TabIcon({ color }: { color: string }) {
    return <Text style={{ color, fontSize: 18 }}>{label}</Text>;
  };
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon('⌂') }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarIcon: tabIcon('⌕') }} />
      <Tab.Screen
        name="MyCourses"
        component={MyCoursesScreen}
        options={{ title: 'My Courses', tabBarLabel: 'My Courses', tabBarIcon: tabIcon('▤') }}
      />
      <Tab.Screen name="Profile" component={UserProfileScreen} options={{ tabBarIcon: tabIcon('◉') }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ title: 'Course details' }} />
      <Stack.Screen name="Learning" component={LearningScreen} options={{ title: 'Learning' }} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'Results' }} />
      <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} options={{ title: "Teacher's profile" }} />
      {/* Cart is a stack screen for now; if the group picks a modal later,
          only this route's `presentation` changes — params/files stay the same. */}
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
    </Stack.Navigator>
  );
}
