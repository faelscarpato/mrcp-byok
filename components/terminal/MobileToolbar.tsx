"use client";

interface MobileToolbarProps {
  onEscape: () => void;
  onTab: () => void;
  onUp: () => void;
  onDown: () => void;
  onSlash: () => void;
  busy: boolean;
}

/**
 * Native shortcuts for touch devices, where physical keys do not exist.
 * Each button fires exactly the same handler as its keyboard counterpart.
 */
export function MobileToolbar({ onEscape, onTab, onUp, onDown, onSlash, busy }: MobileToolbarProps) {
  const base =
    "flex h-9 min-w-0 flex-1 items-center justify-center rounded border border-term-line bg-term-raise text-[11px] text-term-muted active:scale-[0.97]";

  return (
    <div className="flex gap-1.5 border-t border-term-line bg-term-panel px-3 py-2">
      <button type="button" className={base} onClick={onEscape} aria-label="Cancelar">
        {busy ? "CTRL-C" : "ESC"}
      </button>
      <button type="button" className={base} onClick={onTab} aria-label="Autocompletar">
        TAB
      </button>
      <button type="button" className={base} onClick={onUp} aria-label="Histórico anterior">
        ↑
      </button>
      <button type="button" className={base} onClick={onDown} aria-label="Histórico seguinte">
        ↓
      </button>
      <button type="button" className={base} onClick={onSlash} aria-label="Inserir barra de comando">
        /
      </button>
    </div>
  );
}
