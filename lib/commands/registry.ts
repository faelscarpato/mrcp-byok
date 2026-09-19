import type { CommandSpec } from "../types";

/**
 * The single source of truth for slash commands.
 *
 * Every MRCP Engine REST route has exactly one command here — see
 * https://mrcp-engine.vercel.app for the live API. Commands with
 * `endpoint: null` are handled locally by the terminal and never leave
 * the browser.
 */
export const COMMANDS: CommandSpec[] = [
  // ---------------------------------------------------------------- meta
  { name: "help", usage: "/help", description: "Lista todos os comandos disponíveis.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "provedores", usage: "/provedores", description: "Painel visual (Wizard) para escolher provedor, URL customizada, chave e buscar modelos reais.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "model", usage: "/model [nome]", description: "Troca o modelo ativo sem reautenticar. Sem argumento, abre o seletor.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "clear", usage: "/clear", description: "Limpa o histórico da sessão.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "about", usage: "/about", description: "Sobre o MRCP Web Terminal, BYOK e o engine.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "ctx", usage: "/ctx [limpar]", description: "Mostra o contexto anexado ao próximo prompt, ou remove com /ctx limpar.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "export", usage: "/export", description: "Baixa o último resultado MRCP em JSON.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "transport", usage: "/transport [direto|proxy]", description: "Alterna entre chamada direta ao engine e relay via /api/mrcp.", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "salvar", usage: "/salvar chat", description: "Exporta toda a conversa da sessão em Markdown (.md).", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "vscode", usage: "/vscode", description: "Baixa a extensão MRCP para VS Code (.vsix).", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },
  { name: "chrome", usage: "/chrome", description: "Baixa a extensão MRCP para Google Chrome (.zip).", group: "meta", endpoint: null, method: "GET", requiresRepo: false, renderer: "text" },

  { name: "agente", usage: "/agente", description: "Baixa o arquivo do agente MRCP (.md) direto do engine, com as diretrizes oficiais.", group: "meta", endpoint: "guidelines", method: "GET", requiresRepo: false, raw: true, renderer: "text" },

  // ------------------------------------------------------------ analysis
  { name: "analyze", usage: "/analyze <url>", description: "Grafo AST completo: módulos, dependências e complexidade.", group: "analysis", endpoint: "analyze", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "suite", usage: "/suite <url>", description: "Dispara as suítes de diagnóstico consolidadas (full-suite).", group: "analysis", endpoint: "full-suite", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "report", usage: "/report <url>", description: "Relatório formatado do diagnóstico completo.", group: "analysis", endpoint: "report", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "health", usage: "/health <url>", description: "Nota de manutenibilidade (A–F) e índice de saúde do código.", group: "analysis", endpoint: "code-health", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "skills", usage: "/skills <url>", description: "Contratos de refatoração para hotspots de complexidade.", group: "analysis", endpoint: "skills", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "search", usage: "/search <url> <termo>", description: "Busca semântica por nome ou caminho de arquivo no grafo.", group: "analysis", endpoint: "search", method: "GET", requiresRepo: true, args: ["q"], renderer: "table" },
  { name: "monorepo", usage: "/monorepo <url>", description: "Grafo de dependências entre workspaces de monorepo.", group: "analysis", endpoint: "monorepo-graph", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "drift", usage: "/drift <url>", description: "Ciclos de dependência (Tarjan) e desvios de arquitetura.", group: "analysis", endpoint: "architecture-drift", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "tests", usage: "/tests <url>", description: "Caminhos lógicos sem cobertura de teste + stubs gerados.", group: "analysis", endpoint: "test-gap-analysis", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "pack", usage: "/pack <url> <tarefa>", description: "Pacote de contexto podado (AST mínimo) para uma tarefa.", group: "analysis", endpoint: "context-pack", method: "GET", requiresRepo: true, args: ["task"], renderer: "table" },
  { name: "docgen", usage: "/docgen <url> [arquivo]", description: "Cobertura de docstrings e geração de TSDoc/JSDoc.", group: "analysis", endpoint: "doc-generator", method: "GET", requiresRepo: true, args: ["file"], renderer: "table" },

  // ------------------------------------------------------------ security
  { name: "security", usage: "/security <url>", description: "Auditoria OWASP, segredos hardcoded e licenças.", group: "security", endpoint: "security-audit", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "env", usage: "/env <url>", description: "Validação de .env contra .env.example + schema Zod gerado.", group: "security", endpoint: "env-validator", method: "GET", requiresRepo: true, renderer: "table" },

  // ----------------------------------------------------------- contracts
  { name: "contract", usage: "/contract <url>", description: "Especificação OpenAPI 3.0.3 e SDK TypeScript.", group: "contracts", endpoint: "api-contract", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "types", usage: "/types <url> [arquivo]", description: "Assinaturas de tipos e schemas Zod sem corpos de implementação.", group: "contracts", endpoint: "type-signature-extractor", method: "GET", requiresRepo: true, args: ["file"], renderer: "table" },
  { name: "sql", usage: "/sql <url> [schema]", description: "Modelos Prisma/Drizzle/TypeORM e DDL SQL.", group: "contracts", endpoint: "sql-orm-contract", method: "GET", requiresRepo: true, args: ["schema"], renderer: "table" },
  { name: "dead", usage: "/dead <url>", description: "Código inalcançável e exports órfãos.", group: "contracts", endpoint: "dead-code-pruner", method: "GET", requiresRepo: true, renderer: "table" },
  { name: "docanalyze", usage: "/docanalyze <url>", description: "Parser estruturado de CSV, DOCX, XLSX, PDF, YAML e XML.", group: "contracts", endpoint: "document-analyzer", method: "GET", requiresRepo: true, renderer: "table" },

  // ----------------------------------------------------------------- web
  { name: "web", usage: "/web <consulta>", description: "Busca web (DuckDuckGo) usada pelo engine.", group: "web", endpoint: "web-search", method: "GET", requiresRepo: false, args: ["q"], renderer: "table" },
  { name: "smart", usage: "/smart <consulta>", description: "Busca inteligente com raspagem das melhores fontes.", group: "web", endpoint: "smart-search", method: "GET", requiresRepo: false, args: ["q"], renderer: "table" },
  { name: "scrape", usage: "/scrape <url>", description: "Raspa uma página e devolve o conteúdo estruturado.", group: "web", endpoint: "scrape", method: "GET", requiresRepo: false, args: ["url"], renderer: "table" },
  { name: "deps", usage: "/deps <pacote> [versão]", description: "Compatibilidade SemVer da árvore de dependências.", group: "web", endpoint: "dependency-resolver", method: "GET", requiresRepo: false, args: ["package", "version"], renderer: "table" },
  { name: "clone", usage: "/clone <url>", description: "PageCloner Pro: extrai tokens de design, CSS, fontes e estrutura DOM de uma página.", group: "web", endpoint: "clone", method: "GET", requiresRepo: false, args: ["url"], renderer: "table" },

  // ------------------------------------------------------------ mutation
  { name: "impact", usage: "/impact <url> <arquivo1,arquivo2>", description: "Raio de impacto de arquivos modificados (POST).", group: "mutation", endpoint: "impact-analysis", method: "POST", requiresRepo: true, args: ["modifiedFiles"], renderer: "table" },
  { name: "refactor", usage: "/refactor <ação> <símbolo> [novoNome]", description: "Refatoração AST em lote: rename, extract, move (POST).", group: "mutation", endpoint: "refactor-applier", method: "POST", requiresRepo: false, args: ["action", "targetSymbol", "newSymbolName"], renderer: "table" },
  { name: "diff", usage: "/diff <diff>", description: "Resumo semântico de um diff Git colado no terminal (POST).", group: "mutation", endpoint: "diff-summarizer", method: "POST", requiresRepo: false, args: ["diffContent"], renderer: "table" },
  { name: "guidelines", usage: "/guidelines", description: "Diretrizes oficiais do engine para agentes de IA (Markdown).", group: "mutation", endpoint: "guidelines", method: "GET", requiresRepo: false, raw: true, renderer: "text" },
];

export const COMMAND_MAP = new Map(COMMANDS.map((command) => [command.name, command]));

/**
 * Spelling variants that resolve to a canonical command.
 * `/Salvar Chat`, `/save` and `/exportarchat` are the same thing.
 */
export const COMMAND_ALIASES: Record<string, string> = {
  save: "salvar",
  salvarchat: "salvar",
  "salvar-chat": "salvar",
  exportarchat: "salvar",
  exportar: "salvar",
  clone: "clone",
  clonar: "clone",
  pagecloner: "clone",
  vs: "vscode",
  code: "vscode",
  vsix: "vscode",
  chromeext: "chrome",
  extensao: "chrome",
  agent: "agente",
  agenteai: "agente",
  guidelines: "guidelines",
};

export const GROUP_LABELS: Record<CommandSpec["group"], string> = {
  meta: "Sessão",
  analysis: "Análise",
  security: "Segurança",
  contracts: "Contratos",
  web: "Web",
  mutation: "Mutação (POST)",
};

export const GROUP_ORDER: CommandSpec["group"][] = ["meta", "analysis", "security", "contracts", "web", "mutation"];
