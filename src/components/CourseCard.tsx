import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useSettings } from '../context/SettingsContext';
import { formatPrice, getTeacherById, totalLessons } from '../data/mockData';
import type { Course } from '../data/types';
import type { Palette } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import RatingStars from './RatingStars';

interface Props {
  course: Course;
  onPress?: (course: Course) => void;
}

// Shared course card used by Home, Search Results, Teacher Profile,
// Profile. Shows the real thumbnail image (expo-image) when the catalog
// provides one; falls back to a letter tile if the URL is empty/fails.
export default function CourseCard({ course, onPress }: Props) {
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [imgError, setImgError] = useState(false);
  const teacher = getTeacherById(course.teacherId);
  const showImage = !!course.thumbnail && !imgError;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(course)} activeOpacity={0.7}>
      {showImage ? (
        <Image
          source={{ uri: course.thumbnail }}
          style={styles.thumbImg}
          contentFit="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={styles.thumb}>
          <Text style={styles.thumbText}>{course.title.slice(0, 1)}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        {teacher ? <Text style={styles.teacher}>{teacher.name}</Text> : null}
        <Text style={styles.price}>{formatPrice(course.price)}</Text>
        <View style={styles.metaRow}>
          <RatingStars rating={course.rating} ratingCount={course.ratingCount} />
          <Text style={styles.meta}>{t('common.lessonsCount', { count: totalLessons(course) })}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: radius.sm,
      backgroundColor: c.banner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbImg: { width: 64, height: 64, borderRadius: radius.sm },
    thumbText: { color: '#fff', fontSize: 24, fontWeight: '700' },
    info: { flex: 1, gap: 2 },
    title: { fontSize: 15, fontWeight: '600', color: c.text },
    teacher: { fontSize: 12, color: c.textSecondary },
    price: { fontSize: 14, fontWeight: '700', color: c.price },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    meta: { fontSize: 12, color: c.textSecondary },
  });
}
