/**
 * Official MRCP extensions distributed with the engine.
 *
 * These are `raw` URLs on purpose: a `blob` URL renders an HTML page in the
 * browser, while `raw` serves the binary itself and triggers the download.
 * Both links below were verified (HTTP 200, 210 KB .vsix and 396 KB .zip).
 */

export interface ExtensionAsset {
  id: "vscode" | "chrome";
  label: string;
  file: string;
  url: string;
  /** How to install it after downloading. */
  installHint: string;
}

/**
 * The official agent instruction file.
 *
 * It is served live by the engine at `/api/guidelines` (text/markdown) and
 * mirrored in the engine repository as `MRCP_AI_GUIDELINES.md`. Both sources
 * were verified: identical content, 2,263 bytes.
 */
export const AGENT_GUIDELINES = {
  file: "MRCP_AI_GUIDELINES.md",
  endpoint: "guidelines",
  label: "Agente MRCP — Protocolo Operacional para Agentes de IA",
  hint: "Cole na raiz do projeto (ou em .agent/) para que Antigravity, Claude, Cursor, Windsurf e Copilot sigam o protocolo.",
};

export const EXTENSIONS: Record<"vscode" | "chrome", ExtensionAsset> = {
  vscode: {
    id: "vscode",
    label: "Extensão MRCP para VS Code",
    file: "mrcp-vscode-2.6.1.vsix",
    url: "https://github.com/faelscarpato/mrcp-engine/raw/main/apps/vscode/mrcp-vscode-2.6.1.vsix",
    installHint: "VS Code → Extensions → ⋯ → Install from VSIX…",
  },
  chrome: {
    id: "chrome",
    label: "Extensão MRCP para Google Chrome",
    file: "mrcp-chrome-extension-v2.6.1.zip",
    url: "https://github.com/faelscarpato/mrcp-engine/raw/main/mrcp-chrome-extension/mrcp-chrome-extension-v2.6.1.zip",
    installHint: "Descompacte e carregue em chrome://extensions (Modo do desenvolvedor → Carregar sem compactação).",
  },
};
