# Cecchin Instagram Bridge

Extensão Chromium local que mostra na central de marketing o feed e a bandeja de Stories da sessão Instagram já aberta no mesmo perfil do Brave/Chrome.

## Ativar

1. Abra `brave://extensions` (ou `chrome://extensions`), confirme que quer adicionar a extensão local e habilite **Modo do desenvolvedor**.
2. Escolha **Carregar sem compactação** e selecione esta pasta.
3. Volte a `http://localhost:3000/operacional/marketing`, recarregue a aba para o Brave injetar o script da extensão e use **Atualizar Instagram**.
4. Se não houver sessão, abra Instagram.com, entre no site oficial normalmente e volte à central.

O login e qualquer verificação continuam no Instagram. A extensão não lê nem copia cookies: as chamadas autenticadas de leitura são executadas dentro da aba `www.instagram.com` já aberta. Para a página passam só perfil, feed e Stories normalizados.

O acesso está restrito ao Instagram e à página local de marketing em `localhost:3000`. A extensão faz leituras; ela não curte, segue, comenta, envia mensagens ou publica.

## Referência técnica

Implementação própria baseada nos formatos de leitura web descritos em [SpeedGram: Instagram web (Polaris) API surface](https://github.com/aryasarukkai/instagram-fast-react-client/blob/main/speedgram/docs/web-api-surface.md). O código GPL do SpeedGram não foi copiado. A API web pode mudar; respostas de expiração, bloqueio ou limitação aparecem na central sem repetição automática.

Para outra origem da aplicação, revise primeiro `matches`, `host_permissions` e as verificações de origem em `content.js`/`service-worker.js`; mantenha cada origem explícita.
