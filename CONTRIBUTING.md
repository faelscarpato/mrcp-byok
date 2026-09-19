# Contributing

Obrigado por querer contribuir. Este é um projeto pequeno por design: a regra é **cada arquivo deve merecer existir**.

## Antes de começar

```bash
git clone https://github.com/faelscarpato/MRCP-BYOK
cd MRCP-BYOK
npm install
npm run dev        # http://localhost:3000
npm run build      # verificação de tipos + build de produção
```

Comandos MRCP funcionam **sem nenhuma chave**. Só o bate-papo exige uma API Key, configurada em `/provedores`.

## Estrutura do projeto

```
app/
  layout.tsx              metadados + viewport (dvh, safe-area, interactive-widget)
  page.tsx                o terminal
  api/proxy/route.ts      proxy anti-CORS + normalização de SSE
  api/proxy/guard.ts      allowlist de provedores + anti-SSRF
  api/mrcp/route.ts       relay opcional para o engine
  docs/                   site de documentação (3 colunas)
components/
  terminal/               shell do Chat-CLI, blocos e wizards
  docs/                   sidebar, índice e renderizador Markdown
lib/
  commands/registry.ts    catálogo de comandos (fonte da verdade)
  commands/dispatch.ts    parsing e execução
  mrcpClient.ts           cliente REST do engine
  llmOrchestrator.ts      streaming unificado dos 4 provedores
  asciiTable.ts           JSON → tabela ASCII
  providers.ts            especificação dos provedores
  keyVault.ts             política de chaves (BYOK)
  docs.ts                 loader do conteúdo em Markdown
store/
  settingsStore.ts        Zustand persist (provedor, chaves, modelos)
  terminalStore.ts        estado efêmero do feed
content/docs/*.md         os 9 capítulos da documentação
examples/captures/*.json  respostas reais do engine usadas nos docs
```

## Convenções

| Tema | Regra |
| :--- | :--- |
| Idioma do código | comentários e identificadores em **inglês** |
| Idioma da interface | strings visíveis ao usuário em **português do Brasil** |
| Estilo | TypeScript estrito, sem `any` solto |
| Estado | persistir só configuração; feed e conversa são efêmeros |
| Dados | **nunca** simular, mockar ou ensaiar resposta de rede |

> A última regra é a mais importante deste repositório. Se um endpoint falhou, a UI diz que falhou. Se a lista de modelos não veio, ela rotula as sugestões como sugestões.

## Como adicionar um provedor

1. Em `lib/providers.ts`, adicione uma entrada em `PROVIDERS` (base URL, caminhos, dica de chave) e uma lista em `FALLBACK_MODELS`.
2. Se o provedor não for compatível com OpenAI, estenda `buildHeaders()` e `buildBody()` em `app/api/proxy/guard.ts`.
3. Se o dialeto SSE for próprio, estenda `transformEvent()` em `app/api/proxy/route.ts` — a normalização acontece **no servidor**, para que o navegador mantenha um único parser.
4. Se o host for novo, ele precisa entrar na allowlist (o allowlist é derivado de `PROVIDERS`, então isso é automático).

## Como adicionar um comando

Adicione uma entrada em `lib/commands/registry.ts`:

```ts
{
  name: "health",
  usage: "/health <url>",
  description: "Nota de manutenibilidade (A–F).",
  group: "analysis",
  endpoint: "code-health",
  method: "GET",
  requiresRepo: true,
  renderer: "table",
}
```

Comandos com `endpoint: null` são locais e precisam de um `case` em `runCommand` (`components/terminal/Terminal.tsx`).

## Commits e PRs

- Mensagens no imperativo, curtas: `add nvidia nim provider`.
- Um PR = uma mudança lógica.
- Descreva **como testou**. Se mexeu em proxy ou provedores, diga qual provedor usou (pode omitir a chave, claro).
- Nunca inclua chaves, tokens ou URLs privadas em issues, PRs ou capturas de tela.

## Segurança

Veja [SECURITY.md](SECURITY.md). Em resumo: `/api/proxy` é um alvo sensível — qualquer mudança ali precisa manter a allowlist e o bloqueio de endereços privados.
