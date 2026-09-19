import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MRCP Web Terminal — Chat-CLI",
  description:
    "Terminal web em modo chat: comandos slash para o MRCP Engine, bate-papo com streaming de LLMs (OpenAI, Gemini, Claude, NVIDIA NIM) e BYOK client-side.",
  applicationName: "MRCP Web Terminal",
  keywords: ["MRCP", "terminal", "chat-cli", "BYOK", "AST", "LLM", "developer experience"],
};

/**
 * `interactive-widget=resizes-content` tells Chromium to shrink the viewport
 * instead of covering the composer when the virtual keyboard opens. iOS Safari
 * ignores it, which is why `Terminal` also listens to `visualViewport` and
 * exposes the keyboard height as the `--kb-height` CSS variable.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
