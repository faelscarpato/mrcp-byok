# Bate-Chat nativo & Streaming LLM

O orquestrador `lib/llmOrchestrator.ts` é o ponto único de contato com modelos de linguagem. Ele expõe duas funções — `streamChat()` e `listModels()` — e esconde as quatro dialetações de provedor atrás de uma interface só.

## Provedores suportados

| Provedor | Base URL | Autenticação | Streaming |
| :--- | :--- | :--- | :--- |
| OpenAI | `https://api.openai.com/v1` | `Authorization: Bearer` | SSE nativo |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | header `x-goog-api-key` | SSE (camada de compatibilidade OpenAI) |
| Anthropic Claude | `https://api.anthropic.com/v1` | `x-api-key` + `anthropic-version` | SSE com nomes de evento próprios |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1` | `Authorization: Bearer` | SSE nativo |

### Duas decisões que valem explicação

**Gemini usa header, não query string.** A autenticação por `?key=` funciona, mas a chave acaba gravada em logs de acesso de qualquer intermediário e pode vazar por cadeias de `Referer`. O header `x-goog-api-key` mantém a credencial fora da URL.

**Anthropic é normalizado no proxy, não no navegador.** A API da Anthropic emite eventos com nomes diferentes (`content_block_delta`, `message_stop`) em vez do formato `choices[0].delta` do OpenAI. Em vez de escrever dois parsers no cliente, o `/api/proxy` reescreve os eventos:

```ts
// app/api/proxy/guard.ts + route.ts
case "content_block_delta":
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
case "message_stop":
  return "data: [DONE]\n\n";
```

Resultado: **exatamente um parser SSE no navegador**, em `streamChat()`.

## Como o streaming chega até a tela

```ts
for await (const delta of streamChat({ provider, apiKey, model, messages, signal })) {
  accumulated += delta;
  if (Date.now() - lastFlush > 50) patchBlock(streamId, { text: accumulated });
}
```

Três detalhes de engenharia:

1. **Throttle de 50 ms.** Sem isso, cada token dispararia um *re-render* de todo o feed.
2. **Markdown incremental.** Re-parsear o texto inteiro a cada chunk é O(n²) e quebra em cercas de código incompletas. `StreamingMarkdown` divide o buffer no último limite seguro (linha em branco fora de cerca): o que já fechou vira Markdown memoizado; a cauda vira texto puro.
3. **Abort real.** `AbortController` é propagado até o `fetch` do upstream — ESC cancela a requisição, não só a UI.

## System prompt e memória de conversa

O histórico é mantido em memória (`useRef<ChatMessage[]>`) e nunca persistido: fechar a aba encerra a conversa. O *system prompt* é fixo e instrui o modelo a tratar blocos `<contexto>` como dados determinísticos do engine.

## Modelos reais, não lista hardcoded

`listModels()` chama o endpoint `/models` do provedor através do proxy e devolve o que **sua chave** realmente alcança. Se a chamada falhar, o Wizard cai para uma lista curta de sugestões (`FALLBACK_MODELS`) e avisa que a lista é sugerida, não real — nunca finge que veio do provedor.
