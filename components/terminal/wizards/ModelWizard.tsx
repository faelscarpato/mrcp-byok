"use client";

import { useState } from "react";
import { useSettings } from "@/store/settingsStore";
import { FALLBACK_MODELS, PROVIDERS } from "@/lib/providers";
import { listModels } from "@/lib/llmOrchestrator";

/**
 * In-feed Wizard rendered by `/model`.
 *
 * Switching models never re-authenticates: the key already lives in the
 * store, so this panel only lists what the provider really offers (or falls
 * back to a small curated list when the call fails) and selects one.
 */
export function ModelWizard() {
  const provider = useSettings((state) => state.provider);
  const model = useSettings((state) => state.models[provider] ?? "");
  const setModel = useSettings((state) => state.setModel);

  const [models, setModels] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const key = useSettings.getState().getKey(provider);
    if (!key) {
      setStatus("Salve uma API Key em /provedores para listar modelos reais.");
      setModels(FALLBACK_MODELS[provider] ?? []);
      return;
    }
    setLoading(true);
    try {
      const found = await listModels({ provider, apiKey: key, baseUrl: useSettings.getState().baseUrls[provider] });
      setModels(found.map((entry) => entry.id));
      setStatus(`${found.length} modelos reais carregados.`);
    } catch (error) {
      setModels(FALLBACK_MODELS[provider] ?? []);
      setStatus(`Lista real indisponível (${error instanceof Error ? error.message : "erro"}); mostrando sugestões.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-term-muted">
          Provedor ativo: <span className="text-term-text">{PROVIDERS[provider].label}</span>
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded border border-term-info bg-term-info/10 px-3 py-1.5 text-xs text-term-info hover:bg-term-info/20 disabled:opacity-60"
        >
          {loading ? "carregando…" : "Listar modelos reais"}
        </button>
      </div>

      {models.length > 0 ? (
        <div className="max-h-44 overflow-y-auto rounded border border-term-line">
          {models.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => {
                setModel(provider, entry);
                setStatus(`Modelo ativo: ${entry}`);
              }}
              className={`block w-full border-b border-term-line px-2.5 py-1.5 text-left font-mono text-xs last:border-b-0 hover:bg-term-raise ${
                model === entry ? "text-term-accent" : "text-term-text"
              }`}
            >
              {model === entry ? "● " : "○ "}
              {entry}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="ou digite o id exato do modelo"
          spellCheck={false}
          className="min-w-0 flex-1 rounded border border-term-line bg-term-bg px-2.5 py-1.5 font-mono text-xs text-term-text outline-none focus:border-term-accent"
        />
        <button
          type="button"
          onClick={() => {
            if (!manual.trim()) return;
            setModel(provider, manual.trim());
            setStatus(`Modelo ativo: ${manual.trim()}`);
            setManual("");
          }}
          className="rounded border border-term-accent bg-term-accent/10 px-3 py-1.5 text-xs text-term-accent hover:bg-term-accent/20"
        >
          Usar
        </button>
      </div>

      {model ? <p className="text-xs text-term-muted">Atual: <span className="text-term-accent">{model}</span></p> : null}
      {status ? <p className="text-xs text-term-muted">{status}</p> : null}
    </div>
  );
}
