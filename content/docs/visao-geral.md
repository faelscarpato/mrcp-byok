# Visão geral

O **MRCP Web Terminal** abandona a interface engessada do TTY clássico e propõe um paradigma **Chat-CLI**: um feed inteligente onde comandos e conversa convivem no mesmo fluxo.

Em vez de emular um terminal dos anos 80, ele se comporta como um *chat* que entende comandos. Você digita `/` para operar a máquina; digita texto livre para pensar junto com um modelo de linguagem. Resultados de análise não são texto corrido: são tabelas ASCII e painéis interativos renderizados **dentro do histórico**.

## Os dois modos de um mesmo input

| Entrada | Comportamento |
| :--- | :--- |
| `/analyze expressjs/express` | Comando nativo. Chama o MRCP Engine ao vivo e renderiza tabela ASCII. |
| `explique a arquitetura deste repo` | Bate-papo. Envia para o LLM com streaming token a token. |
| `/provedores` | Abre um **Wizard** (interface gráfica) dentro do feed. |

Não há distinção visual entre "terminal" e "chat": tudo é um bloco no mesmo *scrollback*. A fronteira é semântica, não técnica.

## Os sete pilares

1. **Bate-Chat nativo & streaming LLM** — `lib/llmOrchestrator.ts` fala com OpenAI, Google Gemini, Anthropic Claude e NVIDIA NIM.
2. **BYOK client-side** — a chave nunca vai para banco nenhum; vive no `localStorage` via Zustand Persist (texto puro, e [isso é deliberado](/docs/byok)).
3. **Proxy serverless anti-CORS** — `/api/proxy` mascara a origem e permite streaming e listagem real de modelos.
4. **Wizards in-feed** — `/provedores` e `/model` renderizam painéis interativos no histórico.
5. **Opt-In Context Injection** — após `/mrcp analyze <url>`, a AST **não** é enviada automaticamente; você escolhe.
6. **Responsividade mobile first** — `100dvh`, `safe-area-inset` e `interactive-widget`.
7. **Catálogo completo de comandos** — as 26 rotas reais do engine, uma a uma.

## Por que não é um terminal comum

Um TTY clássico tem três limitações que este projeto ataca:

- **Saída linear**: tudo é texto. Aqui, um resultado de análise é uma tabela ASCII com botões.
- **Sem memória de contexto**: você copia e cola manualmente. Aqui existe anexo de contexto com estimativa de tokens.
- **Hostil ao toque**: teclados virtuais cobrem o prompt. Aqui existe `visualViewport` e uma barra de atalhos nativos.

## Arquitetura em uma linha

```
Composer → (slash? dispatch → MRCP Engine | texto livre → llmOrchestrator)
              ↓                                  ↓
          Bloco de tabela ASCII            Bloco de stream
              ↓                                  ↓
        [ 📥 Baixar ] [ 🧠 Enviar para a IA ]  → contexto anexado → próximo prompt
```

## Verificado, não prometido

Todos os exemplos desta documentação foram **capturados ao vivo** do engine em `https://mrcp-engine.vercel.app`. Veja [Respostas reais capturadas](/docs/respostas-reais).
