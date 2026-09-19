# Opt-In Context Injection

Este é o pilar mais filosófico do projeto: **análise de código não deve virar prompt automaticamente**.

Quando você roda `/mrcp analyze <url>` (ou qualquer comando de análise), o terminal renderiza uma **tabela ASCII** e para. A AST fica em memória, no bloco. Nada é enviado ao LLM.

## Os dois botões

```
┌────────────────────────────────────────────────────────────────┐
│ /health · /api/code-health · direto · 1.4s · ~520 tokens · 2 KB │
├────────────────────────────────────────────────────────────────┤
│  (tabela ASCII do resultado)                                    │
├────────────────────────────────────────────────────────────────┤
│  [ 📥 Baixar Análise ]   [ 🧠 Enviar para a IA ]   copiar JSON  │
└────────────────────────────────────────────────────────────────┘
```

### `[ 📥 Baixar Análise ]`

Gera um `Blob` no navegador e baixa o **JSON bruto** (`mrcp-code-health.json`). Nada passa por servidor.

### `[ 🧠 Enviar para a IA ]`

1. Anexa o payload ao próximo prompt como `<contexto name="/api/code-health">…</contexto>`;
2. Mostra a estimativa de tokens **antes** de você enviar;
3. Move o foco para o composer — você escreve a pergunta;
4. Só então, no Enter, o contexto viaja.

O bloco exibe o selo `injected` e o composer passa a mostrar `📎 contexto anexado`. `/ctx limpar` desanexa.

## Estimativa de tokens

```ts
export function estimateTokens(value: unknown): number {
  const json = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return Math.max(1, Math.ceil(json.length / 4));
}
```

É uma heurística (~4 caracteres por token), deliberadamente conservadora. Ela existe para **avisar antes**, não para calcular a fatura.

## Tabela ASCII genérica

Cada rota do engine devolve um formato diferente, então escrevemos 26 renderizadores? Não. `lib/asciiTable.ts` faz o caminho inverso:

1. Remove o envelope (`{ status, code_health }`) e guarda os escalares como cabeçalho;
2. Busca em largura o maior `Array<object>` do payload;
3. Ranqueia colunas por densidade de informação — taxa de preenchimento × 3 + numericidade − comprimento médio/40 — e mantém no máximo 6;
4. Desenha com *box-drawing* (`┌┬┐│├┼┤└┴┘`), alinhando números à direita;
5. Informa quantas linhas e colunas foram omitidas — e aponta para o download do JSON completo.

Se não houver array, cai para uma tabela `campo | valor`.

## Exemplo real

`/health expressjs/express` produce, entre outras linhas:

```
┌──────────────────────────────┬───────────────────────┬──────────┐
│ file                         │ recommendedAction     │ …        │
├──────────────────────────────┼───────────────────────┼──────────┤
│ src/graph/provider.ts        │ Decompor funções…     │ …        │
│ src/core/index-2.ts          │ Decompor funções…     │ …        │
└──────────────────────────────┴───────────────────────┴──────────┘
```

A tabela é monolargura e com `overflow-x: auto`: em telas estreitas ela rola, nunca reflui — porque *box-drawing* refluído deixa de ser tabela.
