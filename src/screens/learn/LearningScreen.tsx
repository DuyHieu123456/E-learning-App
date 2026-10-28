// LearningScreen — owner: Khanh
// The "already bought / learning" view: internal tabs Lessons / Projects / Q&A.
// Kept separate from CourseDetailsScreen on purpose (see NAVIGATION-map.md).
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getChapters } from '../../data/mockData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById, fetchProjectsForCourse, fetchQuestionsForCourse } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Learning'>['route'];
type Tab = 'lessons' | 'projects' | 'qa';

export default function LearningScreen() {
  const route = useRoute<RouteProps>();
  const [tab, setTab] = useState<Tab>('lessons');

  const course = fetchCourseById(route.params.courseId);
  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Course not found.</Text>
      </View>
    );
  }
  const projects = fetchProjectsForCourse(course.id);
  const questions = fetchQuestionsForCourse(course.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.hint}>♥ 231 Like · 16 Share (placeholder)</Text>

      <View style={styles.tabRow}>
        {(['lessons', 'projects', 'qa'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'qa' ? 'Q&A' : t.toUpperCase()}
            </Text>
            {tab === t ? <View style={styles.tabUnderline} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'lessons' &&
        getChapters(course).map((chapter) => (
          <View key={chapter.id}>
            <Text style={styles.sectionTitle}>
              {chapter.order} - {chapter.title}
            </Text>
            {chapter.lessons.map((lesson, idx) => (
              <View key={lesson.id} style={styles.lessonRow}>
                <Text style={styles.lessonNo}>{String(idx + 1).padStart(2, '0')}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.body}>{lesson.title}</Text>
                  <Text style={styles.hint}>{lesson.duration} mins</Text>
                </View>
                <Text style={styles.hint}>{lesson.status === 'completed' ? '✓' : '▶'}</Text>
              </View>
            ))}
          </View>
        ))}

      {tab === 'projects' && (
        <View>
          <View style={styles.uploadBox}>
            <Text style={styles.body}>Upload your project here (simulated)</Text>
          </View>
          <Text style={styles.sectionTitle}>Student Projects</Text>
          {projects.length === 0 ? (
            <Text style={styles.hint}>No projects yet for this course.</Text>
          ) : (
            projects.map((project) => (
              <View key={project.id} style={styles.card}>
                <Text style={styles.bodyBold}>{project.title}</Text>
                <Text style={styles.hint}>{project.author}</Text>
                <Text style={styles.body}>{project.description}</Text>
                <Text style={styles.sectionTitle}>Resources ({project.resources.length})</Text>
                {project.resources.map((res) => (
                  <Text key={res} style={styles.body}>
                    ⬇ {res}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'qa' && (
        <View>
          {questions.length === 0 ? (
            <Text style={styles.hint}>No questions yet for this course.</Text>
          ) : (
            questions.map((q) => (
              <View key={q.id} style={styles.card}>
                <Text style={styles.bodyBold}>{q.author}</Text>
                <Text style={styles.body}>{q.text}</Text>
                <Text style={styles.hint}>
                  ♥ {q.likes} · {q.comments.length} Comment
                </Text>
              </View>
            ))
          )}
          <View style={styles.qaInput}>
            <Text style={styles.hint}>Write a Q&A… (posting comes in week 2)</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
  title: { ...typography.heading, color: colors.text, marginBottom: spacing.xs },
  hint: { color: colors.textSecondary, fontSize: 12 },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bodyBold: { color: colors.text, fontSize: 14, fontWeight: '600' },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  tabText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: colors.primary },
  tabUnderline: { height: 2, backgroundColor: colors.primary, alignSelf: 'stretch', marginTop: spacing.xs },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lessonNo: { color: colors.textSecondary, fontWeight: '600' },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  qaInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
});
