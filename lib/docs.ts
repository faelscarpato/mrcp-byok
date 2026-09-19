import fs from "node:fs/promises";
import path from "node:path";

/**
 * Loader for the documentation site.
 *
 * Content lives in `content/docs/*.md` and is read at build time by the
 * `/docs/[slug]` route, which is statically generated. No CMS, no database.
 */

export const DOCS_DIR = path.join(process.cwd(), "content", "docs");

/** Explicit navigation order (file order on disk is not guaranteed). */
export const DOC_ORDER = [
  "visao-geral",
  "chat-streaming",
  "byok",
  "proxy",
  "wizards",
  "contexto-opt-in",
  "mobile",
  "comandos",
  "respostas-reais",
];

export interface DocMeta {
  slug: string;
  title: string;
  summary: string;
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function firstHeading(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Sem título";
}

function firstParagraph(markdown: string): string {
  const match = markdown.match(/^(?!#)(.+)$/m);
  return match ? match[1].trim().slice(0, 160) : "";
}

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const fenceFree = markdown.replace(/```[\s\S]*?```/g, "");
  for (const line of fenceFree.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;
    const text = match[2].trim();
    headings.push({ id: slugifyHeading(text), text, level: match[1].length === 2 ? 2 : 3 });
  }
  return headings;
}

export async function listDocs(): Promise<DocMeta[]> {
  const entries = await fs.readdir(DOCS_DIR).catch(() => []);
  const slugs = entries
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => entry.replace(/\.md$/, ""))
    .sort((a, b) => DOC_ORDER.indexOf(a) - DOC_ORDER.indexOf(b));

  return Promise.all(
    slugs.map(async (slug) => {
      const raw = await fs.readFile(path.join(DOCS_DIR, `${slug}.md`), "utf-8");
      return { slug, title: firstHeading(raw), summary: firstParagraph(raw) };
    })
  );
}

export async function getDoc(slug: string): Promise<{ meta: DocMeta; content: string } | null> {
  try {
    const raw = await fs.readFile(path.join(DOCS_DIR, `${slug}.md`), "utf-8");
    return {
      meta: { slug, title: firstHeading(raw), summary: firstParagraph(raw) },
      content: raw.replace(/^#\s+.+$/m, "").trim(),
    };
  } catch {
    return null;
  }
}
