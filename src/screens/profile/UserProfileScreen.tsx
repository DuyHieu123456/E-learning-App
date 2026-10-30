// UserProfileScreen — owner: Loc
// Real data throughout: the account comes from AuthContext (Supabase
// Auth / Google); the display name/avatar can be overridden locally
// (SettingsContext, "Edit profile"); stats and Saved courses come from
// AppStateContext; order history lists past checkouts.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import CourseCard from '../../components/CourseCard';
import { ErrorView, LoadingView } from '../../components/DataState';
import SectionHeader from '../../components/SectionHeader';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useDisplayName, useSettings } from '../../context/SettingsContext';
import { formatPrice } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourses } from '../../services/api';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { groupOf, purchasedCourses } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function UserProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, language } = useSettings();
  const settings = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, signOut } = useAuth();
  const displayName = useDisplayName(user?.name);
  const app = useAppState();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;
  const savedCourses = courses.filter((c) => app.state.bookmarkedCourseIds.includes(c.id));
  const owned = purchasedCourses(app.state, courses);
  const ongoingCount = owned.filter((c) => groupOf(app.state, c) === 'ongoing').length;
  const completedCount = owned.filter((c) => groupOf(app.state, c) === 'completed').length;
  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? id;

  const startEdit = () => {
    setNameInput(settings.displayName || user?.name || '');
    setAvatarInput(settings.avatarUri);
    setEditing(true);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setAvatarInput(result.assets[0].uri);
  };

  const saveProfile = () => {
    settings.setProfile(nameInput.trim(), avatarInput);
    setEditing(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={24} color={colors.text} />
        <Text style={styles.settingsText}>{t('profile.settings')}</Text>
      </TouchableOpacity>

      {settings.avatarUri ? (
        <Image source={{ uri: settings.avatarUri }} style={styles.avatarImg} contentFit="cover" />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      {user ? (
        <View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.title}>{user.email}</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { settings.resetGuestSkip(); void signOut(); }}>
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.title}>{t('profile.notLoggedIn')}</Text>
          <View style={styles.authRow}>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>{t('profile.loginGoogle')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
        <Text style={styles.editText}>✎ {t('profile.editProfile')}</Text>
      </TouchableOpacity>
      {editing ? (
        <View style={styles.editBox}>
          <Text style={styles.hint}>{t('profile.displayName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('profile.displayNamePh')}
            placeholderTextColor={colors.textSecondary}
            value={nameInput}
            onChangeText={setNameInput}
          />
          <TouchableOpacity style={styles.pickBtn} onPress={pickAvatar}>
            <Text style={styles.pickText}>{t('profile.changeAvatar')}</Text>
          </TouchableOpacity>
          {avatarInput ? <Text style={styles.hint}>{avatarInput.split('/').slice(-1)[0]}</Text> : null}
          <TouchableOpacity style={styles.loginBtn} onPress={saveProfile}>
            <Text style={styles.loginText}>{t('profile.saveProfile')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{savedCourses.length}</Text>
          <Text style={styles.hint}>{t('profile.savedStat')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{ongoingCount}</Text>
          <Text style={styles.hint}>{t('profile.ongoingStat')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.hint}>{t('profile.completedStat')}</Text>
        </View>
      </View>

      <SectionHeader title={t('profile.savedCourses')} />
      {savedCourses.length === 0 ? <Text style={styles.hint}>{t('profile.noSaved')}</Text> : null}
      {savedCourses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onPress={(c) => navigation.navigate('CourseDetails', { courseId: c.id })}
        />
      ))}

      <SectionHeader title={t('profile.orders')} />
      {app.state.orders.length === 0 ? (
        <Text style={styles.hint}>{t('profile.noOrders')}</Text>
      ) : (
        app.state.orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <Text style={styles.orderDate}>
              {new Date(order.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')} ·{' '}
              {t('profile.orderLine', { count: order.courseIds.length })} · {formatPrice(order.total)}
              {order.promoCode ? ` · ${order.promoCode}` : ''}
            </Text>
            {order.courseIds.map((id) => (
              <Text key={id} style={styles.hint}>
                • {courseTitle(id)}
              </Text>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    settingsBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-end' },
    settingsText: { color: c.text, fontWeight: '600' },
    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: c.banner,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: spacing.lg,
    },
    avatarImg: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center', marginTop: spacing.lg },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    name: { ...typography.title, color: c.text, textAlign: 'center', marginTop: spacing.md },
    title: { color: c.textSecondary, textAlign: 'center', marginTop: 2 },
    authRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
    loginBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      alignSelf: 'center',
    },
    loginText: { color: c.onPrimary, fontWeight: '700' },
    logoutBtn: { alignSelf: 'center', marginTop: spacing.md },
    logoutText: { color: c.danger, fontWeight: '600' },
    editBtn: { alignSelf: 'center', marginTop: spacing.md },
    editText: { color: c.primaryDark, fontWeight: '600' },
    editBox: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    input: {
      backgroundColor: c.background,
      color: c.text,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    pickBtn: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    pickText: { color: c.primaryDark, fontWeight: '600' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.xl },
    stat: { alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800', color: c.text },
    hint: { color: c.textSecondary, fontSize: 12 },
    orderCard: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: 4,
    },
    orderDate: { fontWeight: '600', color: c.text },
  });
}
