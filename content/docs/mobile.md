# Responsividade mobile first

Terminal que não funciona no celular é enfeite. O layout inteiro foi pensado para caber em uma tela com teclado virtual aberto.

## `100dvh` em vez de `100vh`

`100vh` em navegadores móveis inclui a área das barras de endereço, que somem ao rolar — resultado: o composer fica escondido embaixo da viewport. `dvh` (*dynamic viewport height*) acompanha a viewport real.

```css
.app-shell {
  height: 100dvh;
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top);
  padding-bottom: max(env(safe-area-inset-bottom), var(--kb-height));
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

## `safe-area-inset` e o notch

Em iPhones com notch ou ilha dinâmica, conteúdo encostado nas bordas fica embaixo da área segura. Os quatro `env(safe-area-inset-*)` resolvem. Note o `max()` no `padding-bottom`: ele disputa com `--kb-height` (altura do teclado) e vence quem for maior — assim o composer nunca fica atrás do teclado **nem** atrás da barra de gesto.

## `interactive-widget`: a meta tag que evita o teclado sobre o Omnibox

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0a0a0a",
};
```

`interactive-widget=resizes-content` diz ao Chromium: quando o teclado abrir, **redimensione a viewport** em vez de cobrir o conteúdo. Sem isso, o composer desaparece atrás do teclado e o usuário digita às cegas.

## iOS não obedece — e por isso existe `visualViewport`

Safari ignora a meta tag. O terminal mede o teclado manualmente:

```ts
const viewport = window.visualViewport;
const update = () => {
  const height = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
  document.documentElement.style.setProperty("--kb-height", `${height}px`);
};
viewport.addEventListener("resize", update);
viewport.addEventListener("scroll", update);
```

A variável alimenta o `padding-bottom` do shell. Funciona em qualquer navegador que exponha `visualViewport`, inclusive onde a meta tag já resolve (aí a altura medida é 0 e nada muda).

## Mobile Toolbar com atalhos nativos

Teclados virtuais não têm ESC, TAB ou setas — e sem eles não há autocompletar nem histórico. A barra inferior expõe:

| Botão | Equivalente | Ação |
| :--- | :--- | :--- |
| `ESC` / `CTRL-C` | `Escape` | cancela geração em curso; se não houver, limpa o input |
| `TAB` | `Tab` | autocompleta o comando a partir do `/` digitado |
| `↑` | `ArrowUp` | comando anterior do histórico |
| `↓` | `ArrowDown` | próximo comando do histórico |
| `/` | — | insere a barra e foca o composer |

Cada botão chama **o mesmo handler** do teclado físico. Não existe caminho paralelo de lógica.

## Detalhes que fazem diferença no toque

- `enterKeyHint="send"` — o teclado mostra "Enviar" em vez de "Enter".
- `autoCapitalize="off"` e `autoCorrect="off"` — o terminal não deve corrigir `gpt-4o` para `Gpt-4o`.
- `overscroll-behavior-y: none` — impede o "pull to refresh" ao rolar o histórico.
- `caret` com animação desligada sob `prefers-reduced-motion`.
- Tabelas ASCII rolam horizontalmente (`overflow-x: auto`), nunca refluem.
