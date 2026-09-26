# Instagram na central de marketing

Pesquisa de evolução: [transferência pela extensão, sessões headless e múltiplas contas](../cecchin-pizzas-backend/infra/INSTAGRAM_SESSOES_SERVIDOR.md). A importação pela extensão é o fluxo principal do MVP; contas são compartilhadas conforme permissões do marketing, com troca por contexto e noVNC apenas para recuperação excepcional. Proposta ainda não implementada nem validada com sessões reais no servidor.

Atualizado em 25/09/2026. Este documento separa a ponte local do navegador da API oficial da Meta. A palavra "Instagram" na UI nao significa que todas as funcoes usam a API oficial.

## Arquitetura

`/operacional/marketing` oferece dois fluxos:

1. **Sessao do Instagram ja aberta no Brave/Chrome:** `browser-extension/instagram-bridge` consulta a aba `www.instagram.com` usando endpoints web internos do Instagram e passa dados normalizados para a central. Nao copia cookies nem pede a senha dentro do Cecchin. Essa ponte nao e a Instagram Graph API nem a API oficial de Login.
2. **Conta profissional da Cecchin para publicar:** o backend usa OAuth server-side do Instagram Login, token cifrado, Storage privado, fila e worker. Esse fluxo oficial e independente da extensao.

A ponte so funciona quando a extensao esta instalada e atualizada no mesmo perfil do navegador, e existe uma aba autenticada do Instagram. Alteracoes em `service-worker.js` exigem clicar em **Recarregar** na pagina de extensoes do Brave/Chrome e depois atualizar a pagina de marketing.

## Funcionalidades da ponte

- Timeline com paginacao por cursor, avatares, videos e Stories com progresso pelo tempo da midia.
- Perfis com dados e contagens quando o Instagram os fornece, primeira pagina de posts ao abrir e paginas seguintes ao rolar ou tocar em "Carregar mais posts".
- Comentarios, publicacao de comentarios e resposta vinculada a um comentario.
- Curtir e descurtir Stories; responder por texto ou reacao emoji. Essas acoes usam a sessao na aba existente do Instagram.
- Curtir publicacoes pela aba existente quando a publicacao ja esta carregada no feed oficial dessa aba. A ponte nao abre uma nova aba.

A ponte usa endpoints web internos do Instagram, que podem mudar. Respostas e reacoes sao acoes reais da conta. A extensao nao copia nem armazena cookies.

## Validacao observada no navegador

- A central carregou a timeline e a bandeja de Stories no Brave.
- O visualizador mostrou o campo de resposta, o controle de curtida e seis reacoes; a modal de comentarios mostrou a selecao "Respondendo a @usuario".
- Uma curtida de publicacao ja foi confirmada pela interface oficial em uma rodada anterior, com desfazer em seguida.
- O 404 das rotas moveis de curtida e resposta a Story foi corrigido usando as mutacoes GraphQL da sessao web. Pela central, curtir e descurtir Story foram confirmados; a curtida de teste foi desfeita. Uma reacao emoji retornou "Resposta enviada.".
- As fotos quebradas do feed passaram a usar a URL renovada pela consulta de perfil; tres avatares visiveis foram conferidos carregados no navegador.
- A consulta GraphQL de posts pode devolver `data` com publicacoes e `errors` em campos secundarios. A ponte preserva os posts e o cursor quando a lista e valida; a correção aguarda validação após recarga da extensão.
- Resposta de Story em texto e envio de resposta a comentario ainda nao foram exercitados com mensagem real nesta rodada.

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
- A ponte entrega dados da conta autenticada e pode curtir ou publicar comentario quando o usuario aciona esses controles. Mantenha validacao de origem e limite cada origem explicitamente.
- Feed, perfis, Stories, curtidas e comentarios pela ponte nao sao API oficial, nem uma incorporacao do app Instagram. O Instagram pode rejeitar chamadas, limitar frequencia, mudar esquemas ou remover endpoints.
- A ponte nao consulta DM, nao envia mensagens, nao segue contas e nao publica midia.
- A API oficial/worker ainda depende de credenciais, aprovacao da Meta, callback HTTPS e secrets de runtime. Nao registrar tokens, cookies, nomes ou payloads de sessoes reais em documentacao versionada.

## Referencias

- [Colecao oficial Meta: Instagram API with Instagram Login](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login)
- [Documentacao oficial da Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7)
- [Implementacao da ponte local](browser-extension/instagram-bridge/README.md)

Antes de liberar publicacao em producao, revisar acesso/termos atuais da Meta e provar OAuth, leitura e publicacao de teste autorizada pela pessoa responsavel pela conta.
