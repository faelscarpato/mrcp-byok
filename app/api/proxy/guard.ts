import dns from "node:dns/promises";
import type { ProviderId } from "@/lib/types";
import { PROVIDERS } from "@/lib/providers";

/**
 * Security guard for `/api/proxy`.
 *
 * The proxy is a thin, stateless relay. Without these checks it would be an
 * open proxy (SSRF): anyone could make our server issue requests to internal
 * services or cloud metadata endpoints. Two layers are applied:
 *
 *   1. hostname allowlist for the four known providers;
 *   2. for a custom base URL (explicit opt-in): https-only, DNS resolution and
 *      rejection of private / loopback / link-local / metadata addresses.
 */

const ALLOWED_HOSTS = new Set(
  Object.values(PROVIDERS)
    .map((provider) => {
      try {
        return new URL(provider.baseUrl).hostname;
      } catch {
        return "";
      }
    })
    .filter(Boolean)
);

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^metadata\.google\.internal$/i,
];

export class ProxyGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProxyGuardError";
  }
}

function isPrivateIp(address: string): boolean {
  if (address.includes(":")) {
    const normalized = address.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fe80") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));
    return false;
  }
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

/**
 * Validates a target URL and returns it when it is safe to fetch.
 * @throws ProxyGuardError on any violation.
 */
export async function assertSafeTarget(rawUrl: string, provider: ProviderId): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProxyGuardError("URL de destino inválida.");
  }

  if (url.protocol !== "https:") throw new ProxyGuardError("Somente https:// é aceito.");

  if (ALLOWED_HOSTS.has(url.hostname)) return url;

  // Custom endpoint: explicit opt-in, still hardened.
  if (BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new ProxyGuardError(`Host bloqueado: ${url.hostname}`);
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new ProxyGuardError(`Não foi possível resolver ${url.hostname}.`);
  }

  if (addresses.length === 0 || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new ProxyGuardError(`Endereço privado ou reservado bloqueado: ${url.hostname}`);
  }

  if (provider !== "custom") {
    throw new ProxyGuardError(`Host fora da allowlist para o provedor ${provider}.`);
  }

  return url;
}

/** Builds the auth + content headers expected by each provider. */
export function buildHeaders(provider: ProviderId, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  switch (provider) {
    case "anthropic":
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "gemini":
      headers["x-goog-api-key"] = apiKey;
      break;
    default:
      headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

/** Anthropic uses a different payload shape for chat. */
export function buildBody(
  provider: ProviderId,
  params: { model: string; messages: { role: string; content: string }[]; temperature: number; maxTokens: number; stream: boolean }
): string {
  if (provider === "anthropic") {
    const system = params.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    return JSON.stringify({
      model: params.model,
      system: system || undefined,
      messages: params.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({ role: message.role, content: message.content })),
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      stream: params.stream,
    });
  }
  return JSON.stringify({
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    stream: params.stream,
  });
}
