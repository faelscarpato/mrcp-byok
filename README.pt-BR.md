# MRCP Web Terminal

**Um Chat-CLI para o MRCP Engine.** Comandos com barra falam com um engine de AST determinístico; texto livre fala com um LLM em streaming token a token. Sua chave de API nunca sai do seu navegador.

![Licença: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-087ea4?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)
![BYOK](https://img.shields.io/badge/keys-BYOK%20client--side-blueviolet)
![Sem backend](https://img.shields.io/badge/database-none-informational)

> English version: [README.md](README.md) · Documentação completa: rode `npm run dev` e abra `/docs`.

```
┌─ MRCP WEB TERMINAL ─────────────────── OpenAI · gpt-4o · direto ── /docs ─┐
│                                                                           │
│  ❯ /health expressjs/express                                              │
│                                                                           │
│  ┌ /health · /api/code-health · direto (browser → engine) · 1.4s ───────┐ │
│  │ maintainabilityIndex: 89                                             │ │
│  │ maintainabilityRating: EXCELLENT                                     │ │
│  │ letterGrade: A                                                       │ │
│  │                                                                      │ │
│  │ fonte: $.topRefactoringPriorities                                    │ │
│  │ ┌───────────────────────┬──────────────┬───────────────────────────┐ │ │
│  │ │ file                  │ effortHours  │ recommendedAction         │ │ │
│  │ ├───────────────────────┼──────────────┼───────────────────────────┤ │ │
│  │ │ src/graph/provider.ts │ 3.1          │ Decompor funções longas…  │ │ │
│  │ └───────────────────────┴──────────────┴───────────────────────────┘ │ │
│  ├──────────────────────────────────────────────────────────────────────┤ │
│  │ [ 📥 Baixar Análise ]  [ 🧠 Enviar para a IA ]  copiar JSON          │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ❯ quais módulos merecem atenção primeiro?                                │
│    ▍ provider.ts e config-5.ts concentram a complexidade…                 │
│                                                                           │
│  ❯ _                                                                      │
│  [ ESC ] [ TAB ] [ ↑ ] [ ↓ ] [ / ]                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

## Por que isso existe

Terminais clássicos forçam tudo em um fluxo linear de texto. O MRCP Engine devolve dados **estruturados** (grafos AST, ciclos de dependência, achados OWASP) e os LLMs devolvem **prosa**. Os dois merecem conviver no mesmo feed, cada um renderizado na forma que merece.

Então: um input, dois modos, e resultados que viram tabelas ASCII e painéis interativos **dentro do histórico** — não em modais, não em outra aba.

## Os sete pilares

| # | Pilar | O que faz |
| :-- | :--- | :--- |
| 1 | **Bate-chat nativo & streaming LLM** | `lib/llmOrchestrator.ts` faz streaming de OpenAI, Google Gemini, Anthropic Claude e NVIDIA NIM |
| 2 | **BYOK client-side** | a chave fica no `localStorage` (Zustand Persist). Sem banco, sem conta, sem cópia server-side |
| 3 | **Proxy serverless anti-CORS** | `/api/proxy` mascara a origem para provedores que bloqueiam navegador e repassa o SSE |
| 4 | **Wizards in-feed** | `/provedores` e `/model` renderizam painéis reais dentro do scrollback |
| 5 | **Opt-In Context Injection** | análise nenhuma alimenta o LLM automaticamente: você anexa, com estimativa de tokens |
| 6 | **Mobile first** | `100dvh`, `safe-area-inset`, `interactive-widget` e barra de atalhos ESC/TAB/↑/↓ |
| 7 | **Catálogo completo** | as 26 rotas REST reais do MRCP, um comando para cada |

## Começando

```bash
git clone https://github.com/faelscarpato/MRCP-BYOK
cd MRCP-BYOK
npm install
npm run dev
```

Abra <http://localhost:3000>. Os comandos MRCP funcionam **sem chave nenhuma** — o engine é público. Só o bate-papo precisa de uma:

```
/provedores      # escolha o provedor, cole a chave, busque os modelos reais
/model           # escolha o modelo
```

## Comandos

35 comandos. Vinte e sete mapeiam 1:1 as rotas REST de `https://mrcp-engine.vercel.app`; oito são locais.

**Sessão:** `/help` `/provedores` `/model` `/clear` `/about` `/ctx` `/export` `/transport`

**Análise:** `/analyze` `/suite` `/report` `/health` `/skills` `/search` `/monorepo` `/drift` `/tests` `/pack` `/docgen`

**Segurança:** `/security` `/env`

**Contratos:** `/contract` `/types` `/sql` `/dead` `/docanalyze`

**Web:** `/web` `/smart` `/scrape` `/deps` `/clone`

**Extras:** `/salvar chat` exporta toda a sessão em Markdown · `/vscode` e `/chrome` baixam as extensões oficiais do MRCP (`.vsix` de 210 KB e `.zip` de 396 KB, ambos verificados) · `/agente` baixa as diretrizes do agente do engine.

**Mutação (POST):** `/impact` `/refactor` `/diff` `/guidelines`

Referência completa: [`content/docs/comandos.md`](content/docs/comandos.md).

## Arquitetura

```
                        ┌───────────────────────────┐
   texto começando com /│  lib/commands/registry.ts │   35 CommandSpec
  ─────────────────────►│  lib/commands/dispatch.ts │──┐
                        └───────────────────────────┘  │
                                                       ▼
                        ┌───────────────────────────┐   ┌───────────────────────┐
                        │     lib/mrcpClient.ts     │──►│ mrcp-engine.vercel.app │
                        │  direto  |  /api/mrcp     │   │     26 rotas REST      │
                        └───────────────────────────┘   └───────────────────────┘
                                                       │
                                                       ▼
                        ┌───────────────────────────┐   ┌──────────────────────┐
   texto livre          │  lib/llmOrchestrator.ts   │──►│      /api/proxy      │
  ─────────────────────►│  1 parser SSE, 4 nuvens   │   │  máscara CORS + SSRF  │
                        └───────────────────────────┘   │  + normalização SSE   │
                                                        └──────────┬───────────┘
                                                                   ▼
                                            OpenAI · Gemini · Claude · NVIDIA NIM
```

Dois detalhes que valem saber:

- **Anthropic é normalizado no servidor.** O SSE dele usa `content_block_delta` / `message_stop` em vez de `choices[0].delta` do OpenAI. O proxy reescreve esses eventos para que o navegador implemente **um** parser.
- **Gemini usa o header `x-goog-api-key`**, nunca `?key=` — chave em query string vaza em logs de acesso e em cadeias de `Referer`.

## BYOK: onde sua chave realmente vai

```
Memória (sessão)   →  chave como digitada
localStorage       →  chave como digitada (BYOK)
Servidor / banco   →  nada. Não existe armazenamento server-side.
```

A chave é guardada **em texto puro**, e isso é decisão deliberada:

- cifrar um segredo dentro de um navegador que precisa decifrá-lo sem senha é teatro;
- ofuscar cria modos de falha (transformação irreversível) sem ganho real de segurança;
- é BYOK — a chave é sua e a responsabilidade é sua.

Veja [`lib/keyVault.ts`](lib/keyVault.ts) e [`content/docs/byok.md`](content/docs/byok.md).

## Transporte: direto por padrão

O MRCP Engine já envia `Access-Control-Allow-Origin: *`, então o navegador o chama **direto** — fugindo do teto de 60 s de funções serverless em análises longas (`/api/env-validator` foi medido em 24 s). `/transport proxy` roteia via `/api/mrcp` para redes corporativas. Cada bloco de resultado mostra qual caminho foi usado.

## Só dado real

Sem mocks, sem respostas ensaiadas, sem payload de "exemplo". Se a chamada ao provedor falha, a UI diz que falhou; se a lista de modelos não vem, o wizard rotula as sugestões como sugestões. Todo JSON da documentação foi capturado ao vivo — veja [`examples/captures/`](examples/captures).

## Estrutura do projeto

```
app/            rotas: terminal (/), documentação (/docs), /api/proxy, /api/mrcp
components/     shell do terminal, blocos e wizards; sidebar e prosa dos docs
lib/            commands, mrcpClient, llmOrchestrator, asciiTable, providers, keyVault
store/          settingsStore (persistido) e terminalStore (efêmero)
content/docs/   os nove capítulos da documentação, em Markdown
examples/       respostas reais capturadas do engine
```

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Resumo: comentários em inglês, strings de interface em pt-BR, TypeScript estrito e **nunca simular uma resposta de rede**.

Relato de vulnerabilidade: [SECURITY.md](SECURITY.md) (relato privado, não issue pública).

## Licença

[MIT](LICENSE) © 2026 Rafael Scarpato

O MRCP Engine é um serviço separado (`https://mrcp-engine.vercel.app`); este repositório é um cliente dele.
