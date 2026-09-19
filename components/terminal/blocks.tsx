"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";
import { transportLabel } from "@/lib/mrcpClient";
import { estimateTokens, formatBytes } from "@/lib/tokens";
import { ProviderWizard } from "./wizards/ProviderWizard";
import { ModelWizard } from "./wizards/ModelWizard";
import { StreamingMarkdown } from "./StreamingMarkdown";

interface BlockViewProps {
  block: Block;
  onDownload: (block: Block) => void;
  onInject: (block: Block) => void;
  injected?: boolean;
}

function Timestamp({ at }: { at: number }) {
  return (
    <span className="text-[11px] text-term-muted">
      {new Date(at).toLocaleTimeString("pt-BR", { hour12: false })}
    </span>
  );
}

export function BlockView({ block, onDownload, onInject, injected }: BlockViewProps) {
  switch (block.kind) {
    case "input":
      return (
        <div className="flex items-start gap-2 py-1">
          <span className="mt-[2px] shrink-0 text-term-accent">❯</span>
          <span className="flex-1 break-words whitespace-pre-wrap text-term-text">{block.text}</span>
          <Timestamp at={block.at} />
        </div>
      );

    case "text":
      return (
        <div className="py-1">
          <StreamingMarkdown text={block.text} />
        </div>
      );

    case "stream":
      return (
        <div className="py-2">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-term-muted">
            <span className="text-term-info">{block.provider}</span>
            <span>·</span>
            <span>{block.model}</span>
            {!block.done ? <span className="text-term-accent">streaming…</span> : <Timestamp at={block.at} />}
          </div>
          <StreamingMarkdown text={block.text} streaming={!block.done} />
        </div>
      );

    case "pending":
      return (
        <div className="flex items-center gap-2 py-1 text-term-info">
          <span className="animate-pulse">◐</span>
          <span>{block.label}</span>
        </div>
      );

    case "error":
      return (
        <div className="rounded border border-term-error/40 bg-term-error/10 px-3 py-2">
          <div className="text-sm text-term-error">✖ {block.message}</div>
          {block.detail ? <pre className="mt-1 overflow-x-auto text-[11px] text-term-muted">{block.detail}</pre> : null}
        </div>
      );

    case "wizard":
      return (
        <div className="my-2 rounded-lg border border-term-line bg-term-panel p-3">
          {block.wizard === "providers" ? <ProviderWizard /> : <ModelWizard />}
        </div>
      );

    case "table":
      return <TableBlockView block={block} onDownload={onDownload} onInject={onInject} injected={injected} />;

    default:
      return null;
  }
}

function TableBlockView({
  block,
  onDownload,
  onInject,
  injected,
}: {
  block: Extract<Block, { kind: "table" }>;
  onDownload: (block: Block) => void;
  onInject: (block: Block) => void;
  injected?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const tokens = estimateTokens(block.json);
  const bytes = formatBytes(JSON.stringify(block.json ?? "").length);

  return (
    <div className="my-2 rounded-lg border border-term-line bg-term-panel">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-term-line px-3 py-2 text-[11px] text-term-muted">
        <span className="font-semibold text-term-accent">{block.title}</span>
        <span>/api/{block.endpoint}</span>
        <span>· {transportLabel(block.transport)}</span>
        <span>· {(block.durationMs / 1000).toFixed(1)}s</span>
        <span>· ~{tokens} tokens · {bytes}</span>
      </header>

      <pre className="ascii-block px-3 py-2 text-term-text">{block.ascii}</pre>

      <footer className="flex flex-wrap items-center gap-2 border-t border-term-line px-3 py-2">
        <button
          type="button"
          onClick={() => onDownload(block)}
          className="rounded border border-term-line bg-term-raise px-2.5 py-1.5 text-xs text-term-text transition hover:border-term-accent hover:text-term-accent"
        >
          📥 Baixar Análise
        </button>
        <button
          type="button"
          onClick={() => onInject(block)}
          disabled={injected}
          className="rounded border border-term-line bg-term-raise px-2.5 py-1.5 text-xs text-term-text transition hover:border-term-info hover:text-term-info disabled:opacity-50"
        >
          🧠 {injected ? "Contexto anexado" : "Enviar para a IA"}
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(block.json, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded border border-transparent px-2 py-1.5 text-xs text-term-muted transition hover:text-term-text"
        >
          {copied ? "copiado!" : "copiar JSON"}
        </button>
      </footer>
    </div>
  );
}
