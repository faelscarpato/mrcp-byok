/**
 * Shared domain types for the MRCP Web Terminal.
 *
 * Convention: code identifiers and comments are written in English so the
 * repository stays readable for international contributors, while every
 * user-facing string is written in Brazilian Portuguese (pt-BR).
 */

export type ProviderId = "openai" | "gemini" | "anthropic" | "nvidia" | "custom";

/** Static description of a LLM provider (endpoints, defaults, docs). */
export interface ProviderSpec {
  id: ProviderId;
  label: string;
  /** Default base URL. Always https. */
  baseUrl: string;
  /** Path used to list the real models of the account. */
  modelsPath: string;
  /** Path used for chat completions (streamed). */
  chatPath: string;
  docsUrl: string;
  /** Visual hint shown next to the key field. */
  keyHint: string;
}

/** Per-provider user settings. Persisted client-side only (never uploaded). */
export interface ProviderSettings {
  /** Plaintext while in memory. Obfuscated at rest in localStorage. */
  apiKey: string;
  /** Optional override of the default base URL (custom gateway / proxy). */
  baseUrl?: string;
  /** Model selected for the next chat. */
  model: string | null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Transport used to reach the MRCP Engine. */
export type MrcpTransport = "direct" | "proxy";

/** Everything the app knows about a block rendered in the scrollback feed. */
export interface BlockBase {
  id: string;
  at: number;
}

export interface InputBlock extends BlockBase {
  kind: "input";
  text: string;
}

export interface TextBlock extends BlockBase {
  kind: "text";
  text: string;
  tone?: "default" | "muted" | "success" | "warn";
}

/** A block still receiving tokens from the LLM. */
export interface StreamBlock extends BlockBase {
  kind: "stream";
  text: string;
  done: boolean;
  model?: string;
  provider?: ProviderId;
}

/** Result of an MRCP command: ASCII table + raw JSON for opt-in injection. */
export interface TableBlock extends BlockBase {
  kind: "table";
  title: string;
  ascii: string;
  /** Raw JSON payload, kept in memory for download / AI injection. */
  json: unknown;
  endpoint: string;
  transport: MrcpTransport;
  durationMs: number;
  /** Set once the user explicitly attaches the payload to the LLM context. */
  injected?: boolean;
  downloaded?: boolean;
}

export interface ErrorBlock extends BlockBase {
  kind: "error";
  message: string;
  detail?: string;
}

export interface PendingBlock extends BlockBase {
  kind: "pending";
  label: string;
}

export interface WizardBlock extends BlockBase {
  kind: "wizard";
  wizard: "providers" | "model";
}

export type Block =
  | InputBlock
  | TextBlock
  | StreamBlock
  | TableBlock
  | ErrorBlock
  | PendingBlock
  | WizardBlock;

/** Context attached to the next prompt (opt-in, never automatic). */
export interface AttachedContext {
  label: string;
  json: unknown;
  /** Rough token estimate, shown before the user confirms. */
  estimatedTokens: number;
}

/** One entry of the slash-command catalog. */
export interface CommandSpec {
  name: string;
  usage: string;
  description: string;
  group: "meta" | "analysis" | "security" | "contracts" | "web" | "mutation";
  /** MRCP REST route (without the /api prefix) or null for local commands. */
  endpoint: string | null;
  method: "GET" | "POST";
  /** Whether the command needs a `repo` argument. */
  requiresRepo: boolean;
  /** Extra named arguments, mapped positionally after `repo`. */
  args?: string[];
  /** Payload is not JSON (the engine returns Markdown for /api/guidelines). */
  raw?: boolean;
  /** How the payload is rendered in the feed. */
  renderer: "table" | "text" | "json";
}
