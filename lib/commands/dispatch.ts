import { callMrcp } from "../mrcpClient";
import { COMMAND_ALIASES, COMMAND_MAP } from "./registry";
import type { CommandSpec } from "../types";

/** Arguments that should swallow every remaining token as a single string. */
const JOINED_ARGS = new Set(["q", "task", "diffContent", "description"]);

export interface ParsedCommand {
  name: string;
  positionals: string[];
  flags: Record<string, string>;
}

/** Splits a command line, keeping quoted arguments intact. */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (const char of input.trim()) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

export function isCommandInput(input: string): boolean {
  return input.trim().startsWith("/");
}

/** Parses `/analyze https://github.com/x/y --foo=bar` into its parts. */
export function parseCommand(input: string): ParsedCommand | null {
  const tokens = tokenize(input);
  if (tokens.length === 0 || !tokens[0].startsWith("/")) return null;

  const name = tokens[0].slice(1).toLowerCase();
  const positionals: string[] = [];
  const flags: Record<string, string> = {};

  for (const token of tokens.slice(1)) {
    if (token.startsWith("--")) {
      const [key, ...rest] = token.slice(2).split("=");
      flags[key] = rest.join("=");
    } else {
      positionals.push(token);
    }
  }

  return { name, positionals, flags };
}

/** Accepts `owner/repo` and turns it into a full GitHub URL. */
export function normalizeRepo(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return `https://github.com/${trimmed}`;
  return trimmed;
}

export interface BuiltRequest {
  params: Record<string, string>;
  body: Record<string, unknown>;
  repo?: string;
}

/** Maps positional arguments and flags onto the engine's expected payload. */
export function buildRequest(spec: CommandSpec, parsed: ParsedCommand): BuiltRequest {
  const params: Record<string, string> = {};
  const body: Record<string, unknown> = {};
  let repo: string | undefined;

  let rest = parsed.positionals;
  if (spec.requiresRepo) {
    if (rest.length === 0) throw new Error(`Uso: ${spec.usage}`);
    repo = normalizeRepo(rest[0]);
    params.repo = repo;
    body.repoUrl = repo;
    rest = rest.slice(1);
  }

  (spec.args ?? []).forEach((arg, index) => {
    const value = JOINED_ARGS.has(arg) ? rest.slice(index).join(" ") : rest[index];
    if (value === undefined || value === "") return;
    if (spec.method === "POST") {
      body[arg] = arg === "modifiedFiles" ? value.split(",").map((entry) => entry.trim()) : value;
    } else {
      params[arg] = value;
    }
  });

  for (const [key, value] of Object.entries(parsed.flags)) {
    if (spec.method === "POST") body[key] = value;
    else params[key] = value;
  }

  return { params, body, repo };
}

export interface CommandResult {
  data: unknown;
  endpoint: string;
  transport: "direct" | "proxy";
  url: string;
  durationMs: number;
}

/** Executes a command against the live engine. Never returns fake data. */
export async function executeCommand(
  spec: CommandSpec,
  parsed: ParsedCommand,
  options: { transport?: "direct" | "proxy"; signal?: AbortSignal } = {}
): Promise<CommandResult> {
  const { params, body } = buildRequest(spec, parsed);
  const result = await callMrcp({
    endpoint: spec.endpoint as string,
    method: spec.method,
    params,
    body: spec.method === "POST" ? body : undefined,
    transport: options.transport ?? "direct",
    raw: spec.raw,
    signal: options.signal,
  });

  return {
    data: result.data,
    endpoint: spec.endpoint as string,
    transport: result.transport,
    url: result.url,
    durationMs: result.durationMs,
  };
}

export function findCommand(name: string): CommandSpec | undefined {
  const needle = name.toLowerCase();
  return COMMAND_MAP.get(needle) ?? COMMAND_MAP.get(COMMAND_ALIASES[needle] ?? "");
}

/** Commands whose name starts with the given prefix (slash autocomplete). */
export function suggestCommands(prefix: string): CommandSpec[] {
  const needle = prefix.replace(/^\//, "").toLowerCase();
  if (!needle) return [];
  return [...COMMAND_MAP.values()]
    .filter(
      (command) =>
        command.name.startsWith(needle) ||
        Object.entries(COMMAND_ALIASES).some(([alias, target]) => target === command.name && alias.startsWith(needle))
    )
    .slice(0, 8);
}
