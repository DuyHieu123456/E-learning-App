// AiChatScreen — Trợ lý học tập AI (Google Gemini)
// Chat with the AI study assistant. The assistant is grounded in the
// app's real catalog (see src/services/ai.ts): it can explain lessons,
// summarize a course and recommend courses that actually exist in the
// app. Opened from Home (general), CourseDetails ("Hỏi AI về khóa
// này") or Learning ("Giải thích bằng AI") — the optional courseId /
// lessonId route params become the conversation context.
// Like every personal action in the app, sending a message requires
// login (guests get the in-place AuthPrompt via useRequireAuth).
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../../components/DataState';
import { useSettings } from '../../context/SettingsContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { RootStackParamList } from '../../navigation/types';
import { askAi, isAiConfigured } from '../../services/ai';
import type { AiContext, AiTurn } from '../../services/ai';
import { fetchCourseById, fetchCourses, fetchTeachers } from '../../services/api';
import type { Course } from '../../data/types';
import type { Palette } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type RouteProps = NativeStackScreenProps<RootStackParamList, 'AiChat'>['route'];

interface Msg extends AiTurn {
  id: string;
}

let msgCounter = 0;
function newMsg(role: 'user' | 'model', text: string): Msg {
  msgCounter += 1;
  return { id: `m-${Date.now().toString(36)}-${msgCounter}`, role, text };
}

export default function AiChatScreen() {
  const route = useRoute<RouteProps>();
  const { courseId, lessonId } = route.params ?? {};
  const { colors } = useSettings();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const requireAuth = useRequireAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const { data, loading, error, retry } = useAsyncData(async () => {
    const [courses, teachers] = await Promise.all([fetchCourses(), fetchTeachers()]);
    const course: Course | undefined = courseId ? await fetchCourseById(courseId) : undefined;
    return { courses, teachers, course };
  }, [courseId]);

  if (loading) return <LoadingView />;
  if (error || !data) return <ErrorView message={error} onRetry={retry} />;

  const teacherNames: Record<string, string> = {};
  for (const teacher of data.teachers) teacherNames[teacher.id] = teacher.name;

  let context: AiContext | undefined;
  let lessonTitle: string | undefined;
  if (data.course) {
    if (lessonId) {
      for (const ch of data.course.chapters) {
        const found = ch.lessons.find((l) => l.id === lessonId);
        if (found) lessonTitle = found.title;
      }
    }
    context = { course: data.course, ...(lessonTitle ? { lessonTitle } : {}) };
  }

  const chips: string[] = [t('ai.chipBeginner'), t('ai.chipMobile')];
  if (context) chips.push(t('ai.chipSummary'));

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || sending) return;
    if (!requireAuth()) return;
    const history: AiTurn[] = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, newMsg('user', text)]);
    setInput('');
    setSending(true);
    const res = await askAi(history, text, data.courses, teacherNames, context);
    setMessages((prev) => [...prev, newMsg('model', res.ok ? res.text : res.error)]);
    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {context ? (
        <View style={styles.contextBar}>
          <Ionicons name="book-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.contextText} numberOfLines={1}>
            {lessonTitle
              ? t('ai.contextLesson', { title: lessonTitle })
              : t('ai.contextCourse', { title: context.course.title })}
          </Text>
        </View>
      ) : null}
      {!isAiConfigured() ? (
        <View style={styles.noticeBar}>
          <Text style={styles.noticeText}>{t('ai.notConfigured')}</Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={styles.empty}>{t('ai.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleModel]}>
            <Text style={item.role === 'user' ? styles.bubbleUserText : styles.bubbleModelText}>
              {item.text}
            </Text>
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View style={[styles.bubble, styles.bubbleModel, styles.thinkingRow]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.bubbleModelText}>{t('ai.thinking')}</Text>
            </View>
          ) : undefined
        }
      />

      {messages.length === 0 ? (
        <View style={styles.chipWrap}>
          {chips.map((chip) => (
            <TouchableOpacity key={chip} style={styles.chip} onPress={() => void send(chip)}>
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={t('ai.placeholder')}
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => void send()}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    contextBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    contextText: { color: c.primaryDark, fontWeight: '600', fontSize: 13, flex: 1 },
    noticeBar: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    noticeText: { color: c.danger, fontSize: 12, lineHeight: 17 },
    listContent: { padding: spacing.lg, gap: spacing.sm },
    empty: { color: c.textSecondary, textAlign: 'center', marginTop: spacing.xl, lineHeight: 20 },
    bubble: {
      maxWidth: '85%',
      borderRadius: radius.md,
      padding: spacing.md,
    },
    bubbleUser: { alignSelf: 'flex-end', backgroundColor: c.primary },
    bubbleModel: { alignSelf: 'flex-start', backgroundColor: c.surface },
    bubbleUserText: { color: c.onPrimary, fontSize: 14, lineHeight: 20 },
    bubbleModelText: { color: c.text, fontSize: 14, lineHeight: 20 },
    thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
    },
    chipText: { color: c.primaryDark, fontWeight: '600', fontSize: 13 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      color: c.text,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      maxHeight: 110,
      ...typography.body,
    },
    sendBtn: {
      backgroundColor: c.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
}
