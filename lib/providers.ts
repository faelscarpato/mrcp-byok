import type { ProviderId, ProviderSpec } from "./types";

/**
 * Static catalogue of supported LLM providers.
 *
 * Every request is OpenAI-compatible except Anthropic, which speaks its own
 * streaming dialect and is normalised inside `/api/proxy` so the browser only
 * ever implements one SSE parser.
 *
 * Gemini is consumed through its official OpenAI-compatibility layer
 * (`/v1beta/openai/*`) and authenticated with the `x-goog-api-key` header —
 * never with `?key=`, which leaks the credential into access logs and
 * `Referer` chains.
 */
export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelsPath: "/models",
    chatPath: "/chat/completions",
    docsUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-…",
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelsPath: "/models",
    chatPath: "/chat/completions",
    docsUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "AIza…",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude",
    baseUrl: "https://api.anthropic.com/v1",
    modelsPath: "/models",
    chatPath: "/messages",
    docsUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-…",
  },
  nvidia: {
    id: "nvidia",
    label: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    modelsPath: "/models",
    chatPath: "/chat/completions",
    docsUrl: "https://build.nvidia.com/",
    keyHint: "nvapi-…",
  },
  custom: {
    id: "custom",
    label: "Endpoint customizado (compatível com OpenAI)",
    baseUrl: "",
    modelsPath: "/models",
    chatPath: "/chat/completions",
    docsUrl: "https://platform.openai.com/docs/api-reference",
    keyHint: "qualquer",
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["openai", "gemini", "anthropic", "nvidia", "custom"];

/** Sensible per-provider fallbacks used when the model list is unavailable. */
export const FALLBACK_MODELS: Record<ProviderId, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
  nvidia: ["meta/llama-3.3-70b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  custom: [],
};

export function resolveBaseUrl(provider: ProviderId, override?: string): string {
  const fallback = PROVIDERS[provider]?.baseUrl ?? "";
  const value = (override ?? "").trim();
  return value ? value.replace(/\/+$/, "") : fallback;
}
