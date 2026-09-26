# Cecchin Instagram Bridge

Extensão Chromium local que conecta a central de marketing ao Instagram Web aberto no mesmo perfil do Brave ou Chrome. A extensão não realiza login nem recebe ou armazena sua senha ou cookies. Ela depende da sessão já autenticada em uma aba do Instagram.

## Instalar ou atualizar

1. Abra `brave://extensions` ou `chrome://extensions` e habilite o **Modo do desenvolvedor**.
2. Se a extensão ainda não estiver instalada, escolha **Carregar sem compactação** e selecione esta pasta (`browser-extension/instagram-bridge`). Se já estiver instalada, use **Recarregar** no card da Cecchin Instagram Bridge.
3. Depois de recarregar a extensão, atualize a página da central em `http://localhost:3000/operacional/marketing` para que o content script seja injetado novamente.
4. Mantenha uma aba concluída e autenticada em `https://www.instagram.com/` aberta no mesmo perfil do navegador. A extensão usa a aba do Instagram ativa; se não houver uma ativa, usa a acessada mais recentemente.

## Recursos e comportamento

A central pode consultar o feed e a bandeja de Stories, carregar páginas adicionais do feed e de perfis, exibir informações e fotos de perfil e buscar comentários. A interface da central controla a navegação entre itens de Stories e pode fechar a visualização com `Esc`; esses controles pertencem à central, não à extensão.

As ações suportadas incluem curtir ou descurtir publicações, curtir Stories, enviar reações ou respostas a Stories e comentar ou responder a comentários. A curtida de publicação é acionada no conteúdo correspondente dentro da aba do Instagram: a publicação precisa estar carregada no feed dessa aba. Se não estiver, a ação falha e a extensão não abre outra aba nem navega automaticamente até a publicação. As demais ações são enviadas pela sessão da aba escolhida e podem falhar se a sessão expirar, se o Instagram limitar as consultas ou alterar seus endpoints.

A extensão não publica fotos, vídeos, Reels ou Stories, não agenda publicações, não envia mensagens diretas comuns e não segue contas. A confirmação de um item na agenda da central também não publica no Instagram.

## Permissões e privacidade

O `manifest.json` solicita a permissão `scripting` e acesso a `https://www.instagram.com/*` e `http://localhost:3000/*`. O content script só é injetado em `http://localhost:3000/operacional/marketing*`; ele verifica a origem local e só encaminha mensagens desse canal à extensão. O service worker valida novamente a origem e escolhe uma aba do Instagram já aberta. Não há permissão de leitura de cookies nem host permission para outros domínios.

As consultas são executadas no contexto principal da aba existente do Instagram. Dados normalizados retornam à central local; não são enviados a um serviço intermediário desta extensão.

## Limitações

A implementação usa endpoints internos da versão web do Instagram, que não são documentados nem garantidos pela Meta. Mudanças no site, expiração de sessão, erros HTTP e limites de frequência podem interromper consultas e ações. Aguarde se receber uma limitação de frequência; se a sessão tiver expirado, entre normalmente no Instagram e atualize a central.

Este mecanismo não é a API Graph oficial. A integração OAuth e a publicação por API oficial são um fluxo separado, descrito em [Instagram na central de marketing](../../INSTAGRAM_INTEGRACAO.md).

## Referência de implementação

O código é uma implementação própria inspirada em formatos públicos descritos por [SpeedGram: Instagram web (Polaris) API surface](https://github.com/aryasarukkai/instagram-fast-react-client/blob/main/speedgram/docs/web-api-surface.md). Código GPL do SpeedGram não foi copiado.

Para suportar outra origem, revise as permissões e `matches` em `manifest.json` e as validações de origem em `content.js` e `service-worker.js`. Mantenha cada origem explicitamente permitida.
