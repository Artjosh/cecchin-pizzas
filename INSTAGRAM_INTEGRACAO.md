# Instagram na central de marketing

Atualizado em 25/09/2026. Este documento separa a ponte local do navegador da API oficial da Meta. A palavra "Instagram" na UI nao significa que todas as funcoes usam a API oficial.

## Arquitetura

`/operacional/marketing` oferece dois fluxos:

1. **Sessao do Instagram ja aberta no Brave/Chrome:** `browser-extension/instagram-bridge` consulta a aba `www.instagram.com` usando endpoints web internos do Instagram e passa dados normalizados para a central. Nao copia cookies nem pede a senha dentro do Cecchin. Essa ponte nao e a Instagram Graph API nem a API oficial de Login.
2. **Conta profissional da Cecchin para publicar:** o backend usa OAuth server-side do Instagram Login, token cifrado, Storage privado, fila e worker. Esse fluxo oficial e independente da extensao.

A ponte so funciona quando a extensao esta instalada e atualizada no mesmo perfil do navegador, e existe uma aba autenticada do Instagram. Alteracoes em `service-worker.js` exigem clicar em **Recarregar** na pagina de extensoes do Brave/Chrome e depois atualizar a pagina de marketing.

## Funcionalidades da ponte

O codigo da extensao e da central implementa:

- Feed de contas seguidas, normalizado a partir da timeline.
- Stories recentes e visualizador com navegacao pelos itens retornados, controles anterior/proximo e tecla `Esc` para fechar.
- Perfil dentro da central e grade de publicacoes do perfil.
- Modal para ler comentarios e formulario para publicar comentario.
- Curtir e remover curtida de uma publicacao.
- Carregamento da proxima pagina ao rolar ate o fim do feed, usando cursor `next_max_id` e IDs ja exibidos.
- Remocao de itens sem imagem/video e preenchimento de avatares a partir do usuario da publicacao ou de uma consulta complementar em serie com cache.

Essas acoes usam endpoints web internos e nao documentados, tais como `feed/timeline`, `feed/reels_tray`, `feed/reels_media`, `feed/user/{id}`, `media/{id}/comments`, `media/{id}/like`, `media/{id}/unlike` e `media/{id}/comment`. Eles podem mudar sem aviso e nao sao garantidos pela Meta. Curtidas e comentarios sao escritas reais na conta quando acionadas pela UI; nao clicar em controles de envio durante uma validacao visual.

## Validacao observada no navegador

- A central autenticada carregou timeline e bandeja de Stories no Brave.
- O visualizador abriu dois itens retornados para um Story; o controle **Proximo** avancou ao segundo, e `Esc` fechou a modal.
- Uma tentativa de perfil falhou com HTTP 429. O worker anterior fazia ate dez consultas complementares de avatar em paralelo por atualizacao; isso e um candidato a rajada desnecessaria de requisicoes. O codigo foi alterado para usar cache e ate quatro consultas sequenciais por pagina, mas a causa do 429 ainda precisa ser comprovada apos recarregar a extensao.
- Houve cartoes sem midia na timeline antes da correcao do filtro. A filtragem foi alterada, mas a ausencia dos cartoes vazios ainda precisa ser verificada com a extensao recarregada.
- A paginacao por scroll foi implementada no codigo, mas o carregamento da pagina seguinte ainda nao foi confirmado no navegador.
- A modal de comentarios foi exibida anteriormente, mas a instancia antiga da extensao respondeu "Acao da extensao desconhecida". Leitura de comentarios, envio de comentario, curtida, perfil e publicacoes do perfil continuam sem validacao ponta a ponta nesta versao.
- A curtida nao foi enviada durante os testes. Nenhum comentario foi publicado.

**Proxima verificacao:** recarregar a extensao atualizada, atualizar Instagram na central, conferir avatares e ausencia de cartoes vazios, rolar para carregar mais e abrir um perfil e comentarios. Nao enviar comentario nem curtir uma publicacao real como parte do teste. Registrar um resultado 429 como erro da chamada e verificar qual endpoint o causou; nao declarar bloqueio da conta sem evidencias do proprio Instagram.

## Configuracao da API oficial para publicacao

Configurar no runtime do frontend/BFF e no worker, sem expor valores ao navegador:

- `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` do app Meta.
- `INSTAGRAM_REDIRECT_URI`, callback HTTPS cadastrado exatamente.
- `INSTAGRAM_TOKEN_ENCRYPTION_KEY`, 32 bytes aleatorios em 64 caracteres hexadecimais, igual no BFF e worker.
- `INSTAGRAM_GRAPH_API_VERSION`, versao suportada no momento do deploy.
- `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (ou a compatibilidade `SUPABASE_SERVICE_ROLE_KEY`) no worker, para criar URL temporaria do objeto privado.

O app Meta precisa do produto/permissoes de Instagram Login e do nivel de acesso aprovado para a conta pretendida. O callback solicita `instagram_business_basic` e `instagram_business_content_publish`; os escopos registrados nao provam que a Meta concedeu acesso. O OAuth e a publicacao real nao foram testados nesta entrega.

O composer oficial aceita uma imagem JPEG/PNG/WebP por publicacao no feed. Reels, carrossel e publicacao de Story ainda nao estao habilitados nesta UI. A fila registra `rascunho`, `agendado`, `preparando`, `publicando`, `publicado` e `falhou`, com idempotencia e reconciliacao. Isso nao prova que o worker/container em execucao recebeu esta versao. As migrations `20260925125` e `20260925126` foram registradas como aplicadas apenas no Supabase local; nenhum ambiente remoto foi confirmado.

## Seguranca e limites

- A extensao declara `scripting` e host permissions para `www.instagram.com` e `http://localhost:3000`. O content script roda apenas na pagina local de marketing.
- Nao ha permissao de cookies; a extensao executa `fetch` dentro da aba oficial, autenticada pelo proprio navegador. A senha nao e lida nem enviada ao Cecchin.
- A ponte entrega dados da conta autenticada e pode realizar curtida/comentario quando o usuario aciona esses botoes. Mantenha validacao de origem e limite cada origem explicitamente.
- Feed, perfis, Stories, comentarios e curtidas pela ponte nao sao API oficial, nem uma incorporacao do app Instagram. O Instagram pode rejeitar chamadas, limitar frequencia, mudar esquemas ou remover endpoints.
- A ponte nao consulta DM, nao envia mensagens, nao segue contas e nao publica midia.
- A API oficial/worker ainda depende de credenciais, aprovacao da Meta, callback HTTPS e secrets de runtime. Nao registrar tokens, cookies, nomes ou payloads de sessoes reais em documentacao versionada.

## Referencias

- [Colecao oficial Meta: Instagram API with Instagram Login](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login)
- [Documentacao oficial da Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7)
- [Implementacao da ponte local](browser-extension/instagram-bridge/README.md)

Antes de liberar publicacao em producao, revisar acesso/termos atuais da Meta e provar OAuth, leitura e publicacao de teste autorizada pela pessoa responsavel pela conta.
