"use client";

import { useState } from "react";
import { useSettings } from "@/store/settingsStore";
import { PROVIDERS, PROVIDER_ORDER } from "@/lib/providers";
import { listModels } from "@/lib/llmOrchestrator";
import { maskKey } from "@/lib/keyVault";
import type { ProviderId } from "@/lib/types";

/**
 * In-feed Wizard rendered by `/provedores`.
 *
 * Everything here is real: "Buscar modelos" performs a live call to the
 * provider through `/api/proxy` and lists the models your key can actually
 * reach. The key is stored obfuscated in localStorage and never leaves the
 * device except to reach the provider you chose.
 */
export function ProviderWizard() {
  const provider = useSettings((state) => state.provider);
  const setProvider = useSettings((state) => state.setProvider);
  const setKey = useSettings((state) => state.setKey);
  const forget = useSettings((state) => state.forget);
  const setBaseUrl = useSettings((state) => state.setBaseUrl);
  const storedBaseUrl = useSettings((state) => state.baseUrls[provider] ?? "");

  const [draftKey, setDraftKey] = useState(() => useSettings.getState().getKey(provider));
  const [baseUrl, setBaseUrlDraft] = useState(storedBaseUrl);
  const [reveal, setReveal] = useState(false);
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const spec = PROVIDERS[provider];

  function selectProvider(next: ProviderId) {
    setProvider(next);
    setDraftKey(useSettings.getState().getKey(next));
    setBaseUrlDraft(useSettings.getState().baseUrls[next] ?? "");
    setModels([]);
    setStatus("");
  }

  function persist() {
    setKey(provider, draftKey.trim());
    setBaseUrl(provider, baseUrl.trim());
    setStatus(draftKey.trim() ? `Chave salva localmente (${maskKey(draftKey.trim())}).` : "Chave removida deste provedor.");
  }

  async function fetchModels() {
    const key = draftKey.trim() || useSettings.getState().getKey(provider);
    if (!key) {
      setStatus("Informe e salve uma API Key antes de buscar modelos.");
      return;
    }
    setLoading(true);
    setStatus("Consultando modelos reais do provedor…");
    try {
      const found = await listModels({ provider, apiKey: key, baseUrl: baseUrl.trim() || undefined });
      setModels(found);
      setStatus(`${found.length} modelos disponíveis para esta chave.`);
    } catch (error) {
      setStatus(`Falha: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="mb-2 text-term-muted">Provedor</p>
        <div className="flex flex-wrap gap-1.5">
          {PROVIDER_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => selectProvider(id)}
              className={`rounded border px-2.5 py-1.5 text-xs transition ${
                provider === id
                  ? "border-term-accent bg-term-accent/10 text-term-accent"
                  : "border-term-line bg-term-raise text-term-muted hover:text-term-text"
              }`}
            >
              {PROVIDERS[id].label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-term-muted">API Key (BYOK — só no seu navegador)</span>
        <div className="mt-1 flex gap-2">
          <input
            type={reveal ? "text" : "password"}
            value={draftKey}
            onChange={(event) => setDraftKey(event.target.value)}
            placeholder={spec.keyHint}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded border border-term-line bg-term-bg px-2.5 py-1.5 font-mono text-xs text-term-text outline-none focus:border-term-accent"
          />
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            className="rounded border border-term-line px-2 text-xs text-term-muted hover:text-term-text"
          >
            {reveal ? "ocultar" : "ver"}
          </button>
        </div>
      </label>

      <label className="block">
        <span className="text-term-muted">URL base customizada (opcional)</span>
        <input
          value={baseUrl}
          onChange={(event) => setBaseUrlDraft(event.target.value)}
          placeholder={spec.baseUrl || "https://seu-gateway.exemplo.com/v1"}
          autoComplete="off"
          spellCheck={false}
          className="mt-1 w-full rounded border border-term-line bg-term-bg px-2.5 py-1.5 font-mono text-xs text-term-text outline-none focus:border-term-accent"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={persist}
          className="rounded border border-term-accent bg-term-accent/10 px-3 py-1.5 text-xs text-term-accent hover:bg-term-accent/20"
        >
          Salvar chave
        </button>
        <button
          type="button"
          onClick={fetchModels}
          disabled={loading}
          className="rounded border border-term-info bg-term-info/10 px-3 py-1.5 text-xs text-term-info hover:bg-term-info/20 disabled:opacity-60"
        >
          {loading ? "buscando…" : "Buscar modelos reais"}
        </button>
        <button
          type="button"
          onClick={() => {
            forget(provider);
            setDraftKey("");
            setStatus("Chave esquecida neste dispositivo.");
          }}
          className="rounded border border-term-line px-3 py-1.5 text-xs text-term-muted hover:text-term-error"
        >
          Esquecer
        </button>
      </div>

      {models.length > 0 ? (
        <div className="max-h-40 overflow-y-auto rounded border border-term-line">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => {
                useSettings.getState().setModel(provider, model.id);
                setStatus(`Modelo ativo: ${model.id}`);
              }}
              className="block w-full border-b border-term-line px-2.5 py-1.5 text-left font-mono text-xs text-term-text last:border-b-0 hover:bg-term-raise"
            >
              {model.label}
            </button>
          ))}
        </div>
      ) : null}

      {status ? <p className="text-xs text-term-muted">{status}</p> : null}

      <p className="text-[11px] leading-relaxed text-term-muted">
        A chave é ofuscada no localStorage e enviada apenas para <span className="text-term-text">{spec.label}</span>.{" "}
        <a href={spec.docsUrl} target="_blank" rel="noreferrer" className="text-term-info hover:underline">
          obter uma chave ↗
        </a>
      </p>
    </div>
  );
}
