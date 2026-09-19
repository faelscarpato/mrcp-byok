/**
 * Generic JSON -> monospaced ASCII table renderer.
 *
 * The MRCP Engine returns a different payload shape for each of its 26 routes,
 * so instead of writing 26 renderers we walk the payload, find the most
 * informative array of objects inside it, and draw it with box-drawing glyphs.
 */

export interface AsciiTableOptions {
  /** Maximum number of data rows rendered (the rest is summarised). */
  maxRows?: number;
  /** Maximum number of columns rendered. */
  maxCols?: number;
  /** Total table width in characters. */
  width?: number;
}

/**
 * Some payloads carry huge scalars (PageCloner returns the full `html` and a
 * multi-kilobyte `aiPrompt`). Dumping them would produce a "table" thousands
 * of columns wide, so anything above this size is omitted with a size note.
 */
const HEADER_OMIT_ABOVE = 400;
/** Cells are capped so one long value cannot stretch the whole table. */
const CELL_MAX = 60;

const BOX = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  leftTee: "├",
  rightTee: "┤",
  topTee: "┬",
  bottomTee: "┴",
  cross: "┼",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Flattens a cell value into a compact printable string. */
function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map(stringifyCell).join(", ");
  }
  if (isPlainObject(value)) {
    const json = JSON.stringify(value);
    return json.length > 60 ? `${json.slice(0, 57)}…` : json;
  }
  return String(value);
}

interface Candidate {
  path: string;
  rows: Record<string, unknown>[];
}

/**
 * Breadth-first search for the richest `Array<object>` in the payload.
 * "Richest" = most rows; ties are broken by the number of distinct keys.
 */
function findBestArray(node: unknown, path = "$", depth = 0): Candidate | null {
  if (depth > 6 || node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    if (node.length === 0) return null;
    if (node.every(isPlainObject)) return { path, rows: node as Record<string, unknown>[] };
    return null;
  }

  let best: Candidate | null = null;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const found = findBestArray(value, `${path}.${key}`, depth + 1);
    if (!found) continue;
    if (!best) {
      best = found;
      continue;
    }
    const bestKeys = new Set(best.rows.flatMap((r) => Object.keys(r))).size;
    const foundKeys = new Set(found.rows.flatMap((r) => Object.keys(r))).size;
    const better = found.rows.length > best.rows.length || (found.rows.length === best.rows.length && foundKeys > bestKeys);
    if (better) best = found;
  }
  return best;
}

/** Removes the single-key envelope (`{ status, code_health }`) when present. */
function unwrap(input: unknown): { header: Record<string, unknown>; body: unknown } {
  if (!isPlainObject(input)) return { header: {}, body: input };
  const keys = Object.keys(input);
  const header: Record<string, unknown> = {};
  for (const key of keys) {
    const value = input[key];
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) header[key] = value;
  }
  const objectKeys = keys.filter((k) => isPlainObject(input[k]) || Array.isArray(input[k]));
  const body = objectKeys.length === 1 ? input[objectKeys[0]] : input;
  return { header, body };
}

/** Rank columns by information density: fill rate, numeric-ness, brevity. */
function rankColumns(rows: Record<string, unknown>[], maxCols: number): string[] {
  const allKeys = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));

  const scored = [...allKeys].map((key) => {
    const values = rows.map((row) => stringifyCell(row[key]));
    const filled = values.filter((v) => v !== "—").length / rows.length;
    const numeric = values.every((v) => v === "—" || /^-?\d+(\.\d+)?$/.test(v)) ? 1 : 0;
    const avgLength = values.reduce((sum, v) => sum + v.length, 0) / rows.length;
    const score = filled * 3 + numeric - Math.min(avgLength, 60) / 40;
    return { key, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCols)
    .map((entry) => entry.key);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(1, max - 1))}…`;
}

function drawTable(headers: string[], rows: string[][], aligns: boolean[]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
  );

  const line = (left: string, fill: string, right: string, sep: string) =>
    `${left}${widths.map((w) => fill.repeat(w + 2)).join(sep)}${right}`;

  const out: string[] = [];
  out.push(line(BOX.topLeft, BOX.horizontal, BOX.topRight, BOX.topTee));
  out.push(
    `${BOX.vertical} ${headers
      .map((h, i) => truncate(h, widths[i]).padEnd(widths[i]))
      .join(` ${BOX.vertical} `)} ${BOX.vertical}`
  );
  out.push(line(BOX.leftTee, BOX.horizontal, BOX.rightTee, BOX.cross));
  for (const row of rows) {
    out.push(
      `${BOX.vertical} ${row
        .map((cell, i) => {
          const value = truncate(cell, widths[i]);
          return aligns[i] ? value.padStart(widths[i]) : value.padEnd(widths[i]);
        })
        .join(` ${BOX.vertical} `)} ${BOX.vertical}`
    );
  }
  out.push(line(BOX.bottomLeft, BOX.horizontal, BOX.bottomRight, BOX.bottomTee));
  return out.join("\n");
}

/**
 * Renders any MRCP payload as: an optional scalar header, the main table,
 * and a footer telling how much was omitted.
 */
export function jsonToAsciiTable(input: unknown, options: AsciiTableOptions = {}): string {
  const maxRows = options.maxRows ?? 12;
  const maxCols = options.maxCols ?? 6;
  const width = options.width ?? 108;

  const { header, body } = unwrap(input);
  const lines: string[] = [];

  const headerEntries = Object.entries(header).filter(([key]) => key !== "status");
  if (headerEntries.length > 0) {
    for (const [key, value] of headerEntries.slice(0, 8)) {
      const text = stringifyCell(value);
      if (text.length > HEADER_OMIT_ABOVE) {
        lines.push(`${key}: (${text.length} caracteres — use [ 📥 Baixar Análise ] para ver completo)`);
        continue;
      }
      lines.push(`${key}: ${text}`);
    }
    lines.push("");
  }

  const candidate = findBestArray(body);
  if (!candidate) {
    // Flat payload: fall back to a key/value table.
    const entries: [string, unknown][] = isPlainObject(body) ? Object.entries(body) : [["valor", body]];
    const rows: string[][] = entries.slice(0, maxRows).map(([key, value]) => [key, stringifyCell(value)]);
    lines.push(drawTable(["campo", "valor"], rows, [false, false]));
    if (entries.length > maxRows) lines.push(`… mais ${entries.length - maxRows} campos omitidos`);
    return lines.join("\n");
  }

  const columns = rankColumns(candidate.rows, maxCols);
  const visible = candidate.rows.slice(0, maxRows);
  const rows = visible.map((row) => columns.map((column) => truncate(stringifyCell(row[column]), CELL_MAX)));
  const aligns = columns.map((column) =>
    visible.every((row) => {
      const value = stringifyCell(row[column]);
      return value === "—" || /^-?\d+(\.\d+)?$/.test(value);
    })
  );

  lines.push(`fonte: ${candidate.path}`);
  lines.push(drawTable(columns, rows, aligns));

  const omittedRows = candidate.rows.length - visible.length;
  const omittedCols = new Set(candidate.rows.flatMap((r) => Object.keys(r))).size - columns.length;
  const notes: string[] = [];
  if (omittedRows > 0) notes.push(`${omittedRows} linha(s) omitida(s)`);
  if (omittedCols > 0) notes.push(`${omittedCols} coluna(s) omitida(s)`);
  if (notes.length > 0) lines.push(`… ${notes.join(" · ")} — use [ 📥 Baixar Análise ] para o JSON completo`);

  // Tables wider than the terminal are still readable; just warn.
  const widest = Math.max(...lines.map((line) => line.length));
  if (widest > width) lines.push(`(tabela com ${widest} colunas de largura — gire o dispositivo ou baixe o JSON)`);

  return lines.join("\n");
}
