# Proxy serverless anti-CORS

`/api/proxy` é uma rota Next.js (Route Handler) que existe por um motivo concreto: **OpenAI, Anthropic e NVIDIA não enviam cabeçalhos CORS**. Um `fetch` direto do navegador falha no *preflight*, sempre. O Gemini aceita CORS, mas a chave em query string é um risco que não queremos correr.

## O que a rota faz

```
POST /api/proxy
{ action: "models" | "chat", provider, apiKey, baseUrl?, model?, messages? }
        │
        ├─ valida provedor e chave
        ├─ resolve base URL e caminho (/models ou /chat/completions)
        ├─ assertSafeTarget()  ← allowlist + anti-SSRF
        ├─ monta headers por provedor (Bearer / x-goog-api-key / x-api-key)
        └─ pipe do corpo com normalização de SSE
```

Cabeçalhos de resposta para streaming:

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` é essencial: sem ele, proxies reversos (Nginx, Vercel) podem bufferizar o stream e você recebe a resposta inteira de uma vez, matando o efeito token a token.

## Por que POST para listar modelos também

A chave viaja no **corpo**, nunca na URL. Query strings aparecem em logs de acesso, em histórico de proxy e em cadeias de `Referer`. Custo: abandonamos o `GET` semanticamente puro em favor de não vazar credencial.

## Anti-SSRF: duas camadas

Um proxy aberto é uma falha de segurança — ele permitiria que alguém usasse nosso servidor para acessar a rede interna. `app/api/proxy/guard.ts` aplica:

1. **Allowlist de hostnames** para os quatro provedores conhecidos.
2. Para URL customizada (opt-in explícito):
   - somente `https:`;
   - bloqueio de padrões (`localhost`, `*.local`, `*.internal`, `metadata.google.internal`);
   - **resolução DNS** com `dns.promises.lookup` e rejeição de IP privado: `10.*`, `127.*`, `172.16–31.*`, `192.168.*`, `169.254.*` (link-local/metadata), CGNAT `100.64–127.*`, `::1`, `fe80::/10`, `fc00::/7`.

```ts
if (addresses.length === 0 || addresses.some((entry) => isPrivateIp(entry.address))) {
  throw new ProxyGuardError(`Endereço privado ou reservado bloqueado: ${url.hostname}`);
}
```

## O que o proxy **não** faz

- Não grava log, não guarda a chave, não faz cache.
- Não toca no MRCP Engine (veja abaixo).

## O caso do MRCP Engine: transporte híbrido

O engine **já responde com `Access-Control-Allow-Origin: *`**. Ou seja, o navegador pode chamá-lo direto — e isso é melhor, porque evita o teto de execução de funções serverless (análises longas podem passar de 60 s e o plano Hobby corta em 504).

Por isso existe `/transport`:

| Transporte | Caminho | Quando usar |
| :--- | :--- | :--- |
| `direct` (padrão) | navegador → `mrcp-engine.vercel.app` | melhor na maioria dos casos |
| `proxy` | navegador → `/api/mrcp` → engine | redes corporativas que bloqueiam terceiros |

O transporte usado aparece em **cada bloco de resultado**, para você nunca ter dúvida sobre por onde o dado passou.

## A chave passa pelo proxy — e isso está documentado

Se o provedor bloqueia CORS, a chave precisa transitar por algum servidor para chegar até ele. Não há como escapar disso mantendo o app 100% client-side. O que garantimos:

- a função é *stateless*;
- nada é persistido, logado ou repassado a terceiros;
- o único destino é o provedor que você escolheu.
