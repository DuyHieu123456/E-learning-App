// MarkdownText — renders the small markdown subset Gemini answers use
// (see src/utils/markdown.ts) with real styles inside AI chat bubbles:
// **bold** becomes bold text, `*`/`-` lists become hanging-indent
// bullets, instead of showing raw asterisks in a plain <Text>.
// Used ONLY for AI (model) messages in AiChatScreen; user messages and
// the loading/error bubbles keep plain <Text>.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '../context/SettingsContext';
import type { Palette } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { blockPlainText, parseMarkdown } from '../utils/markdown';
import type { InlineSpan, MarkdownBlock } from '../utils/markdown';

type Styles = ReturnType<typeof createStyles>;

function renderSpans(spans: InlineSpan[], styles: Styles): ReactElement[] {
  return spans.map((span, i) => (
    <Text
      key={i}
      style={[
        span.bold ? styles.bold : undefined,
        span.italic ? styles.italic : undefined,
        span.code ? styles.code : undefined,
      ]}
    >
      {span.text}
    </Text>
  ));
}

function renderBlock(block: MarkdownBlock, key: number, styles: Styles): ReactElement {
  switch (block.type) {
    case 'heading': {
      const size =
        block.level === 1 ? styles.heading1 : block.level === 2 ? styles.heading2 : styles.heading3;
      return (
        <Text key={key} style={[styles.base, size]}>
          {renderSpans(block.spans, styles)}
        </Text>
      );
    }
    case 'bullet':
      return (
        <View key={key} style={[styles.listRow, block.level > 0 ? styles.listRowNested : undefined]}>
          <Text style={[styles.base, styles.glyph]}>•</Text>
          <Text style={[styles.base, styles.listText]}>{renderSpans(block.spans, styles)}</Text>
        </View>
      );
    case 'numbered':
      return (
        <View key={key} style={[styles.listRow, block.level > 0 ? styles.listRowNested : undefined]}>
          <Text style={[styles.base, styles.numberGlyph]}>{block.marker}</Text>
          <Text style={[styles.base, styles.listText]}>{renderSpans(block.spans, styles)}</Text>
        </View>
      );
    default:
      return (
        <Text key={key} style={styles.base}>
          {renderSpans(block.spans, styles)}
        </Text>
      );
  }
}

export default function MarkdownText({ text }: { text: string }) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  // Plain fallback text for accessibility tools / copy: same content,
  // markers stripped (blockPlainText of each block joined by newlines).
  const plain = useMemo(() => blocks.map(blockPlainText).join('\n'), [blocks]);
  return (
    <View style={styles.root} accessible accessibilityLabel={plain}>
      {blocks.map((block, i) => renderBlock(block, i, styles))}
    </View>
  );
}

function createStyles(c: Palette) {
  return StyleSheet.create({
    root: { gap: spacing.xs },
    // Matches AiChatScreen's bubbleModelText (14/20, palette text color)
    // so markdown and plain AI text look identical where no markup is used.
    base: { color: c.text, fontSize: 14, lineHeight: 20 },
    bold: { fontWeight: '700' },
    italic: { fontStyle: 'italic' },
    code: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      backgroundColor: c.border,
    },
    heading1: { fontSize: 17, lineHeight: 23, fontWeight: '700' },
    heading2: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
    heading3: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
    listRow: { flexDirection: 'row', alignItems: 'flex-start' },
    listRowNested: { marginLeft: spacing.lg },
    glyph: { width: spacing.md, fontWeight: '700', color: c.primaryDark },
    numberGlyph: { width: spacing.xl, fontWeight: '600', color: c.primaryDark },
    listText: { flex: 1 },
  });
}
