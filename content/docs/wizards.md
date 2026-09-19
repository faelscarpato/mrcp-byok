# Wizards in-feed

Um "Wizard" aqui é um componente React renderizado **dentro do fluxo do histórico**, não um modal. Ele nasce de um comando, ocupa seu lugar no *scrollback* e continua ali depois de usado — o histórico é o documento.

## `/provedores`

Renderiza um painel com quatro operações reais:

| Elemento | Ação |
| :--- | :--- |
| Seletor de provedor | OpenAI · Gemini · Claude · NVIDIA · customizado |
| Campo de API Key | salva no `localStorage` do seu navegador (ver [BYOK](/docs/byok)) |
| URL base customizada | override https validado pelo anti-SSRF |
| **Buscar modelos reais** | chama `/models` do provedor via `/api/proxy` |
| Lista retornada | clicar define o modelo ativo |
| Esquecer | apaga chave e salt do dispositivo |

Nada de lista fixa: os modelos vêm do provedor, com a chave que você forneceu. Se a chamada falhar, o componente diz que falhou — e só então mostra sugestões, rotuladas como sugestões.

## `/model`

Troca de modelo **sem reautenticar**: a chave já está no store, então basta escolher.

- `/model gpt-4o` → define direto;
- `/model` (sem argumento) → abre o Wizard com listagem real;
- campo manual para ids exatos (útil para modelos recentes que ainda não aparecem na listagem).

## Por que in-feed e não modal

Três razões práticas:

1. **Histórico auditável.** Você consegue rolar para cima e ver qual chave/provedor estava ativo em cada momento da sessão.
2. **Sem bloqueio de contexto.** Um modal cobre o feed; um bloco in-feed convive com ele.
3. **Mobile.** Modais em telas pequenas com teclado aberto são armadilhas. Blocos rolam normalmente.

## Anatomia do bloco

```tsx
case "wizard":
  return (
    <div className="my-2 rounded-lg border border-term-line bg-term-panel p-3">
      {block.wizard === "providers" ? <ProviderWizard /> : <ModelWizard />}
    </div>
  );
```

O Wizard é estado local do componente; só o resultado (chave, modelo, URL) é promovido ao store persistido. Se você recarregar a página, o painel volta vazio — mas sua configuração continua lá.
