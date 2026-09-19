"use client";

import { useEffect, useRef } from "react";
import type { Block } from "@/lib/types";
import { BlockView } from "./blocks";

interface ScrollbackProps {
  blocks: Block[];
  injectedId: string | null;
  onDownload: (block: Block) => void;
  onInject: (block: Block) => void;
}

/**
 * The feed. Autoscroll stays enabled while the user is near the bottom and
 * disables itself as soon as they scroll up to read something — otherwise
 * reading a long answer while tokens arrive would be impossible.
 */
export function Scrollback({ blocks, injectedId, onDownload, onInject }: ScrollbackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !pinnedToBottom.current) return;
    element.scrollTop = element.scrollHeight;
  }, [blocks]);

  function handleScroll() {
    const element = containerRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    pinnedToBottom.current = distance < 80;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="scrollback flex-1 overflow-y-auto px-3 py-3"
    >
      {blocks.length === 0 ? (
        <p className="text-xs text-term-muted">histórico vazio — digite /help</p>
      ) : null}

      {blocks.map((block) => (
        <BlockView
          key={block.id}
          block={block}
          onDownload={onDownload}
          onInject={onInject}
          injected={block.id === injectedId}
        />
      ))}
    </div>
  );
}
