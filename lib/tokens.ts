/**
 * Token estimation helpers.
 *
 * We never guess the bill: the goal is only to warn the user *before* they
 * attach a big AST to the prompt. The heuristic (~4 chars per token) is the
 * usual rule of thumb for English/code and is deliberately conservative.
 */

export function estimateTokens(value: unknown): number {
  const json = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return Math.max(1, Math.ceil(json.length / 4));
}

/** Compact, model-friendly rendering of an MRCP payload for the prompt. */
export function serializeContext(label: string, value: unknown): string {
  return [
    `<contexto name="${label}">`,
    "```json",
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
    "```",
    "</contexto>",
  ].join("\n");
}

export function formatBytes(length: number): string {
  if (length < 1024) return `${length} B`;
  if (length < 1024 * 1024) return `${(length / 1024).toFixed(1)} KB`;
  return `${(length / (1024 * 1024)).toFixed(1)} MB`;
}
