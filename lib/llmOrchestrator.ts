import { PROVIDERS } from "./providers";
import type { ChatMessage, ProviderId } from "./types";

/**
 * Unified streaming client for every supported LLM provider.
 *
 * The browser never talks to a provider directly (OpenAI, Anthropic and NVIDIA
 * send no CORS headers). Instead it calls our transparent `/api/proxy`, which
 * masks the origin and normalises the different SSE dialects. Because of that,
 * this file contains exactly ONE SSE parser for all four providers.
 */

export interface ModelInfo {
  id: string;
  label: string;
}

export interface StreamChatParams {
  provider: ProviderId;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

async function readError(response: Response): Promise<never> {
  let message = `HTTP ${response.status}`;
  try {
    const parsed = (await response.json()) as { error?: { message?: string } };
    if (parsed?.error?.message) message = parsed.error.message;
  } catch {
    /* keep the status-based message */
  }
  throw new LlmError(message);
}

/** Lists the real models available for the given key. */
export async function listModels(params: {
  provider: ProviderId;
  apiKey: string;
  baseUrl?: string;
  signal?: AbortSignal;
}): Promise<ModelInfo[]> {
  if (!params.apiKey) throw new LlmError("Informe uma API Key antes de listar modelos.");

  const response = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "models", provider: params.provider, apiKey: params.apiKey, baseUrl: params.baseUrl }),
    signal: params.signal,
  });

  if (!response.ok) await readError(response);
  const parsed = (await response.json()) as { models?: ModelInfo[] };
  const models = parsed.models ?? [];
  if (models.length === 0) throw new LlmError("O provedor não retornou modelos para esta chave.");
  return models;
}

/**
 * Streams a chat completion, yielding text deltas as they arrive.
 *
 * Usage:
 * ```ts
 * for await (const delta of streamChat({ ... })) setText((prev) => prev + delta);
 * ```
 */
export async function* streamChat(params: StreamChatParams): AsyncGenerator<string, void, unknown> {
  if (!params.apiKey) throw new LlmError("Sem API Key. Rode /provedores para configurar.");
  if (!params.model) throw new LlmError("Sem modelo selecionado. Rode /model.");
  if (!PROVIDERS[params.provider]) throw new LlmError("Provedor desconhecido.");

  const response = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "chat",
      provider: params.provider,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.3,
      maxTokens: params.maxTokens ?? 2048,
    }),
    signal: params.signal,
  });

  if (!response.ok) await readError(response);
  if (!response.body) throw new LlmError("O proxy não retornou um stream legível.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const event = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);

      const dataLine = event.split("\n").map((line) => line.trim()).find((line) => line.startsWith("data:"));
      if (!dataLine) {
        separator = buffer.indexOf("\n\n");
        continue;
      }

      const payload = dataLine.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string }; text?: string }[];
          error?: { message?: string };
        };
        if (json.error?.message) throw new LlmError(json.error.message);
        const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.text ?? "";
        if (delta) yield delta;
      } catch (error) {
        if (error instanceof LlmError) throw error;
        // Ignore keep-alive comments and partially buffered events.
      }

      separator = buffer.indexOf("\n\n");
    }
  }
}
