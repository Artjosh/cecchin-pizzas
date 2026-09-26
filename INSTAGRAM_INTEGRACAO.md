 Instagram na central de marketing

Pesquisa sobre sessões headless e múltiplas contas: [proposta de transferência pela extensão](../cecchin-pizzas-backend/infra/INSTAGRAM_SESSOES_SERVIDOR.md). A proposta de importar a sessão para um serviço no servidor continua não implementada e não validada com sessões reais; a extensão local continua sendo o fluxo da central para a sessão web já aberta.

Atualizado em 26/09/2026. Este documento descreve separadamente a ponte local baseada na sessão web do navegador e a integração de publicação pela API oficial da Meta. A presença do Instagram na interface não significa que toda ação use a API oficial.

**Estado do app Meta e credenciais:** registro de 26/09/2026: durante a conferência do painel Meta Developers para esta integração, não havia app criado e o MCP Meta não havia concluído autenticação/autorização. O repositório contém o fluxo OAuth, mas esse registro não comprova o estado atual do painel. Nenhum teste OAuth ou publicação real pela API oficial foi confirmado. Antes de usar, confira no painel Meta se o app existe e está configurado, e configure os secrets no runtime apropriado. Não há credenciais versionadas no projeto.

## Arquitetura

`/operacional/marketing` oferece dois fluxos independentes:

1. **Sessão web já aberta no Brave/Chrome:** `browser-extension/instagram-bridge` consulta e executa ações na aba autenticada do Instagram usando endpoints web internos. A extensão normaliza os dados para a central. Não copia cookies e não pede a senha dentro do Cecchin. Essa ponte não é a Instagram Graph API nem o fluxo oficial Instagram Login.
2. **Conta profissional conectada pela API oficial:** rotas server-side fazem OAuth do Instagram Login, cifram o token para persistência e consultam a conta pela Graph API. O composer oficial cria publicações de imagem no feed e as encaminha à fila do worker do backend. Esse fluxo não depende da extensão.

A ponte local requer a extensão instalada/atualizada no mesmo perfil de navegador e uma aba autenticada em `www.instagram.com`. Alterações em `browser-extension/instagram-bridge/service-worker.js` requerem **Recarregar** no card da extensão e depois atualizar a página de marketing.

## Funcionalidades da ponte local

- Timeline com paginação por cursor, fotos de perfil, vídeos e Stories com progresso sincronizado à duração da mídia.
- Perfis com dados e contagens retornados pelo Instagram; a interface carrega publicações iniciais ao abrir o perfil e pode buscar outras ao rolar ou solicitar mais.
- Comentários, envio de comentários e resposta vinculada a um comentário.
- Curtidas e descurtidas de Stories, respostas de texto e reações emoji.
- Curtidas de publicações por meio da aba existente do Instagram quando a publicação está carregada nela. A ponte não abre uma nova aba para executar a curtida.

As interações são ações reais da conta autenticada. A ponte depende de endpoints web internos não documentados: o Instagram pode alterar o formato, limitar chamadas ou rejeitá-las. A extensão não copia nem armazena cookies.

## Validações observadas

Os itens abaixo são observações de sessões anteriores, não uma garantia de funcionamento atual em todas as contas:

- A central carregou timeline e bandeja de Stories no Brave. Foram conferidos o campo de resposta, controle de curtida, seis reações e a indicação de usuário ao responder comentário.
- Uma curtida de publicação foi confirmada pela interface oficial em uma rodada anterior e desfeita em seguida.
- O erro HTTP 404 das rotas móveis de curtida e resposta de Story foi corrigido usando mutações GraphQL da sessão web. Curtir/descurtir Story e enviar uma reação emoji foram confirmados pela central; a curtida de teste foi desfeita.
- Após falhas nas fotos do feed, a ponte passou a tentar a URL renovada pela consulta de perfil; três avatares visíveis foram conferidos carregados.
- Algumas respostas GraphQL podem conter `data` com publicações e também `errors` em campos secundários. A ponte foi ajustada para preservar lista e cursor quando a lista é válida. A pessoa usuária confirmou depois que o perfil voltou a carregar vários posts. Isso não mede desempenho nem valida todas as contas e cursores.
- Resposta de Story em texto e resposta enviada a comentário não foram exercitadas com uma mensagem real nas validações registradas.

Instruções de instalação e permissões da extensão: [README da Instagram Bridge](browser-extension/instagram-bridge/README.md).

## Agenda interna e publicação automatizada são coisas distintas

A agenda em “Equipe de marketing” organiza compromissos internos. Na interface atual, **“Postagem automatizada”** chama a ação `confirmar`, que apenas muda o estado do compromisso na agenda para `confirmado`; não cria uma publicação na fila oficial, não agenda no Instagram e não publica mídia. O rótulo do botão promete mais do que a ação faz.

**“Registar como manual”** chama a ação `publicar` da agenda e marca o item como `publicado`/registrado manualmente. Essa ação também não publica no Instagram; o texto de ajuda informa que ela só registra na agenda. Use-a para indicar que a postagem foi feita fora do sistema.

O agendamento e publicação reais da API oficial estão numa fila separada, no composer da aba Instagram: uma imagem para o feed pode ser publicada agora ou agendada. O worker do backend processa a fila e confirma a publicação pela Meta. Vídeo/Reels, carrossel e publicação de Story ainda não são oferecidos por esse composer. O estado “Postagem automatizada” na agenda não aciona esse fluxo.

## API oficial: implementação e configuração

O código atual tem OAuth server-side, consulta da conta/feed e fila de publicação. A criação de uma publicação e seu processamento exigem app, permissões, credenciais de runtime, banco/migrations e worker compatíveis. A existência do código não prova que os serviços em execução estejam configurados, atualizados ou que a Meta tenha autorizado a conta.

Configurar sem expor valores ao navegador:

- `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` do app Meta.
- `INSTAGRAM_REDIRECT_URI`, callback HTTPS cadastrado exatamente no app (localhost é permitido no desenvolvimento).
- `INSTAGRAM_TOKEN_ENCRYPTION_KEY`, 32 bytes aleatórios representados por 64 caracteres hexadecimais; a mesma chave deve estar no frontend/BFF e worker.
- `INSTAGRAM_GRAPH_API_VERSION`, versão suportada escolhida para o deploy.
- `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (ou a compatibilidade `SUPABASE_SERVICE_ROLE_KEY`) no worker para gerar URL temporária da mídia privada.

O OAuth solicita `instagram_business_basic` e `instagram_business_content_publish`. Configurar esses escopos no código não comprova aprovação ou concessão de acesso pela Meta. É necessário concluir OAuth com uma conta profissional autorizada e verificar as permissões efetivamente concedidas.

O composer oficial aceita uma imagem JPEG, PNG ou WebP por publicação de feed. O worker cria e processa o container da mídia e chama a publicação pela Graph API. Os estados incluem `rascunho`, `agendado`, `preparando`, `publicando`, `publicado` e `falhou`; há lógica de idempotência e reconciliação no worker. Reels, carrossel e Stories não estão habilitados neste composer.

Registro de 26/09/2026: as migrations `20260925125` e `20260925126` haviam sido aplicadas no Supabase local; não foi confirmado ambiente remoto. Também não foi confirmado que os containers em execução incluam a versão do publicador. Consulte o estado de deploy no [README de infraestrutura do backend](../cecchin-pizzas-backend/infra/README.md) antes de considerar a publicação operacional.

## Segurança e limites

- A extensão declara `scripting` e acesso a `www.instagram.com` e `localhost:3000`; o content script roda somente na página local de marketing. Não há permissão de cookies.
- A consulta à aba autenticada é feita pelo navegador do usuário. A senha não é lida nem enviada ao Cecchin.
- A ponte local pode ler conteúdo da conta autenticada e executar curtidas, respostas e comentários solicitados na interface. Restrinja origens e ações conforme a validação implementada.
- Feed, perfis, Stories, curtidas e comentários da ponte local não são API oficial nem incorporação do app Instagram; chamadas internas podem mudar ou ser bloqueadas.
- A ponte não lê nem envia DMs, não segue contas e não publica mídia.
- OAuth/publicação oficial ainda requer validação das credenciais, permissões, callback, banco e worker no ambiente-alvo. Nunca registrar tokens, cookies ou payloads de sessões reais em documentação versionada.

## Referências

- [Coleção oficial Meta: Instagram API with Instagram Login](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login)
- [Documentação oficial da Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7)
- [Implementação da ponte local](browser-extension/instagram-bridge/README.md)
- [Pesquisa sobre sessões no servidor](../cecchin-pizzas-backend/infra/INSTAGRAM_SESSOES_SERVIDOR.md)

Antes de liberar publicação em produção, conferir as regras atuais da Meta e validar OAuth, leitura e uma publicação de teste autorizada pela pessoa responsável pela conta.
