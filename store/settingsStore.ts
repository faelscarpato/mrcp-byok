"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MrcpTransport, ProviderId } from "@/lib/types";

/**
 * BYOK settings store.
 *
 * Nothing here ever reaches a database. The persisted slice keeps the API key
 * as the user typed it: this is BYOK — the key belongs to the user and is the
 * user's responsibility. See `lib/keyVault.ts` for the rationale.
 *
 * `skipHydration` is mandatory: rendering a server component with values that
 * come from localStorage would produce a hydration mismatch. The terminal
 * calls `persist.rehydrate()` from a client effect instead.
 */

interface SettingsState {
  provider: ProviderId;
  /** Keys as typed by the user. Persisted in localStorage, never uploaded. */
  keys: Partial<Record<ProviderId, string>>;
  baseUrls: Partial<Record<ProviderId, string>>;
  models: Partial<Record<ProviderId, string>>;
  transport: MrcpTransport;
  hydrated: boolean;

  getKey: (provider: ProviderId) => string;
  setKey: (provider: ProviderId, key: string) => void;
  setProvider: (provider: ProviderId) => void;
  setBaseUrl: (provider: ProviderId, baseUrl: string) => void;
  setModel: (provider: ProviderId, model: string) => void;
  setTransport: (transport: MrcpTransport) => void;
  forget: (provider: ProviderId) => void;
  forgetAll: () => void;
}

const memoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      provider: "openai",
      keys: {},
      baseUrls: {},
      models: {},
      transport: "direct",
      hydrated: false,

      getKey: (provider) => get().keys[provider] ?? "",

      setKey: (provider, key) =>
        set((state) => ({ keys: { ...state.keys, [provider]: key.trim() } })),

      setProvider: (provider) => set({ provider }),
      setBaseUrl: (provider, baseUrl) => set((state) => ({ baseUrls: { ...state.baseUrls, [provider]: baseUrl } })),
      setModel: (provider, model) => set((state) => ({ models: { ...state.models, [provider]: model } })),
      setTransport: (transport) => set({ transport }),

      forget: (provider) =>
        set((state) => {
          const keys = { ...state.keys };
          delete keys[provider];
          return { keys };
        }),

      forgetAll: () => set({ keys: {}, models: {} }),
    }),
    {
      name: "mrcp-byok-settings-v2",
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage() : window.localStorage)),
      skipHydration: true,
      partialize: (state) => ({
        provider: state.provider,
        keys: state.keys,
        baseUrls: state.baseUrls,
        models: state.models,
        transport: state.transport,
      }),
      // Runs after the persisted slice is read back from localStorage.
      onRehydrateStorage: () => () => {
        useSettings.setState({ hydrated: true });
      },
    }
  )
);

/** Convenience selector: current provider + key + model in one shot. */
export function useActiveCredentials() {
  const provider = useSettings((state) => state.provider);
  const model = useSettings((state) => state.models[provider] ?? null);
  const baseUrl = useSettings((state) => state.baseUrls[provider]);
  const apiKey = useSettings((state) => state.keys[provider] ?? "");
  return { provider, model, baseUrl, apiKey };
}
