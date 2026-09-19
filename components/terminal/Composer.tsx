"use client";

import { useEffect, useRef } from "react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAbort: () => void;
  onAutocomplete: () => void;
  onHistoryPrev: () => void;
  onHistoryNext: () => void;
  focusToken: number;
  suggestions: string[];
  onPickSuggestion: (name: string) => void;
  busy: boolean;
  attachedLabel?: string | null;
}

/**
 * The Omnibox. It accepts both slash commands and free text, and exposes the
 * mobile shortcuts (ESC / TAB / ↑ / ↓) as real key handlers so the on-screen
 * toolbar can trigger the very same behaviour.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  onAbort,
  onAutocomplete,
  onHistoryPrev,
  onHistoryNext,
  focusToken,
  suggestions,
  onPickSuggestion,
  busy,
  attachedLabel,
}: ComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusToken]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      onAutocomplete();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onAbort();
      return;
    }
    if (event.key === "ArrowUp" && !event.shiftKey) {
      event.preventDefault();
      onHistoryPrev();
      return;
    }
    if (event.key === "ArrowDown" && !event.shiftKey) {
      event.preventDefault();
      onHistoryNext();
    }
  }

  return (
    <div className="border-t border-term-line bg-term-panel px-3 pt-2">
      {suggestions.length > 0 ? (
        <div className="mb-1 flex flex-wrap gap-1">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onPickSuggestion(name)}
              className="rounded border border-term-line bg-term-raise px-2 py-1 text-[11px] text-term-info hover:border-term-info"
            >
              /{name}
            </button>
          ))}
        </div>
      ) : null}

      {attachedLabel ? (
        <div className="mb-1 flex items-center gap-2 rounded border border-term-info/40 bg-term-info/10 px-2 py-1 text-[11px] text-term-info">
          <span>📎 contexto anexado:</span>
          <span className="truncate">{attachedLabel}</span>
        </div>
      ) : null}

      <div className="flex items-end gap-2 pb-2">
        <span className="pb-2 text-term-accent">❯</span>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          enterKeyHint="send"
          placeholder={busy ? "gerando… (ESC cancela)" : "digite / para comandos, ou converse com a IA"}
          className="max-h-32 min-h-[38px] flex-1 resize-none bg-transparent py-2 text-sm text-term-text outline-none placeholder:text-term-muted"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="mb-1 rounded border border-term-accent bg-term-accent/10 px-3 py-1.5 text-xs text-term-accent hover:bg-term-accent/20 disabled:opacity-50"
        >
          {busy ? "…" : "enviar"}
        </button>
      </div>
    </div>
  );
}
