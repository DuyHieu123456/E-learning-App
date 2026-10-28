// LearningScreen — owner: Khanh
// The "already bought / learning" view: internal tabs Lessons / Projects / Q&A.
// Kept separate from CourseDetailsScreen on purpose (see NAVIGATION-map.md).
//
// Real behaviour:
// - Lessons: tapping a lesson toggles it complete/incomplete; the change
//   is saved to AsyncStorage and drives the progress bar here AND in
//   My Courses / Profile (single source: completedLessonIds).
// - Projects: the submit form really adds the project (stored on-device,
//   merged with catalog projects, survives app restarts).
// - Q&A: posting a question, commenting and liking all work the same
//   way — stored on-device and merged with the catalog threads.
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import ProgressBar from '../../components/ProgressBar';
import { newLocalId, useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { getChapters, totalLessons } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import { fetchCourseById, fetchProjectsForCourse, fetchQuestionsForCourse } from '../../services/api';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  completedIdsFor,
  deriveLessonStatus,
  mergeProjects,
  mergeQuestions,
  progressPercentFor,
} from '../../utils/logic';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'Learning'>['route'];
type Tab = 'lessons' | 'projects' | 'qa';

export default function LearningScreen() {
  const route = useRoute<RouteProps>();
  const app = useAppState();
  const { user } = useAuth();
  const author = user?.name ?? 'Bạn';
  const [tab, setTab] = useState<Tab>('lessons');

  // Project form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projFile, setProjFile] = useState('');
  // Q&A form + per-question comment boxes
  const [questionText, setQuestionText] = useState('');
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const { data, loading, error, retry } = useAsyncData(async () => {
    const found = await fetchCourseById(route.params.courseId);
    if (!found) return null;
    const [projects, questions] = await Promise.all([
      fetchProjectsForCourse(found.id),
      fetchQuestionsForCourse(found.id),
    ]);
    return { course: found, projects, questions };
  }, [route.params.courseId]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Course not found.</Text>
      </View>
    );
  }
  const { course } = data;
  const projects = mergeProjects(data.projects, app.state, course.id);
  const questions = mergeQuestions(data.questions, app.state, course.id);
  const completedIds = completedIdsFor(app.state, course.id);
  const lessonStatus = deriveLessonStatus(course, completedIds);
  const percent = progressPercentFor(app.state, course);
  const total = totalLessons(course);

  const submitProject = () => {
    if (!projTitle.trim()) return;
    app.addProject({
      id: newLocalId('my-p'),
      courseId: course.id,
      author,
      title: projTitle.trim(),
      description: projDesc.trim(),
      resources: projFile.trim() ? [projFile.trim()] : [],
    });
    setProjTitle('');
    setProjDesc('');
    setProjFile('');
  };

  const submitQuestion = () => {
    if (!questionText.trim()) return;
    app.addQuestion({
      id: newLocalId('my-q'),
      courseId: course.id,
      author,
      text: questionText.trim(),
      likes: 0,
      comments: [],
    });
    setQuestionText('');
  };

  const submitComment = (questionId: string) => {
    if (!commentText.trim()) return;
    app.addComment(questionId, { author, text: commentText.trim() });
    setCommentText('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.hint}>
        Đã hoàn thành {completedIds.length}/{total} bài học
      </Text>
      <ProgressBar percent={percent} />

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

      {tab === 'lessons' && (
        <View>
          <Text style={styles.hint}>Chạm vào một bài học để đánh dấu đã học xong (chạm lại để bỏ).</Text>
          {getChapters(course).map((chapter) => (
            <View key={chapter.id}>
              <Text style={styles.sectionTitle}>
                {chapter.order} - {chapter.title}
              </Text>
              {chapter.lessons.map((lesson, idx) => {
                const status = lessonStatus.get(lesson.id) ?? 'locked';
                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={styles.lessonRow}
                    onPress={() => app.toggleLessonComplete(course.id, lesson.id)}
                  >
                    <Text style={styles.lessonNo}>{String(idx + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.body, status === 'completed' && styles.lessonDone]}>
                        {lesson.title}
                      </Text>
                      <Text style={styles.hint}>{lesson.duration} mins</Text>
                    </View>
                    <Text style={[styles.statusIcon, status === 'completed' && styles.statusDone]}>
                      {status === 'completed' ? '✓' : status === 'current' ? '▶' : '🔒'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}

      {tab === 'projects' && (
        <View>
          <Text style={styles.sectionTitle}>Nộp project của bạn</Text>
          <TextInput style={styles.input} placeholder="Tên project *" value={projTitle} onChangeText={setProjTitle} />
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Mô tả ngắn về project"
            value={projDesc}
            onChangeText={setProjDesc}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Tên file đính kèm (vd: report.pdf)"
            value={projFile}
            onChangeText={setProjFile}
          />
          <TouchableOpacity
            style={[styles.submitBtn, !projTitle.trim() && styles.submitBtnDisabled]}
            onPress={submitProject}
            disabled={!projTitle.trim()}
          >
            <Text style={styles.submitText}>Nộp project</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Project được lưu trong app trên máy này và hiển thị ngay trong danh sách bên dưới.
          </Text>

          <Text style={styles.sectionTitle}>Student Projects</Text>
          {projects.length === 0 ? (
            <Text style={styles.hint}>No projects yet for this course.</Text>
          ) : (
            projects.map((project) => (
              <View key={project.id} style={styles.card}>
                <Text style={styles.bodyBold}>
                  {project.title}
                  {project.id.startsWith('my-p') ? '  ·  Của bạn' : ''}
                </Text>
                <Text style={styles.hint}>{project.author}</Text>
                <Text style={styles.body}>{project.description}</Text>
                {project.resources.length > 0 ? (
                  <View>
                    <Text style={styles.sectionTitle}>Resources ({project.resources.length})</Text>
                    {project.resources.map((res) => (
                      <Text key={res} style={styles.body}>
                        ⬇ {res}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'qa' && (
        <View>
          <View style={styles.askBox}>
            <TextInput
              style={styles.askInput}
              placeholder="Đặt câu hỏi về khóa học…"
              value={questionText}
              onChangeText={setQuestionText}
              multiline
            />
            <TouchableOpacity
              style={[styles.submitBtn, !questionText.trim() && styles.submitBtnDisabled]}
              onPress={submitQuestion}
              disabled={!questionText.trim()}
            >
              <Text style={styles.submitText}>Đăng câu hỏi</Text>
            </TouchableOpacity>
          </View>

          {questions.length === 0 ? (
            <Text style={styles.hint}>Chưa có câu hỏi nào cho khóa học này. Hãy là người đầu tiên!</Text>
          ) : (
            questions.map((q) => {
              const liked = app.isLiked(q.id);
              const open = openCommentsFor === q.id;
              return (
                <View key={q.id} style={styles.card}>
                  <Text style={styles.bodyBold}>
                    {q.author}
                    {q.id.startsWith('my-q') ? '  ·  Câu hỏi của bạn' : ''}
                  </Text>
                  <Text style={styles.body}>{q.text}</Text>
                  <View style={styles.qaActions}>
                    <TouchableOpacity onPress={() => app.toggleLike(q.id)}>
                      <Text style={[styles.qaAction, liked && styles.qaActionActive]}>♥ {q.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setOpenCommentsFor(open ? null : q.id);
                        setCommentText('');
                      }}
                    >
                      <Text style={styles.qaAction}>💬 {q.comments.length} Comment</Text>
                    </TouchableOpacity>
                  </View>
                  {q.comments.map((c, i) => (
                    <View key={`${q.id}-c${i}`} style={styles.commentRow}>
                      <Text style={styles.body}>
                        <Text style={styles.bodyBold}>{c.author}: </Text>
                        {c.text}
                      </Text>
                    </View>
                  ))}
                  {open ? (
                    <View style={styles.commentBox}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Viết bình luận…"
                        value={commentText}
                        onChangeText={setCommentText}
                      />
                      <TouchableOpacity
                        style={[styles.commentSend, !commentText.trim() && styles.submitBtnDisabled]}
                        onPress={() => submitComment(q.id)}
                        disabled={!commentText.trim()}
                      >
                        <Text style={styles.submitText}>Gửi</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
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
  lessonDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  statusIcon: { fontSize: 15 },
  statusDone: { color: colors.price, fontWeight: '800' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  inputMulti: { minHeight: 60, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  askBox: { marginTop: spacing.lg, marginBottom: spacing.md },
  askInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 56,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  qaActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  qaAction: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  qaActionActive: { color: colors.danger },
  commentRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  commentBox: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentSend: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
