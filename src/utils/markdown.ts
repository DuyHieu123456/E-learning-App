// markdown — tiny dependency-free markdown parser for AI chat answers
//
// Gemini answers in markdown (`**bold**` lead-ins, `*` bullet lists),
// but a chat bubble is a plain React Native <Text>: rendering the raw
// string shows literal asterisks ("**Lập trình:**"). This module parses
// the small markdown subset the assistant actually uses into typed
// blocks + inline spans that src/components/MarkdownText.tsx renders
// with real styles. It is pure (no imports, no React) so the logic-test
// harness can unit-test it in Node.
//
// Design rule: NEVER lose text. Any marker that cannot be matched
// (e.g. "**không đóng") degrades to literal text instead of throwing
// or swallowing content.

export interface InlineSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
}

export type MarkdownBlock =
  | { type: 'paragraph'; spans: InlineSpan[] }
  | { type: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { type: 'bullet'; level: number; spans: InlineSpan[] }
  | { type: 'numbered'; level: number; marker: string; spans: InlineSpan[] };

interface Flags {
  bold: boolean;
  italic: boolean;
  code: boolean;
}

const PLAIN: Flags = { bold: false, italic: false, code: false };

function pushSpan(spans: InlineSpan[], text: string, flags: Flags): void {
  if (!text) return;
  const last = spans[spans.length - 1];
  if (last && last.bold === flags.bold && last.italic === flags.italic && last.code === flags.code) {
    last.text += text;
  } else {
    spans.push({ text, bold: flags.bold, italic: flags.italic, code: flags.code });
  }
}

function pushInner(spans: InlineSpan[], inner: InlineSpan[]): void {
  for (const s of inner) pushSpan(spans, s.text, s);
}

// ---------------------------------------------------------------------------
// Inline parsing: **bold**, ***bold italic***, *italic*, _italic_, `code`
// ---------------------------------------------------------------------------

export function parseInline(text: string, base: Flags = PLAIN): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let buf = '';
  const flush = () => {
    pushSpan(spans, buf, base);
    buf = '';
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // `code` — verbatim until the closing backtick.
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        pushSpan(spans, text.slice(i + 1, end), { ...base, code: true });
        i = end + 1;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }

    // **bold** or ***bold italic***
    if (ch === '*' && text[i + 1] === '*') {
      const triple = text[i + 2] === '*';
      const marker = triple ? '***' : '**';
      const end = text.indexOf(marker, i + marker.length);
      if (end > i + marker.length) {
        flush();
        pushInner(
          spans,
          parseInline(text.slice(i + marker.length, end), {
            ...base,
            bold: true,
            italic: base.italic || triple,
          }),
        );
        i = end + marker.length;
        continue;
      }
      buf += '**'; // unmatched → literal, keep scanning after the marker
      i += 2;
      continue;
    }

    // *italic* — content must be non-empty and not padded with spaces,
    // so arithmetic like "2 * 3 * 4" stays literal.
    if (ch === '*') {
      const end = text.indexOf('*', i + 1);
      const content = end > i ? text.slice(i + 1, end) : '';
      if (end > i + 1 && content.trim() === content) {
        flush();
        pushInner(spans, parseInline(content, { ...base, italic: true }));
        i = end + 1;
        continue;
      }
      buf += '*';
      i += 1;
      continue;
    }

    // _italic_ — conservative: only at a word boundary, no spaces inside
    // (protects snake_case identifiers from being mangled).
    if (ch === '_') {
      const prevOk = i === 0 || /[\s(\["'“]/.test(text[i - 1]);
      let end = -1;
      if (prevOk) {
        let candidate = text.indexOf('_', i + 1);
        while (candidate !== -1) {
          const content = text.slice(i + 1, candidate);
          const nextOk =
            candidate === text.length - 1 || /[\s.,;:!?)”"]/.test(text[candidate + 1]);
          if (content.length > 0 && !content.includes(' ') && nextOk) {
            end = candidate;
            break;
          }
          candidate = text.indexOf('_', candidate + 1);
        }
      }
      if (end > i + 1) {
        flush();
        pushInner(spans, parseInline(text.slice(i + 1, end), { ...base, italic: true }));
        i = end + 1;
        continue;
      }
      buf += '_';
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }
  flush();
  return spans;
}

// ---------------------------------------------------------------------------
// Block parsing: paragraphs, # headings, - / * / • bullets (1 nesting
// level from leading spaces), 1. numbered items
// ---------------------------------------------------------------------------

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const BULLET_RE = /^([ \t]*)[-*•]\s+(.+)$/;
const NUMBERED_RE = /^([ \t]*)(\d{1,3})[.)]\s+(.+)$/;

function indentLevel(indent: string): number {
  let width = 0;
  for (const c of indent) width += c === '\t' ? 4 : 1;
  return Math.min(1, Math.floor(width / 2));
}

export function parseMarkdown(input: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paraLines: string[] = [];

  const flushParagraph = () => {
    if (paraLines.length === 0) return;
    const spans: InlineSpan[] = [];
    paraLines.forEach((line, idx) => {
      if (idx > 0) pushSpan(spans, '\n', PLAIN);
      pushInner(spans, parseInline(line));
    });
    if (spans.length > 0) blocks.push({ type: 'paragraph', spans });
    paraLines = [];
  };

  for (const rawLine of input.replace(/\r\n?/g, '\n').split('\n')) {
    if (!rawLine.trim()) {
      flushParagraph();
      continue;
    }
    const heading = rawLine.match(HEADING_RE);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        spans: parseInline(heading[2].trim()),
      });
      continue;
    }
    const bullet = rawLine.match(BULLET_RE);
    if (bullet) {
      flushParagraph();
      blocks.push({
        type: 'bullet',
        level: indentLevel(bullet[1]),
        spans: parseInline(bullet[2].trim()),
      });
      continue;
    }
    const numbered = rawLine.match(NUMBERED_RE);
    if (numbered) {
      flushParagraph();
      blocks.push({
        type: 'numbered',
        level: indentLevel(numbered[1]),
        marker: `${numbered[2]}.`,
        spans: parseInline(numbered[3].trim()),
      });
      continue;
    }
    paraLines.push(rawLine.trim());
  }
  flushParagraph();
  return blocks;
}

// ---------------------------------------------------------------------------
// Helpers (used by tests and any plain-text fallback)
// ---------------------------------------------------------------------------

export function spansPlainText(spans: InlineSpan[]): string {
  return spans.map((s) => s.text).join('');
}

export function blockPlainText(block: MarkdownBlock): string {
  const text = spansPlainText(block.spans);
  return block.type === 'numbered' ? `${block.marker} ${text}` : text;
}
