# Cecchin Instagram Bridge

Extensao Chromium local da central de marketing. Ela usa a sessao ja aberta do Instagram no mesmo perfil do Brave/Chrome; nao faz login e nao recebe a senha.

## Instalar ou atualizar

1. Abra `brave://extensions` (ou `chrome://extensions`), habilite o modo do desenvolvedor e use **Carregar sem compactacao** para instalar esta pasta, se ainda nao estiver instalada.
2. Para aplicar alteracoes posteriores em `service-worker.js`, clique em **Recarregar** no card desta extensao.
3. Recarregue `http://localhost:3000/operacional/marketing` e use **Atualizar Instagram**.
4. Mantenha uma aba autenticada em `https://www.instagram.com/` aberta no mesmo perfil do navegador.

## O que faz

- Le feed e bandeja de Stories pela sessao web ja autenticada.
- Busca perfis, publicacoes, comentarios e mais paginas da timeline e dos perfis quando solicitado pela central.
- A interface oferece navegacao entre itens de Story e fecha a modal com `Esc`.
- Curtidas de publicacoes usam a aba existente do Instagram quando a publicacao esta carregada nela. Curtidas de Stories, reacoes, respostas a Stories e comentarios sao acoes reais da conta. A extensao nao abre outra aba para executar essas acoes.

As consultas e acoes sao executadas dentro da aba do Instagram. A extensao nao copia nem armazena cookies. A ponte entrega a pagina local dados normalizados de perfil, feed, Stories e comentarios.

## Permissoes e limites

A extensao pede `scripting` e acesso a `https://www.instagram.com/*` e `http://localhost:3000/*`. O content script e limitado a `/operacional/marketing`; a mensagem valida a origem local antes de consultar a aba do Instagram. Nao ha permissao de cookies.

A implementacao usa endpoints web internos nao documentados do Instagram. Eles podem mudar, retornar erros HTTP ou limitar frequencia. Isso nao e a API Graph oficial e nao e garantido pela Meta. A extensao nao envia DMs, nao segue contas e nao publica midia.

A conexao OAuth da conta profissional da Cecchin e a publicacao via API oficial sao outro fluxo. Consulte [Instagram na central de marketing](../../INSTAGRAM_INTEGRACAO.md).

## Referencia de formato

O codigo e uma implementacao propria inspirada em formatos publicos descritos por [SpeedGram: Instagram web (Polaris) API surface](https://github.com/aryasarukkai/instagram-fast-react-client/blob/main/speedgram/docs/web-api-surface.md). O codigo GPL do SpeedGram nao foi copiado.

Para outra origem, revise `matches`, `host_permissions` e as validacoes em `content.js` e `service-worker.js`; mantenha cada origem explicita.
