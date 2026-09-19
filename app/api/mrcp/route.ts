import { NextResponse } from "next/server";
import { MRCP_BASE_URL } from "@/lib/mrcpClient";

/**
 * Optional server-side relay for the MRCP Engine.
 *
 * The engine is CORS-open, so the browser normally talks to it directly
 * (faster and free from the serverless execution cap). This route exists for
 * networks that block third-party origins. It is stateless and stores nothing.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_METHODS = ["GET", "POST"];

export async function POST(request: Request) {
  let payload: { endpoint?: string; method?: string; params?: Record<string, string>; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ status: "error", error_code: "INVALID_JSON" }, { status: 400 });
  }

  const endpoint = String(payload.endpoint ?? "").replace(/^\/+/, "");
  if (!endpoint || endpoint.includes("..") || endpoint.includes("/")) {
    return NextResponse.json({ status: "error", error_code: "INVALID_ENDPOINT" }, { status: 400 });
  }

  const method = (payload.method ?? "GET").toUpperCase();
  if (!ALLOWED_METHODS.includes(method)) {
    return NextResponse.json({ status: "error", error_code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(payload.params ?? {})) search.set(key, String(value));
  const query = search.toString();
  const url = `${MRCP_BASE_URL}/api/${endpoint}${query ? `?${query}` : ""}`;

  try {
    const upstream = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(payload.body ?? {}) : undefined,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ status: "error", error_code: "UPSTREAM_UNREACHABLE" }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
