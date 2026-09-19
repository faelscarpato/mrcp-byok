import type { MrcpTransport } from "./types";

/**
 * Typed client for the MRCP Engine REST API.
 *
 * Two transports are supported:
 *  - "direct": browser -> https://mrcp-engine.vercel.app (the engine already
 *    sends `Access-Control-Allow-Origin: *`, so no proxy is required and we
 *    escape the 60s ceiling of serverless functions on long analyses).
 *  - "proxy":  browser -> /api/mrcp -> engine. Use it behind corporate
 *    networks or firewalls that block third-party origins.
 */

export const MRCP_BASE_URL =
  process.env.NEXT_PUBLIC_MRCP_BASE_URL ?? "https://mrcp-engine.vercel.app";

export interface MrcpCallOptions {
  /** Route without the `/api` prefix, e.g. `analyze` or `code-health`. */
  endpoint: string;
  method?: "GET" | "POST";
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  transport?: MrcpTransport;
  signal?: AbortSignal;
  /** Return the raw body instead of parsing it as JSON (Markdown endpoints). */
  raw?: boolean;
}

export interface MrcpResult<T = unknown> {
  data: T;
  transport: MrcpTransport;
  url: string;
  durationMs: number;
}

function buildUrl(endpoint: string, params?: MrcpCallOptions["params"]): string {
  const base = `${MRCP_BASE_URL}/api/${endpoint.replace(/^\/+/, "")}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export class MrcpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly payload?: unknown
  ) {
    super(message);
    this.name = "MrcpError";
  }
}

/**
 * Performs one call against the engine and returns the parsed payload.
 * Throws `MrcpError` with a human-readable message on failure.
 */
export async function callMrcp<T = unknown>(options: MrcpCallOptions): Promise<MrcpResult<T>> {
  const transport = options.transport ?? "direct";
  const method = options.method ?? "GET";
  const startedAt = Date.now();

  let response: Response;
  let url: string;

  try {
    if (transport === "proxy") {
      url = "/api/mrcp";
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: options.endpoint,
          method,
          params: options.params ?? {},
          body: options.body ?? null,
        }),
        signal: options.signal,
      });
    } else {
      url = buildUrl(options.endpoint, options.params);
      response = await fetch(url, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
        body: method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
        signal: options.signal,
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new MrcpError(
      `Falha de rede ao chamar o MRCP Engine (${transport}). Verifique sua conexão ou troque o transporte com /transport.`
    );
  }

  const durationMs = Date.now() - startedAt;
  const raw = await response.text();

  if (options.raw) {
    if (!response.ok) throw new MrcpError(`Engine respondeu HTTP ${response.status}.`, response.status);
    return {
      data: raw as unknown as T,
      transport,
      url: transport === "proxy" ? buildUrl(options.endpoint, options.params) : url,
      durationMs,
    };
  }

  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    throw new MrcpError(`Resposta não-JSON do engine (HTTP ${response.status}).`, response.status);
  }

  if (!response.ok) {
    const detail =
      parsed && typeof parsed === "object" && "error_code" in parsed
        ? String((parsed as Record<string, unknown>).error_code)
        : undefined;
    throw new MrcpError(
      detail ? `Engine recusou a chamada: ${detail}` : `Engine respondeu HTTP ${response.status}.`,
      response.status,
      parsed
    );
  }

  return { data: parsed as T, transport, url: transport === "proxy" ? buildUrl(options.endpoint, options.params) : url, durationMs };
}

/** Human label for the transport, rendered in every result block. */
export function transportLabel(transport: MrcpTransport): string {
  return transport === "direct" ? "direto (browser → engine)" : "proxy (/api/mrcp)";
}
