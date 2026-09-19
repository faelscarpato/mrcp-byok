# Security Policy

## Modelo de ameaças (honesto)

Este projeto é **BYOK e client-side**. Entenda exatamente o que está em jogo:

| Ameaça | Status |
| :--- | :--- |
| Chave de API vazando para nosso servidor | **Não existe**: não há backend de contas, banco ou telemetria |
| Chave lida por outro site | **Não**: `localStorage` é isolado por origem |
| Chave lida por script malicioso na mesma origem | **Possível** — vale para qualquer app web |
| Chave lida por alguém com a sessão desbloqueada | **Possível** — a chave fica em texto puro no `localStorage` |
| Proxy usado como SSRF | **Mitigado**: allowlist + resolução DNS + bloqueio de redes privadas |

A chave é armazenada **em texto puro** de propósito. Criptografá-la dentro do navegador seria teatro: a chave da fechadura ficaria ao lado da fechadura. Veja [`lib/keyVault.ts`](lib/keyVault.ts) e [`/docs/byok`](/docs/byok).

Se você precisa de garantias maiores: use uma chave **escopada e rotativa** e remova-a ao fim da sessão com `/provedores` → **Esquecer**.

## `/api/proxy` é o ponto sensível

Um proxy aberto permitiria que terceiros usassem nosso servidor para alcançar redes internas. `app/api/proxy/guard.ts` aplica duas camadas:

1. **Allowlist de hostnames** derivada de `lib/providers.ts` (OpenAI, Gemini, Anthropic, NVIDIA).
2. Para URL customizada (opt-in explícito do usuário):
   - apenas `https:`;
   - bloqueio de `localhost`, `*.local`, `*.internal`, `metadata.google.internal`;
   - resolução DNS e rejeição de IP privado: `10.*`, `127.*`, `172.16–31.*`, `192.168.*`, `169.254.*`, CGNAT `100.64–127.*`, `::1`, `fe80::/10`, `fc00::/7`.

Ao mexer nesse arquivo, **não remova** nenhuma dessas verificações. Teste com:

```bash
curl -s -X POST http://localhost:3000/api/proxy \
  -H 'Content-Type: application/json' \
  -d '{"action":"models","provider":"custom","apiKey":"x","baseUrl":"http://169.254.169.254/latest"}'
# esperado: HTTP 403
```

## Versionamento de dependências

Rode `npm audit` antes de abrir PR. O projeto tem poucas dependências de propósito: Next.js, React, Zustand, react-markdown e remark-gfm.

## Reportar uma vulnerabilidade

**Não abra issue pública.** Envie um relatório privado para o mantenedor do repositório com:

- descrição e passos para reproduzir;
- impacto (o que um atacante consegue);
- versão/commit testada;
- sugestão de correção, se tiver.

Responda em até 7 dias com uma avaliação inicial. Se confirmada, a correção e o crédito vão para o mesmo PR (a menos que você prefira anonimato).

## Fora de escopo

- "A chave aparece no DevTools" — comportamento esperado e documentado.
- Rate limit ou custo de provedor — responsabilidade do usuário (BYOK).
- Conteúdo retornado pelo MRCP Engine — é dado de um serviço terceiro.
