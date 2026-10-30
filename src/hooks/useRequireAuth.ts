// useRequireAuth — gate for actions that need a signed-in user.
// Guests browse freely (Home, Search, course details, teacher pages),
// but personal/transactional actions — cart, checkout, bookmark,
// reviews, learning actions, project submit, Q&A, follow — send a
// guest to the Login screen instead of running. LoginScreen returns
// here automatically after a successful Google sign-in (goBack).
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

export function useRequireAuth() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (): boolean => {
    if (user) return true;
    navigation.navigate('Login');
    return false;
  };
}
