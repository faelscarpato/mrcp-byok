# Catálogo de comandos

Trinta e nove comandos. Vinte e oito deles mapeiam as rotas REST reais do MRCP Engine (`https://mrcp-engine.vercel.app`), incluindo o PageCloner (`/api/clone`); os demais são locais e nunca saem do navegador.

A fonte da verdade é `lib/commands/registry.ts`:

```ts
export interface CommandSpec {
  name: string;
  usage: string;
  description: string;
  group: "meta" | "analysis" | "security" | "contracts" | "web" | "mutation";
  endpoint: string | null;
  method: "GET" | "POST";
  requiresRepo: boolean;
  args?: string[];
  raw?: boolean;
  renderer: "table" | "text" | "json";
}
```

## Sessão (locais)

| Comando | O que faz |
| :--- | :--- |
| `/help` | lista todos os comandos agrupados |
| `/provedores` | abre o Wizard de provedor/chave/modelos |
| `/model [nome]` | troca o modelo sem reautenticar |
| `/clear` | limpa o histórico |
| `/about` | sobre o projeto, transporte e BYOK |
| `/ctx [limpar]` | mostra ou remove o contexto anexado |
| `/export` | baixa o último resultado em JSON |
| `/transport [direto\|proxy]` | alterna chamada direta ao engine ou via `/api/mrcp` |
| `/salvar chat` | exporta toda a conversa da sessão em Markdown (`.md`) |
| `/vscode` | baixa a extensão MRCP para VS Code (`.vsix`, 210 KB) |
| `/chrome` | baixa a extensão MRCP para Chrome (`.zip`, 396 KB) |
| `/agente` | baixa o arquivo do agente MRCP (.md) direto do engine, com as diretrizes oficiais. |

Apelidos aceitos: `/save`, `/salvarchat`, `/exportarchat`, `/vs`, `/code`, `/vsix`, `/clonar`, `/pagecloner`, `/chromeext`, `/agent`, `/agenteai`, `/agente`.

## Análise

| Comando | Endpoint |
| :--- | :--- |
| `/analyze <url>` | `/api/analyze` |
| `/suite <url>` | `/api/full-suite` |
| `/report <url>` | `/api/report` |
| `/health <url>` | `/api/code-health` |
| `/skills <url>` | `/api/skills` |
| `/search <url> <termo>` | `/api/search` |
| `/monorepo <url>` | `/api/monorepo-graph` |
| `/drift <url>` | `/api/architecture-drift` |
| `/tests <url>` | `/api/test-gap-analysis` |
| `/pack <url> <tarefa>` | `/api/context-pack` |
| `/docgen <url> [arquivo]` | `/api/doc-generator` |

## Segurança

| Comando | Endpoint |
| :--- | :--- |
| `/security <url>` | `/api/security-audit` |
| `/env <url>` | `/api/env-validator` |

## Contratos

| Comando | Endpoint |
| :--- | :--- |
| `/contract <url>` | `/api/api-contract` |
| `/types <url> [arquivo]` | `/api/type-signature-extractor` |
| `/sql <url> [schema]` | `/api/sql-orm-contract` |
| `/dead <url>` | `/api/dead-code-pruner` |
| `/docanalyze <url>` | `/api/document-analyzer` |

## Web

| Comando | Endpoint |
| :--- | :--- |
| `/web <consulta>` | `/api/web-search` |
| `/smart <consulta>` | `/api/smart-search` |
| `/scrape <url>` | `/api/scrape` |
| `/deps <pacote> [versão]` | `/api/dependency-resolver` |
| `/clone <url>` | `/api/clone` (PageCloner Pro) |

## Mutação (POST)

| Comando | Endpoint |
| :--- | :--- |
| `/impact <url> <arquivos>` | `/api/impact-analysis` |
| `/refactor <ação> <símbolo> [novoNome]` | `/api/refactor-applier` |
| `/diff <diff>` | `/api/diff-summarizer` |
| `/guidelines` | `/api/guidelines` (Markdown, sem JSON) |

## Conveniências de parsing

- `expressjs/express` é aceito e expandido para `https://github.com/expressjs/express`.
- Argumentos entre aspas são preservados: `/pack <url> "implementar webhook de pagamento"`.
- Flags `--chave=valor` vão para query string (GET) ou corpo (POST).
- `TAB` autocompleta a partir do prefixo digitado.
