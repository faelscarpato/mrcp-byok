"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTerminal } from "@/store/terminalStore";
import { useActiveCredentials, useSettings } from "@/store/settingsStore";
import { COMMANDS, GROUP_LABELS, GROUP_ORDER } from "@/lib/commands/registry";
import { executeCommand, findCommand, isCommandInput, parseCommand, suggestCommands } from "@/lib/commands/dispatch";
import { jsonToAsciiTable } from "@/lib/asciiTable";
import { streamChat } from "@/lib/llmOrchestrator";
import { serializeContext, estimateTokens } from "@/lib/tokens";
import { downloadJson, downloadText, openExternal, slugify } from "@/lib/download";
import { exportSession } from "@/lib/chatExport";
import { AGENT_GUIDELINES, EXTENSIONS } from "@/lib/extensions";
import { PROVIDERS } from "@/lib/providers";
import { callMrcp, transportLabel } from "@/lib/mrcpClient";
import type { Block, ChatMessage } from "@/lib/types";
import { Scrollback } from "./Scrollback";
import { Composer } from "./Composer";
import { MobileToolbar } from "./MobileToolbar";

const SYSTEM_PROMPT = [
  "Você é o assistente embarcado do MRCP Web Terminal (Chat-CLI).",
  "Responda em português do Brasil, de forma direta e técnica.",
  "Quando o usuário anexar um contexto <contexto>, trate-o como dados determinísticos do MRCP Engine e responda com base nele.",
].join(" ");

function buildHelp(): string {
  const sections = GROUP_ORDER.map((group) => {
    const items = COMMANDS.filter((command) => command.group === group)
      .map((command) => `- \`${command.usage}\` — ${command.description}`)
      .join("\n");
    return `**${GROUP_LABELS[group]}**\n${items}`;
  });
  return [
    "### Comandos do MRCP Web Terminal",
    "",
    ...sections,
    "",
    "Dica: digite `/` e pressione TAB para autocompletar. Texto livre abre o bate-papo com streaming.",
  ].join("\n");
}

const WELCOME = [
  "**MRCP Web Terminal** — Chat-CLI sobre o MRCP Engine.",
  "",
  "- `/` comandos nativos (analyze, health, security, contract…)",
  "- texto livre → bate-papo com streaming (OpenAI, Gemini, Claude, NVIDIA NIM)",
  "- `/provedores` configura sua chave (BYOK, só no navegador)",
  "",
  "Digite `/help` para a lista completa ou `/health expressjs/express` para um teste real.",
].join("\n");

export default function Terminal() {
  const blocks = useTerminal((state) => state.blocks);
  const addBlock = useTerminal((state) => state.addBlock);
  const patchBlock = useTerminal((state) => state.patchBlock);
  const removeBlock = useTerminal((state) => state.removeBlock);
  const clearFeed = useTerminal((state) => state.clear);
  const pushHistory = useTerminal((state) => state.pushHistory);
  const historyPrev = useTerminal((state) => state.historyPrev);
  const historyNext = useTerminal((state) => state.historyNext);
  const attached = useTerminal((state) => state.attached);
  const setAttached = useTerminal((state) => state.setAttached);
  const focusToken = useTerminal((state) => state.focusToken);
  const requestFocus = useTerminal((state) => state.requestFocus);
  const busy = useTerminal((state) => state.busy);
  const setBusy = useTerminal((state) => state.setBusy);

  const hydrated = useSettings((state) => state.hydrated);
  const transport = useSettings((state) => state.transport);
  const setTransport = useSettings((state) => state.setTransport);
  const { provider, model, apiKey, baseUrl } = useActiveCredentials();

  const [draft, setDraft] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const conversation = useRef<ChatMessage[]>([]);
  const lastResult = useRef<{ json: unknown; endpoint: string } | null>(null);
  const injectedId = useRef<string | null>(null);

  // localStorage is only touched on the client, after mount.
  useEffect(() => {
    void useSettings.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (useTerminal.getState().blocks.length > 0) return;
    addBlock({ kind: "text", text: WELCOME });
  }, [hydrated, addBlock]);

  /**
   * iOS Safari ignores `interactive-widget`, so the keyboard height is
   * measured from `visualViewport` and exposed as a CSS variable.
   */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const height = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--kb-height", `${height}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  const suggestions = useMemo(() => {
    if (!draft.startsWith("/") || draft.includes(" ")) return [];
    return suggestCommands(draft).map((command) => command.name);
  }, [draft]);

  const runChat = useCallback(
    async (text: string) => {
      if (!apiKey) {
        addBlock({ kind: "error", message: "Sem API Key. Rode /provedores e salve sua chave (BYOK)." });
        return;
      }
      if (!model) {
        addBlock({ kind: "error", message: "Sem modelo ativo. Rode /model para escolher um." });
        return;
      }

      const prompt = attached ? `${serializeContext(attached.label, attached.json)}\n\n${text}` : text;
      const streamId = addBlock({ kind: "stream", text: "", done: false, model, provider });
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      let accumulated = "";
      let lastFlush = 0;

      // The current turn is only committed to the conversation AFTER a
      // successful stream. Committing it upfront duplicates the user message
      // on every retry following a failure.
      const turn: ChatMessage[] = [{ role: "user", content: prompt }];
      const history = [...conversation.current];

      try {
        for await (const delta of streamChat({
          provider,
          apiKey,
          model,
          baseUrl,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, ...turn],
          signal: controller.signal,
        })) {
          accumulated += delta;
          const now = Date.now();
          // Throttle re-renders: token-by-token patching would re-render the
          // whole feed dozens of times per second.
          if (now - lastFlush > 50) {
            lastFlush = now;
            patchBlock(streamId, { text: accumulated });
          }
        }
        patchBlock(streamId, { text: accumulated, done: true });
        conversation.current.push(...turn, { role: "assistant", content: accumulated });
        if (attached) {
          setAttached(null);
          injectedId.current = null;
        }
      } catch (error) {
        patchBlock(streamId, { text: accumulated, done: true });
        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? "Geração cancelada."
            : error instanceof Error
              ? error.message
              : "Falha na geração.";
        addBlock({ kind: "error", message });
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [apiKey, model, provider, baseUrl, attached, addBlock, patchBlock, setAttached, setBusy]
  );

  const runCommand = useCallback(
    async (input: string) => {
      const parsed = parseCommand(input);
      if (!parsed) return;
      const spec = findCommand(parsed.name);
      if (!spec) {
        addBlock({ kind: "error", message: `Comando /${parsed.name} não existe. Digite /help.` });
        return;
      }

      // ------------------------------------------------------ local commands
      switch (spec.name) {
        case "help":
          addBlock({ kind: "text", text: buildHelp() });
          return;
        case "clear":
          clearFeed();
          return;
        case "about":
          addBlock({
            kind: "text",
            text: [
              "**MRCP Web Terminal** — Chat-CLI que conversa com o MRCP Engine.",
              "",
              `- Engine: \`https://mrcp-engine.vercel.app\` (análise AST determinística, sem LLM na análise)`,
              `- Transporte atual: ${transportLabel(transport)}`,
              `- BYOK: a chave nunca é gravada em banco; fica ofuscada no localStorage do seu navegador`,
              `- Proxy: \`/api/proxy\` mascara a origem para OpenAI, Anthropic e NVIDIA (eles bloqueiam CORS)`,
              "",
              "Documentação completa em /docs.",
            ].join("\n"),
          });
          return;
        case "ctx":
          if (parsed.positionals[0]?.toLowerCase() === "limpar") {
            setAttached(null);
            injectedId.current = null;
            addBlock({ kind: "text", text: "Contexto removido.", tone: "muted" });
          } else if (attached) {
            addBlock({
              kind: "text",
              text: `Contexto anexado: **${attached.label}** (~${estimateTokens(attached.json)} tokens). Será enviado no próximo prompt. \`/ctx limpar\` remove.`,
            });
          } else {
            addBlock({ kind: "text", text: "Nenhum contexto anexado. Use o botão 🧠 em um resultado de análise.", tone: "muted" });
          }
          return;
        case "export": {
          if (!lastResult.current) {
            addBlock({ kind: "error", message: "Nenhum resultado MRCP nesta sessão para exportar." });
            return;
          }
          downloadJson(`mrcp-${slugify(lastResult.current.endpoint)}`, lastResult.current.json);
          addBlock({ kind: "text", text: `JSON baixado: \`mrcp-${slugify(lastResult.current.endpoint)}.json\``, tone: "muted" });
          return;
        }
        case "transport": {
          const arg = parsed.positionals[0]?.toLowerCase();
          const next = arg === "proxy" ? "proxy" : arg === "direto" || arg === "direct" ? "direct" : transport === "direct" ? "proxy" : "direct";
          setTransport(next);
          addBlock({ kind: "text", text: `Transporte agora: **${transportLabel(next)}**.`, tone: "muted" });
          return;
        }
        case "provedores":
          addBlock({ kind: "wizard", wizard: "providers" });
          return;
        case "salvar": {
          const session = useTerminal.getState().blocks;
          if (session.length === 0) {
            addBlock({ kind: "error", message: "Nada para salvar: a sessão está vazia." });
            return;
          }
          const { filename, markdown } = exportSession(session);
          downloadText(filename, markdown);
          addBlock({ kind: "text", text: `Conversa exportada: \`${filename}\` (${session.length} blocos, ${markdown.length} caracteres).`, tone: "muted" });
          return;
        }
        case "agente": {
          // Fetches the live file through the same transport as every other
          // command, then saves it in the browser. No bundled copy.
          const controller = new AbortController();
          abortRef.current = controller;
          setBusy(true);
          try {
            const result = await callMrcp({
              endpoint: AGENT_GUIDELINES.endpoint,
              method: "GET",
              raw: true,
              transport,
              signal: controller.signal,
            });
            const text = String(result.data ?? "");
            if (!text.trim()) {
              addBlock({ kind: "error", message: "O engine devolveu um arquivo vazio." });
              return;
            }
            downloadText(AGENT_GUIDELINES.file, text);
            const firstLines = text.split("\n").slice(0, 6).join("\n");
            addBlock({
              kind: "text",
              text: [
                `**${AGENT_GUIDELINES.label}**`,
                "",
                `- arquivo salvo: \`${AGENT_GUIDELINES.file}\``,
                `- tamanho: ${text.length} caracteres · ${text.split("\n").length} linhas`,
                `- origem: /api/${AGENT_GUIDELINES.endpoint} · ${transportLabel(transport)}`,
                `- dica: ${AGENT_GUIDELINES.hint}`,
                "",
                "```markdown",
                firstLines,
                "```",
                "",
                "_Leia o arquivo completo inline com_ `/guidelines`.",
              ].join("\n"),
            });
          } catch (error) {
            const message =
              error instanceof DOMException && error.name === "AbortError"
                ? "Download cancelado."
                : error instanceof Error
                  ? error.message
                  : "Falha ao baixar o agente.";
            addBlock({ kind: "error", message });
          } finally {
            setBusy(false);
            abortRef.current = null;
          }
          return;
        }
        case "vscode":
        case "chrome": {
          const asset = EXTENSIONS[spec.name];
          openExternal(asset.url);
          addBlock({
            kind: "text",
            text: [
              `**${asset.label}**`,
              "",
              `- arquivo: \`${asset.file}\``,
              `- instalação: ${asset.installHint}`,
              "",
              `Se o navegador bloquear o download: [abrir manualmente](${asset.url})`,
            ].join("\n"),
          });
          return;
        }
        case "model": {
          const arg = parsed.positionals[0];
          if (arg) {
            useSettings.getState().setModel(provider, arg);
            addBlock({ kind: "text", text: `Modelo ativo: **${arg}** (${PROVIDERS[provider].label}).`, tone: "muted" });
          } else {
            addBlock({ kind: "wizard", wizard: "model" });
          }
          return;
        }
      }

      // -------------------------------------------------------- engine calls
      const pendingId = addBlock({ kind: "pending", label: `/${spec.name} → /api/${spec.endpoint}` });
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      try {
        const result = await executeCommand(spec, parsed, { transport, signal: controller.signal });
        removeBlock(pendingId);

        if (spec.raw || spec.renderer === "text") {
          addBlock({ kind: "text", text: String(result.data) });
          return;
        }

        const ascii = jsonToAsciiTable(result.data);
        addBlock({
          kind: "table",
          title: `/${spec.name}`,
          ascii,
          json: result.data,
          endpoint: result.endpoint,
          transport: result.transport,
          durationMs: result.durationMs,
        });
        lastResult.current = { json: result.data, endpoint: result.endpoint };
      } catch (error) {
        removeBlock(pendingId);
        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? "Comando cancelado."
            : error instanceof Error
              ? error.message
              : "Falha ao executar o comando.";
        addBlock({ kind: "error", message });
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [addBlock, clearFeed, patchBlock, removeBlock, setAttached, setBusy, setTransport, transport, provider, attached]
  );

  const submit = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    pushHistory(text);
    addBlock({ kind: "input", text });
    if (isCommandInput(text)) void runCommand(text);
    else void runChat(text);
  }, [draft, busy, pushHistory, addBlock, runCommand, runChat]);

  const handleAbort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      return;
    }
    if (draft) setDraft("");
  }, [draft]);

  const handleAutocomplete = useCallback(() => {
    if (suggestions.length === 0) return;
    setDraft(`/${suggestions[0]} `);
    requestFocus();
  }, [suggestions, requestFocus]);

  const handleHistoryPrev = useCallback(() => {
    const entry = historyPrev();
    if (entry !== null) setDraft(entry);
  }, [historyPrev]);

  const handleHistoryNext = useCallback(() => {
    const entry = historyNext();
    if (entry !== null) setDraft(entry);
  }, [historyNext]);

  const handleDownload = useCallback((block: Block) => {
    if (block.kind !== "table") return;
    downloadJson(`mrcp-${slugify(block.endpoint)}`, block.json);
    patchBlock(block.id, { downloaded: true });
  }, [patchBlock]);

  const handleInject = useCallback(
    (block: Block) => {
      if (block.kind !== "table") return;
      setAttached({ label: `/api/${block.endpoint}`, json: block.json, estimatedTokens: estimateTokens(block.json) });
      injectedId.current = block.id;
      patchBlock(block.id, { injected: true });
      addBlock({ kind: "text", text: `Contexto **/api/${block.endpoint}** anexado (~${estimateTokens(block.json)} tokens). Escreva sua pergunta — nada foi enviado ainda.`, tone: "muted" });
      requestFocus();
    },
    [addBlock, patchBlock, requestFocus, setAttached]
  );

  return (
    <div className="app-shell bg-term-bg">
      <header className="flex items-center justify-between gap-2 border-b border-term-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-term-accent">▍</span>
          <h1 className="truncate text-xs font-semibold tracking-wide text-term-text">MRCP WEB TERMINAL</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] text-term-muted">
          <span className="hidden sm:inline">{PROVIDERS[provider].label}</span>
          {model ? <span className="max-w-[140px] truncate text-term-info">{model}</span> : <span className="text-term-warn">sem modelo</span>}
          <span className="hidden md:inline">· {transportLabel(transport)}</span>
          <Link href="/docs" className="rounded border border-term-line px-2 py-0.5 hover:text-term-text">
            /docs
          </Link>
        </div>
      </header>

      <Scrollback blocks={blocks} injectedId={injectedId.current} onDownload={handleDownload} onInject={handleInject} />

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        onAbort={handleAbort}
        onAutocomplete={handleAutocomplete}
        onHistoryPrev={handleHistoryPrev}
        onHistoryNext={handleHistoryNext}
        focusToken={focusToken}
        suggestions={suggestions}
        onPickSuggestion={(name) => {
          setDraft(`/${name} `);
          requestFocus();
        }}
        busy={busy}
        attachedLabel={attached?.label ?? null}
      />

      <MobileToolbar
        onEscape={handleAbort}
        onTab={handleAutocomplete}
        onUp={handleHistoryPrev}
        onDown={handleHistoryNext}
        onSlash={() => {
          setDraft((current) => (current.startsWith("/") ? current : `/${current}`));
          requestFocus();
        }}
        busy={busy}
      />
    </div>
  );
}
