// UserProfileScreen — owner: Loc
// Real data throughout: the account comes from AuthContext (Supabase
// Auth / Google). The header shows the local display name / avatar
// when the user set them in "Edit profile" (SettingsContext override,
// Google identity untouched) and the Google name otherwise. The
// 2026-10-30 attempt at this broke because the avatar kept the
// picker's temporary cache URI; this version copies the picked image
// into the app's document folder first, so the URI is stable.
// Stats and Saved courses come from AppStateContext; order history
// lists past checkouts.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
import { AuthError } from '../../services/auth';
import type { Palette } from '../../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { groupOf, purchasedCourses } from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function UserProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, language } = useSettings();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, signOut, signInWithGoogle } = useAuth();
  // Display identity: the local override (Edit profile) wins, then the
  // Google account name; a guest is just "Khách".
  const displayName = useDisplayName(user?.name);
  const shownName = user ? displayName : t('common.guest');
  const app = useAppState();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');

  const openEditor = () => {
    setNameInput(settings.displayName);
    setAvatarInput(settings.avatarUri);
    setEditing(true);
  };

  const pickAvatar = async () => {
    try {
      // Lazy import: a dev build whose APK predates a library must not
      // crash the whole screen over the avatar picker.
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) setAvatarInput(result.assets[0].uri);
    } catch {
      // Picker unavailable on this build — leave the avatar unchanged.
    }
  };

  const saveProfile = async () => {
    let finalAvatar = avatarInput;
    // Copy a freshly picked image out of the picker cache into the
    // app's document folder — a cache URI is what broke the avatar
    // in the 2026-10-30 attempt. The whole copy sits in try/catch
    // around a lazy import: if the file-system library is unavailable
    // (older dev build), the picked URI is kept as-is instead of
    // crashing the save.
    if (finalAvatar && finalAvatar !== settings.avatarUri) {
      try {
        const { File, Paths } = await import('expo-file-system');
        if (!finalAvatar.startsWith(Paths.document.uri)) {
          const dest = new File(Paths.document, 'avatar.jpg');
          if (dest.exists) dest.delete();
          new File(finalAvatar).copy(dest);
          finalAvatar = dest.uri;
        }
      } catch {
        // Keep the picked URI as-is; worst case it falls back to the
        // letter avatar if the file disappears.
      }
    }
    settings.setProfile(nameInput.trim(), finalAvatar);
    setEditing(false);
  };

  // One-tap sign-in straight from the profile (owner request
  // 2026-10-30: no detour through the Login screen). On success the
  // AuthContext user flips and this screen re-renders signed-in.
  const signIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof AuthError ? err.message : t('login.failed'));
    } finally {
      setSigningIn(false);
    }
  };
  const { data: courses, loading, error, retry } = useAsyncData(() => fetchCourses());

  if (loading) return <LoadingView />;
  if (error || !courses) return <ErrorView message={error} onRetry={retry} />;
  const savedCourses = courses.filter((c) => app.state.bookmarkedCourseIds.includes(c.id));
  const owned = purchasedCourses(app.state, courses);
  const ongoingCount = owned.filter((c) => groupOf(app.state, c) === 'ongoing').length;
  const completedCount = owned.filter((c) => groupOf(app.state, c) === 'completed').length;
  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? id;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: spacing.lg + insets.top }]}>
      <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
        <Ionicons name="settings-outline" size={24} color={colors.text} />
        <Text style={styles.settingsText}>{t('profile.settings')}</Text>
      </TouchableOpacity>

      {settings.avatarUri ? (
        <Image source={{ uri: settings.avatarUri }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{shownName.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      {user ? (
        <View>
          <Text style={styles.name}>{shownName}</Text>
          <Text style={styles.title}>{user.email}</Text>
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.editBtn} onPress={openEditor}>
              <Text style={styles.editText}>{t('profile.editProfile')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={() => { settings.resetGuestSkip(); void signOut(); }}>
              <Text style={styles.logoutText}>{t('profile.logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <Text style={styles.name}>{shownName}</Text>
          <Text style={styles.title}>{t('profile.notLoggedIn')}</Text>
          <View style={styles.authRow}>
            <TouchableOpacity style={styles.loginBtn} onPress={() => void signIn()} disabled={signingIn}>
              <Text style={styles.loginText}>{signingIn ? t('login.opening') : t('profile.loginGoogle')}</Text>
            </TouchableOpacity>
          </View>
          {authError ? <Text style={styles.authError}>{authError}</Text> : null}
        </View>
      )}

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

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile.editProfile')}</Text>
            <TouchableOpacity onPress={() => void pickAvatar()} style={styles.modalAvatarWrap}>
              {avatarInput ? (
                <Image source={{ uri: avatarInput }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(nameInput.trim() || shownName).slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.changeAvatarText}>{t('profile.changeAvatar')}</Text>
            </TouchableOpacity>
            {avatarInput ? (
              <TouchableOpacity onPress={() => setAvatarInput('')}>
                <Text style={styles.removeAvatarText}>{t('profile.removeAvatar')}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.fieldLabel}>{t('profile.displayName')}</Text>
            <TextInput
              style={styles.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder={user?.name ?? t('profile.displayNamePh')}
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.hint}>{t('profile.displayNameHint')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => void saveProfile()}>
                <Text style={styles.saveText}>{t('profile.saveProfile')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    avatarImg: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignSelf: 'center',
      marginTop: spacing.lg,
      backgroundColor: c.banner,
    },
    profileActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    editBtn: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    editText: { color: c.primary, fontWeight: '700' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      backgroundColor: c.background,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    modalTitle: { ...typography.title, color: c.text, textAlign: 'center' },
    modalAvatarWrap: { alignItems: 'center', gap: spacing.xs },
    changeAvatarText: { color: c.primary, fontWeight: '600' },
    removeAvatarText: { color: c.danger, textAlign: 'center' },
    fieldLabel: { ...typography.bodyBold, color: c.text, marginTop: spacing.sm },
    input: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    cancelText: { color: c.text, fontWeight: '600' },
    saveBtn: {
      flex: 1,
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    saveText: { color: c.onPrimary, fontWeight: '700' },
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
    logoutBtn: { alignSelf: 'center' },
    logoutText: { color: c.danger, fontWeight: '600' },
    authError: { color: c.danger, textAlign: 'center', marginTop: spacing.sm },
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
