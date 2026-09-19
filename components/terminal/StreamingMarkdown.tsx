"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown renderer designed for token-by-token streaming.
 *
 * Re-parsing the whole answer on every chunk is O(n²) and throws on
 * unterminated code fences, so we split the buffer at the last "safe"
 * boundary (a blank line outside a fence): everything before it is rendered
 * as Markdown and memoised, everything after it is rendered as plain text
 * until the paragraph or code block closes.
 */
const MarkdownChunk = memo(function MarkdownChunk({ text }: { text: string }) {
  return (
    <div className="prose-term">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
});

function splitAtSafeBoundary(text: string): { settled: string; tail: string } {
  const lines = text.split("\n");
  let insideFence = false;
  let lastSafe = -1;
  let offset = 0;

  for (const line of lines) {
    if (/^\s*```/.test(line)) insideFence = !insideFence;
    if (!insideFence && line.trim() === "") lastSafe = offset + line.length + 1;
    offset += line.length + 1;
  }

  // An open fence means the code block is incomplete: keep everything raw.
  if (insideFence || lastSafe <= 0 || lastSafe >= text.length) return { settled: "", tail: text };
  return { settled: text.slice(0, lastSafe), tail: text.slice(lastSafe) };
}

export function StreamingMarkdown({ text, streaming }: { text: string; streaming?: boolean }) {
  const { settled, tail } = splitAtSafeBoundary(text);

  return (
    <div className="text-term-text">
      {settled ? <MarkdownChunk text={settled} /> : null}
      {tail ? (
        <pre className="prose-term whitespace-pre-wrap break-words font-mono">{tail}</pre>
      ) : null}
      {streaming && !tail ? <span className="caret" /> : null}
    </div>
  );
}
