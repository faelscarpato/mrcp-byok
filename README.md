# MRCP Web Terminal

**A Chat-CLI for the MRCP Engine.** Slash commands talk to a deterministic AST engine; free text talks to an LLM with token-by-token streaming. Your API key never leaves your browser.

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-087ea4?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)
![BYOK](https://img.shields.io/badge/keys-BYOK%20client--side-blueviolet)
![No backend](https://img.shields.io/badge/database-none-informational)

> Read this in Portuguese: [README.pt-BR.md](README.pt-BR.md) · Full documentation: run `npm run dev` and open `/docs`.

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

## Why this exists

Classic terminals force everything into a linear text stream. The MRCP Engine returns **structured** data (AST graphs, dependency cycles, OWASP findings), and LLMs return **prose**. Both deserve to live in the same feed, each rendered in the shape it deserves.

So: one input, two modes, and results rendered as ASCII tables and interactive panels **inside the history** — not in modals, not in a separate tab.

## The seven pillars

| # | Pillar | What it does |
| :-- | :--- | :--- |
| 1 | **Native chat + LLM streaming** | `lib/llmOrchestrator.ts` streams from OpenAI, Google Gemini, Anthropic Claude and NVIDIA NIM |
| 2 | **BYOK client-side** | Your key stays in `localStorage` (Zustand Persist). No database, no account, no server copy |
| 3 | **Serverless anti-CORS proxy** | `/api/proxy` masks the origin for providers that block browsers, and streams SSE through |
| 4 | **Wizards in-feed** | `/provedores` and `/model` render real UI panels inside the scrollback |
| 5 | **Opt-In Context Injection** | An analysis never auto-feeds the LLM: you attach it explicitly, with a token estimate |
| 6 | **Mobile first** | `100dvh`, `safe-area-inset`, `interactive-widget`, and an on-screen ESC/TAB/↑/↓ toolbar |
| 7 | **Complete command catalog** | All 26 real MRCP REST routes, one slash command each |

## Quick start

```bash
git clone https://github.com/faelscarpato/MRCP-BYOK
cd MRCP-BYOK
npm install
npm run dev
```

Open <http://localhost:3000>. MRCP commands work **with no key at all** — the engine is public. Only the chat needs one:

```
/provedores      # pick a provider, paste your key, fetch the real model list
/model           # choose a model
```

## Commands

39 commands. 28 map 1:1 to the live REST routes of `https://mrcp-engine.vercel.app` (including the PageCloner); the rest are local.

**Session:** `/help` `/provedores` `/model` `/clear` `/about` `/ctx` `/export` `/transport` `/salvar` `/vscode` `/chrome` `/agente`

**Analysis:** `/analyze` `/suite` `/report` `/health` `/skills` `/search` `/monorepo` `/drift` `/tests` `/pack` `/docgen`

**Security:** `/security` `/env`

**Contracts:** `/contract` `/types` `/sql` `/dead` `/docanalyze`

**Web:** `/web` `/smart` `/scrape` `/deps` `/clone`

**Extras:** `/salvar chat` exports the whole session as Markdown · `/vscode` and `/chrome` download the official MRCP extensions (verified 210 KB `.vsix` and 396 KB `.zip`) · `/agente` downloads the agent guidelines from the engine.

**Mutation (POST):** `/impact` `/refactor` `/diff` `/guidelines`

Full reference: [`content/docs/comandos.md`](content/docs/comandos.md).

## Architecture

```
                          ┌───────────────────────────┐
   text starting with /   │  lib/commands/registry.ts │   35 CommandSpec entries
  ───────────────────────►│  lib/commands/dispatch.ts │──┐
                          └───────────────────────────┘  │
                                                         ▼
                          ┌───────────────────────────┐   ┌───────────────────────┐
                          │     lib/mrcpClient.ts     │──►│ mrcp-engine.vercel.app │
                          │  direct  |  /api/mrcp     │   │     26 REST routes     │
                          └───────────────────────────┘   └───────────────────────┘
                                                         │
                                                         ▼
                          ┌───────────────────────────┐   ┌──────────────────────┐
   free text              │  lib/llmOrchestrator.ts   │──►│      /api/proxy      │
  ───────────────────────►│  one SSE parser, 4 clouds │   │  CORS mask + SSRF     │
                          └───────────────────────────┘   │  + SSE normalisation  │
                                                          └──────────┬───────────┘
                                                                     ▼
                                              OpenAI · Gemini · Claude · NVIDIA NIM
```

Two details worth knowing:

- **Anthropic is normalised server-side.** Its SSE uses `content_block_delta` / `message_stop` instead of OpenAI's `choices[0].delta`. The proxy rewrites those events so the browser implements exactly **one** parser.
- **Gemini uses the `x-goog-api-key` header**, never `?key=` — a key in a query string leaks into access logs and `Referer` chains.

## BYOK: where your key actually goes

```
Memory (session)   →  key as typed
localStorage       →  key as typed (BYOK)
Server / database  →  nothing. There is no server-side store.
```

The key is stored **in plaintext**, and that is a deliberate decision:

- encrypting a secret inside a browser that must decrypt it without a password is theatre;
- obfuscation adds irreversible-transform failure modes with zero security gain;
- this is BYOK — the key is yours and the responsibility is yours.

See [`lib/keyVault.ts`](lib/keyVault.ts) and [`content/docs/byok.md`](content/docs/byok.md).

## Transport: direct by default

The MRCP Engine already sends `Access-Control-Allow-Origin: *`, so the browser calls it **directly** — avoiding the 60 s serverless ceiling on long analyses (`/api/env-validator` was measured at 24 s). `/transport proxy` routes through `/api/mrcp` for corporate networks. Every result block shows which path was used.

## Real data only

No mocks, no canned responses, no "example" payloads. If a provider call fails, the UI says it failed; if the model list is unavailable, the wizard labels its suggestions as suggestions. Every JSON snippet in the docs was captured live — see [`examples/captures/`](examples/captures).

## Project structure

```
app/            routes: terminal (/), docs (/docs), /api/proxy, /api/mrcp
components/     terminal shell, blocks, wizards; docs sidebar and prose
lib/            commands, mrcpClient, llmOrchestrator, asciiTable, providers, keyVault
store/          settingsStore (persisted) and terminalStore (ephemeral)
content/docs/   the nine documentation chapters, in Markdown
examples/       real captured engine responses
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: comments in English, UI strings in pt-BR, strict TypeScript, and **never fake a network response**.

Security reports: [SECURITY.md](SECURITY.md) (private report, not a public issue).

## License

[MIT](LICENSE) © 2026 Rafael Scarpato

The MRCP Engine itself is a separate service (`https://mrcp-engine.vercel.app`); this repository is a client for it.
