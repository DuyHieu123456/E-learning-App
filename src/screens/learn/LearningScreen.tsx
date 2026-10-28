// LearningScreen — owner: Khanh
// The "already bought / learning" view: internal tabs Lessons / Projects / Q&A.
// Kept separate from CourseDetailsScreen on purpose (see NAVIGATION-map.md).
//
// Real behaviour:
// - Lessons: lessons WITH a video open the LessonPlayer; lessons without
//   toggle complete/incomplete on tap. Progress is saved to AsyncStorage
//   and drives this screen, My Courses and Profile from one source.
// - Lessons tab also hosts the end-of-course Quiz entry (with the latest
//   saved score) and, at 100%, the completion Certificate button.
// - Projects: the submit form can attach a REAL file (Supabase Storage);
//   projects persist on-device and merge with catalog projects.
// - Q&A: posting, commenting, liking and deleting your own posts work.
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import ProgressBar from '../../components/ProgressBar';
import { newLocalId, useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useDisplayName, useSettings } from '../../context/SettingsContext';
import { getChapters, totalLessons } from '../../data/mockData';
import { useAsyncData } from '../../hooks/useAsyncData';
import type { RootStackParamList } from '../../navigation/types';
import {
  fetchCourseById,
  fetchProjectsForCourse,
  fetchQuestionsForCourse,
  fetchQuizForCourse,
} from '../../services/api';
import { pickProjectFile, uploadProjectFile } from '../../services/projectUpload';
import type { PickedFile } from '../../services/projectUpload';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  completedIdsFor,
  deriveLessonStatus,
  mergeProjects,
  mergeQuestions,
  progressPercentFor,
} from '../../utils/logic';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = NativeStackScreenProps<RootStackParamList, 'Learning'>['route'];
type Tab = 'lessons' | 'projects' | 'qa';

export default function LearningScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const app = useAppState();
  const { user } = useAuth();
  const author = useDisplayName(user?.name);
  const [tab, setTab] = useState<Tab>('lessons');

  // Project form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projFile, setProjFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  // Q&A form + per-question comment boxes
  const [questionText, setQuestionText] = useState('');
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const { data, loading, error, retry } = useAsyncData(async () => {
    const found = await fetchCourseById(route.params.courseId);
    if (!found) return null;
    const [projects, questions, quiz] = await Promise.all([
      fetchProjectsForCourse(found.id),
      fetchQuestionsForCourse(found.id),
      fetchQuizForCourse(found.id),
    ]);
    return { course: found, projects, questions, quiz };
  }, [route.params.courseId]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={retry} />;
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>{t('details.notFound')}</Text>
      </View>
    );
  }
  const { course, quiz } = data;
  const projects = mergeProjects(data.projects, app.state, course.id);
  const questions = mergeQuestions(data.questions, app.state, course.id);
  const completedIds = completedIdsFor(app.state, course.id);
  const lessonStatus = deriveLessonStatus(course, completedIds);
  const percent = progressPercentFor(app.state, course);
  const total = totalLessons(course);
  const lastScore = app.state.quizScores.find((s) => s.courseId === course.id);

  const chooseFile = async () => {
    const picked = await pickProjectFile();
    if (picked) {
      setProjFile(picked);
      setUploadFailed(false);
    }
  };

  const submitProject = async () => {
    if (!projTitle.trim()) return;
    let fileUrl: string | undefined;
    if (projFile) {
      setUploading(true);
      try {
        fileUrl = await uploadProjectFile(projFile);
      } catch {
        setUploadFailed(true); // keep the project, just without the file
      } finally {
        setUploading(false);
      }
    }
    app.addProject({
      id: newLocalId('my-p'),
      courseId: course.id,
      author,
      title: projTitle.trim(),
      description: projDesc.trim(),
      resources: projFile ? [projFile.name] : [],
      ...(fileUrl ? { fileUrl } : {}),
    });
    setProjTitle('');
    setProjDesc('');
    setProjFile(null);
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
      <Text style={styles.hint}>{t('learn.completedOf', { done: completedIds.length, total })}</Text>
      <ProgressBar percent={percent} />

      <View style={styles.tabRow}>
        {(['lessons', 'projects', 'qa'] as Tab[]).map((tb) => (
          <TouchableOpacity key={tb} onPress={() => setTab(tb)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === tb && styles.tabTextActive]}>
              {tb === 'qa' ? 'Q&A' : t(`learn.${tb}`)}
            </Text>
            {tab === tb ? <View style={styles.tabUnderline} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'lessons' && (
        <View>
          <Text style={styles.hint}>{t('learn.tapHint')}</Text>
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
                    onPress={() =>
                      lesson.videoUrl
                        ? navigation.navigate('LessonPlayer', { courseId: course.id, lessonId: lesson.id })
                        : app.toggleLessonComplete(course.id, lesson.id)
                    }
                  >
                    <Text style={styles.lessonNo}>{String(idx + 1).padStart(2, '0')}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.body, status === 'completed' && styles.lessonDone]}>
                        {lesson.title}
                      </Text>
                      <Text style={styles.hint}>
                        {lesson.duration} mins{lesson.videoUrl ? ' · Video' : ''}
                      </Text>
                    </View>
                    <Ionicons
                      name={
                        status === 'completed'
                          ? 'checkmark-circle'
                          : lesson.videoUrl
                            ? 'play-circle'
                            : status === 'current'
                              ? 'radio-button-on'
                              : 'lock-closed'
                      }
                      size={20}
                      color={status === 'completed' ? colors.price : colors.primary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <Text style={styles.sectionTitle}>{t('learn.quizTitle')}</Text>
          {quiz.length > 0 ? (
            <View>
              {lastScore ? (
                <Text style={styles.hint}>
                  {t('learn.quizLast', { correct: lastScore.correct, total: lastScore.total })}
                </Text>
              ) : null}
              <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate('Quiz', { courseId: course.id })}>
                <Text style={styles.submitText}>{t('learn.quizStart', { count: quiz.length })}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.hint}>{t('learn.noQuiz')}</Text>
          )}

          {percent >= 100 ? (
            <TouchableOpacity
              style={[styles.submitBtn, styles.certBtn]}
              onPress={() => navigation.navigate('Certificate', { courseId: course.id })}
            >
              <Text style={styles.submitText}>{t('learn.certBtn')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {tab === 'projects' && (
        <View>
          <Text style={styles.sectionTitle}>{t('learn.projectFormTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('learn.projectTitlePh')}
            placeholderTextColor={colors.textSecondary}
            value={projTitle}
            onChangeText={setProjTitle}
          />
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder={t('learn.projectDescPh')}
            placeholderTextColor={colors.textSecondary}
            value={projDesc}
            onChangeText={setProjDesc}
            multiline
          />
          <TouchableOpacity style={styles.pickBtn} onPress={chooseFile}>
            <Ionicons name="attach" size={18} color={colors.primaryDark} />
            <Text style={styles.pickText}>
              {projFile ? t('learn.fileChosen', { name: projFile.name }) : t('learn.pickFile')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, (!projTitle.trim() || uploading) && styles.submitBtnDisabled]}
            onPress={submitProject}
            disabled={!projTitle.trim() || uploading}
          >
            <Text style={styles.submitText}>{uploading ? t('learn.uploading') : t('learn.submitProject')}</Text>
          </TouchableOpacity>
          {uploadFailed ? <Text style={styles.warn}>{t('learn.uploadFailed')}</Text> : null}
          <Text style={styles.hint}>{t('learn.projectNote')}</Text>

          <Text style={styles.sectionTitle}>{t('learn.studentProjects')}</Text>
          {projects.length === 0 ? (
            <Text style={styles.hint}>{t('learn.noProjects')}</Text>
          ) : (
            projects.map((project) => {
              const mine = project.id.startsWith('my-p');
              return (
                <View key={project.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={[styles.bodyBold, { flex: 1 }]}>
                      {project.title}
                      {mine ? `  ·  ${t('learn.yourTag')}` : ''}
                    </Text>
                    {mine ? (
                      <TouchableOpacity onPress={() => app.removeProject(project.id)}>
                        <Text style={styles.deleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <Text style={styles.hint}>{project.author}</Text>
                  <Text style={styles.body}>{project.description}</Text>
                  {project.resources.length > 0 ? (
                    <View>
                      <Text style={styles.sectionTitle}>{t('learn.resources', { count: project.resources.length })}</Text>
                      {project.resources.map((res) => (
                        <Text key={res} style={styles.body}>
                          ⬇ {res}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {project.fileUrl ? (
                    <TouchableOpacity onPress={() => void Linking.openURL(project.fileUrl!)}>
                      <Text style={styles.linkText}>⬇ {t('learn.openFile')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      )}

      {tab === 'qa' && (
        <View>
          <View style={styles.askBox}>
            <TextInput
              style={styles.askInput}
              placeholder={t('learn.askPh')}
              placeholderTextColor={colors.textSecondary}
              value={questionText}
              onChangeText={setQuestionText}
              multiline
            />
            <TouchableOpacity
              style={[styles.submitBtn, !questionText.trim() && styles.submitBtnDisabled]}
              onPress={submitQuestion}
              disabled={!questionText.trim()}
            >
              <Text style={styles.submitText}>{t('learn.postQuestion')}</Text>
            </TouchableOpacity>
          </View>

          {questions.length === 0 ? (
            <Text style={styles.hint}>{t('learn.noQuestions')}</Text>
          ) : (
            questions.map((q) => {
              const liked = app.isLiked(q.id);
              const open = openCommentsFor === q.id;
              const mine = q.id.startsWith('my-q');
              return (
                <View key={q.id} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Text style={[styles.bodyBold, { flex: 1 }]}>
                      {q.author}
                      {mine ? `  ·  ${t('learn.yourQuestionTag')}` : ''}
                    </Text>
                    {mine ? (
                      <TouchableOpacity onPress={() => app.removeQuestion(q.id)}>
                        <Text style={styles.deleteText}>{t('common.delete')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
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
                      <Text style={styles.qaAction}>💬 {t('learn.comments', { count: q.comments.length })}</Text>
                    </TouchableOpacity>
                  </View>
                  {q.comments.map((cm, i) => (
                    <View key={`${q.id}-c${i}`} style={styles.commentRow}>
                      <Text style={styles.body}>
                        <Text style={styles.bodyBold}>{cm.author}: </Text>
                        {cm.text}
                      </Text>
                    </View>
                  ))}
                  {open ? (
                    <View style={styles.commentBox}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder={t('learn.commentPh')}
                        placeholderTextColor={colors.textSecondary}
                        value={commentText}
                        onChangeText={setCommentText}
                      />
                      <TouchableOpacity
                        style={[styles.commentSend, !commentText.trim() && styles.submitBtnDisabled]}
                        onPress={() => submitComment(q.id)}
                        disabled={!commentText.trim()}
                      >
                        <Text style={styles.submitText}>{t('common.send')}</Text>
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

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.lg },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: spacing.xxl },
    title: { ...typography.heading, color: c.text, marginBottom: spacing.xs },
    hint: { color: c.textSecondary, fontSize: 12 },
    body: { color: c.text, fontSize: 14, lineHeight: 20 },
    bodyBold: { color: c.text, fontSize: 14, fontWeight: '600' },
    sectionTitle: { ...typography.bodyBold, color: c.text, marginTop: spacing.lg, marginBottom: spacing.sm },
    tabRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tabBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
    tabText: { color: c.textSecondary, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: c.primary },
    tabUnderline: { height: 2, backgroundColor: c.primary, alignSelf: 'stretch', marginTop: spacing.xs },
    lessonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    lessonNo: { color: c.textSecondary, fontWeight: '600' },
    lessonDone: { textDecorationLine: 'line-through', color: c.textSecondary },
    input: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    inputMulti: { minHeight: 60, textAlignVertical: 'top' },
    pickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: c.surface,
    },
    pickText: { color: c.primaryDark, fontWeight: '600' },
    submitBtn: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    certBtn: { backgroundColor: c.banner },
    submitBtnDisabled: { opacity: 0.4 },
    submitText: { color: c.onPrimary, fontWeight: '700' },
    warn: { color: c.danger, marginTop: spacing.sm },
    deleteText: { color: c.danger, fontWeight: '600', fontSize: 13 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    linkText: { color: c.primaryDark, fontWeight: '600', marginTop: spacing.xs },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: 4,
    },
    askBox: { marginTop: spacing.lg, marginBottom: spacing.md },
    askInput: {
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.md,
      padding: spacing.md,
      minHeight: 56,
      textAlignVertical: 'top',
      marginBottom: spacing.sm,
    },
    qaActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
    qaAction: { color: c.textSecondary, fontWeight: '600', fontSize: 13 },
    qaActionActive: { color: c.danger },
    commentRow: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
      marginTop: spacing.xs,
    },
    commentBox: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    commentInput: {
      flex: 1,
      backgroundColor: c.background,
      color: c.text,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    commentSend: {
      backgroundColor: c.primary,
      borderRadius: radius.sm,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
  });
}
