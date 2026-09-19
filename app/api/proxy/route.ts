import { PROVIDERS, resolveBaseUrl } from "@/lib/providers";
import { assertSafeTarget, buildBody, buildHeaders, ProxyGuardError } from "./guard";
import type { ProviderId } from "@/lib/types";

/**
 * Transparent anti-CORS proxy.
 *
 * Browsers cannot call OpenAI, Anthropic or NVIDIA directly: those APIs send
 * no CORS headers, so `fetch` fails at the preflight. This route masks the
 * origin and forwards the request from the server.
 *
 * Constraints (documented, not implied):
 *  - stateless: nothing is logged, cached or persisted; the response is piped
 *    straight through to the client;
 *  - the user's API key necessarily transits this function (that is the only
 *    way a browser can reach a CORS-blocked provider). It is never written to
 *    disk, never sent anywhere else, and never stored — see README "BYOK";
 *  - the destination is validated by `guard.ts` to prevent SSRF;
 *  - Anthropic's SSE dialect is rewritten here into the OpenAI delta shape so
 *    the browser only ever implements one parser.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

interface ProxyRequest {
  action: "models" | "chat";
  provider: ProviderId;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  messages?: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Rewrites one SSE event. Returns the OpenAI-shaped event to forward, or null
 * when the event carries no text and should be swallowed.
 */
function transformEvent(provider: ProviderId, rawEvent: string): string | null {
  const lines = rawEvent.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  if (provider !== "anthropic") {
    const dataLine = lines.find((line) => line.startsWith("data:"));
    if (!dataLine) return null;
    const payload = dataLine.slice(5).trim();
    if (payload === "[DONE]") return "data: [DONE]\n\n";
    return `data: ${payload}\n\n`;
  }

  const eventName = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const dataLine = lines.find((line) => line.startsWith("data:"));
  if (!eventName || !dataLine) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(dataLine.slice(5).trim());
  } catch {
    return null;
  }

  switch (eventName) {
    case "content_block_delta": {
      const text = parsed?.delta?.text;
      if (typeof text !== "string" || text.length === 0) return null;
      return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
    }
    case "message_stop":
      return "data: [DONE]\n\n";
    case "error":
      return `data: ${JSON.stringify({ error: { message: parsed?.error?.message ?? "erro do provedor" } })}\n\n`;
    default:
      return null;
  }
}

/** Streams the upstream response, normalising SSE dialects on the fly. */
function normalizeStream(provider: ProviderId, body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        let separator = buffer.indexOf("\n\n");
        while (separator !== -1) {
          const event = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          const output = transformEvent(provider, event);
          if (output) controller.enqueue(encoder.encode(output));
          separator = buffer.indexOf("\n\n");
        }
      },
      flush(controller) {
        if (buffer.trim()) {
          const output = transformEvent(provider, buffer);
          if (output) controller.enqueue(encoder.encode(output));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    })
  );
}

export async function POST(request: Request) {
  let payload: ProxyRequest;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Corpo da requisição inválido.", 400);
  }

  const { action, provider, apiKey, model, messages } = payload;
  if (!provider || !(provider in PROVIDERS)) return jsonError("Provedor desconhecido.", 400);
  if (!apiKey) return jsonError("Informe uma API Key (BYOK) em /provedores.", 401);
  if (action === "chat" && (!model || !messages?.length)) return jsonError("Modelo ou mensagens ausentes.", 400);

  const baseUrl = resolveBaseUrl(provider, payload.baseUrl);
  if (!baseUrl) return jsonError("Provedor customizado exige uma base URL https.", 400);

  const path = action === "models" ? PROVIDERS[provider].modelsPath : PROVIDERS[provider].chatPath;
  const target = `${baseUrl}${path}`;

  try {
    await assertSafeTarget(target, provider);
  } catch (error) {
    const message = error instanceof ProxyGuardError ? error.message : "Destino bloqueado.";
    return jsonError(message, 403);
  }

  const headers = buildHeaders(provider, apiKey);

  if (action === "models") {
    try {
      const upstream = await fetch(target, { method: "GET", headers, cache: "no-store" });
      const text = await upstream.text();
      if (!upstream.ok) return jsonError(`Provedor respondeu HTTP ${upstream.status}: ${text.slice(0, 300)}`, upstream.status);
      const parsed = JSON.parse(text) as { data?: { id?: string; display_name?: string }[] };
      const models = (parsed.data ?? [])
        .filter((entry) => Boolean(entry?.id))
        .map((entry) => ({ id: entry.id as string, label: entry.display_name ?? (entry.id as string) }));
      return new Response(JSON.stringify({ models }), { headers: { "Content-Type": "application/json" } });
    } catch {
      return jsonError("Falha ao listar modelos do provedor.", 502);
    }
  }

  const body = buildBody(provider, {
    model: model as string,
    messages: messages as { role: string; content: string }[],
    temperature: payload.temperature ?? 0.3,
    maxTokens: payload.maxTokens ?? 2048,
    stream: true,
  });

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: "POST", headers, body });
  } catch {
    return jsonError("Não foi possível alcançar o provedor.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return jsonError(`Provedor respondeu HTTP ${upstream.status}: ${detail.slice(0, 300)}`, upstream.status || 502);
  }

  return new Response(normalizeStream(provider, upstream.body), { headers: STREAM_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
