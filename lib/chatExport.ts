import type { Block } from "./types";

/**
 * Serialises the whole session as Markdown.
 *
 * Everything visible in the feed is exported: prompts, answers, analyses
 * (ASCII table + raw JSON) and errors. Nothing is uploaded — the file is
 * generated in the browser.
 */
export function buildSessionMarkdown(blocks: Block[]): string {
  const startedAt = blocks[0]?.at ?? Date.now();
  const lines: string[] = [];

  lines.push("# Conversa — MRCP Web Terminal");
  lines.push("");
  lines.push(`- Início: ${new Date(startedAt).toLocaleString("pt-BR")}`);
  lines.push(`- Blocos exportados: ${blocks.length}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const block of blocks) {
    const time = new Date(block.at).toLocaleTimeString("pt-BR", { hour12: false });

    switch (block.kind) {
      case "input":
        lines.push(`## ❯ Você · ${time}`);
        lines.push("");
        lines.push(block.text);
        lines.push("");
        break;

      case "stream": {
        const meta = block.provider || block.model ? ` (${block.provider ?? "?"} · ${block.model ?? "?"})` : "";
        lines.push(`## ◆ IA · ${time}${meta}`);
        lines.push("");
        lines.push(block.text || "_(sem conteúdo)_");
        lines.push("");
        break;
      }

      case "text":
        lines.push(`## ▸ Terminal · ${time}`);
        lines.push("");
        lines.push(block.text);
        lines.push("");
        break;

      case "table":
        lines.push(`## ▤ /api/${block.endpoint} · ${time}`);
        lines.push("");
        lines.push(`- transporte: ${block.transport}`);
        lines.push(`- duração: ${(block.durationMs / 1000).toFixed(1)}s`);
        lines.push("");
        lines.push("```text");
        lines.push(block.ascii);
        lines.push("```");
        lines.push("");
        lines.push("<details><summary>JSON bruto</summary>");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(block.json, null, 2));
        lines.push("```");
        lines.push("");
        lines.push("</details>");
        lines.push("");
        break;

      case "error":
        lines.push(`> ✖ ${time} — ${block.message}`);
        lines.push("");
        break;

      case "pending":
      case "wizard":
        break;
    }
  }

  return lines.join("\n");
}

/** Filename + Markdown body, ready to be downloaded. */
export function exportSession(blocks: Block[]): { filename: string; markdown: string } {
  const startedAt = blocks[0]?.at ?? Date.now();
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-").slice(0, 16);
  return { filename: `conversa-mrcp-${stamp}.md`, markdown: buildSessionMarkdown(blocks) };
}
