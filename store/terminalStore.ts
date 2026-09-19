"use client";

import { create } from "zustand";
import type { AttachedContext, Block } from "@/lib/types";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/**
 * `Omit` does not distribute over unions (it collapses to the common keys),
 * so `Omit<Block, "id">` would erase every kind-specific field. This mapped
 * conditional keeps each member of the union intact.
 */
type DraftBlock<T = Block> = T extends Block ? Omit<T, "id" | "at"> & { id?: string } : never;

/**
 * Ephemeral terminal state: the scrollback feed, the command history and the
 * opt-in context attached to the next prompt. Never persisted.
 */
interface TerminalState {
  blocks: Block[];
  attached: AttachedContext | null;
  history: string[];
  historyCursor: number;
  /** Bumped whenever the UI should move focus back to the composer. */
  focusToken: number;
  busy: boolean;

  addBlock: (block: DraftBlock) => string;
  patchBlock: (id: string, patch: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  clear: () => void;
  pushHistory: (entry: string) => void;
  historyPrev: () => string | null;
  historyNext: () => string | null;
  setAttached: (context: AttachedContext | null) => void;
  setBusy: (busy: boolean) => void;
  requestFocus: () => void;
}

export const useTerminal = create<TerminalState>((set, get) => ({
  blocks: [],
  attached: null,
  history: [],
  historyCursor: -1,
  focusToken: 0,
  busy: false,

  addBlock: (block) => {
    const id = block.id ?? nextId(block.kind);
    set((state) => ({ blocks: [...state.blocks, { ...block, id, at: Date.now() } as Block] }));
    return id;
  },

  patchBlock: (id, patch) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === id ? ({ ...block, ...patch } as Block) : block
      ),
    })),

  removeBlock: (id) => set((state) => ({ blocks: state.blocks.filter((block) => block.id !== id) })),
  clear: () => set({ blocks: [], attached: null }),

  pushHistory: (entry) =>
    set((state) => ({
      history: [...state.history.filter((item) => item !== entry), entry].slice(-50),
      historyCursor: -1,
    })),

  historyPrev: () => {
    const { history, historyCursor } = get();
    if (history.length === 0) return null;
    const next = historyCursor < 0 ? history.length - 1 : Math.max(0, historyCursor - 1);
    set({ historyCursor: next });
    return history[next] ?? null;
  },

  historyNext: () => {
    const { history, historyCursor } = get();
    if (historyCursor < 0) return null;
    const next = historyCursor + 1;
    if (next >= history.length) {
      set({ historyCursor: -1 });
      return "";
    }
    set({ historyCursor: next });
    return history[next] ?? null;
  },

  setAttached: (attached) => set({ attached }),
  setBusy: (busy) => set({ busy }),
  requestFocus: () => set((state) => ({ focusToken: state.focusToken + 1 })),
}));
