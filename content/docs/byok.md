# BYOK client-side (Bring Your Own Key)

A regra do projeto: **a chave de API nunca é gravada em banco de dados**. Não existe backend de contas. O estado de autenticação mora no navegador, gerenciado por Zustand Persist.

## A chave é guardada em texto puro. E isso é uma decisão, não descuido.

`localStorage` recebe a chave exatamente como você a digitou. Não há ofuscação, não há "criptografia".

**Por quê?**

1. **Não existe criptografia real aqui.** Se o navegador consegue descriptografar a chave sem pedir senha, então a chave da fechadura está ao lado da fechadura. Qualquer ofuscação seria teatro — e teatro custa caro: uma transformação irreversível grava silenciosamente uma chave que nunca poderá ser lida de volta (esse bug aconteceu, e o sintoma era "o provedor rejeitou minha chave").
2. **É BYOK.** A chave é sua, foi criada por você, e a responsabilidade sobre ela é sua. Este projeto não opera servidor de contas; a chave só sai da sua máquina para o provedor que você escolheu.
3. **Simplicidade é auditável.** Você abre o DevTools e vê exatamente o que está salvo. Sem camadas escondidas.

### O que o projeto efetivamente garante

| Garantia | Como |
| :--- | :--- |
| Sem banco, sem conta, sem cópia server-side | não existe backend de autenticação |
| Sem telemetria | nenhuma requisição nossa carrega a chave para outro destino |
| A chave só é lida na hora da chamada | `getKey()` no momento do envio |
| Remoção imediata | `/provedores` → **Esquecer** apaga do dispositivo |
| A UI nunca mostra a chave inteira | `maskKey()` exibe `sk-…9f2a` |

Se você precisa de mais: use uma chave **escopada e rotativa**, e limpe ao fim da sessão.

## Onde a chave vive

```
┌──────────────────────────────────────────────────────────┐
│  Memória (sessão)  →  chave em texto puro                 │
│  localStorage      →  chave em texto puro (BYOK)          │
│  Servidor / banco  →  nada. Zero.                         │
└──────────────────────────────────────────────────────────┘
```

```ts
keys: Partial<Record<ProviderId, string>>;   // aprovado pelo usuário
getKey: (provider) => get().keys[provider] ?? "";
```

## Por que `skipHydration`

Renderizar no servidor um valor que vem do `localStorage` produz erro de hidratação. Por isso:

```ts
persist(..., {
  name: "mrcp-byok-settings-v2",
  storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage() : window.localStorage)),
  skipHydration: true,
})
```

O terminal chama `useSettings.persist.rehydrate()` dentro de um `useEffect`, ou seja, **depois** da hidratação. Até lá, a UI mostra "sem modelo" em vez de adivinhar.

## O que é persistido

| Campo | Conteúdo |
| :--- | :--- |
| `provider` | provedor ativo |
| `keys` | chaves por provedor (BYOK, texto puro) |
| `baseUrls` | URLs customizadas |
| `models` | modelo escolhido por provedor |
| `transport` | `direct` ou `proxy` |

Nada além disso. O histórico da conversa e os resultados de análise são efêmeros (`terminalStore` não usa `persist`).
