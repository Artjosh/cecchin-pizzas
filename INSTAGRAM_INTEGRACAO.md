# Integração oficial do Instagram

## Estado desta entrega

`/operacional/marketing` inclui uma central de conta própria, alimentada pela Instagram API oficial com Instagram Login. O escopo implementado é conexão OAuth server-side, leitura do perfil/feed da conta autorizada, tentativa de leitura de Stories quando o endpoint permitir, upload de uma imagem para a biblioteca privada e criação/agendamento de publicação de imagem no feed. A fila separa `agendado`, `preparando`, `publicando`, `publicado` e `falhou`; só marca como publicada depois de confirmação/reconciliação remota.

O banco local recebeu as migrations `20260925125_125_instagram_marketing.sql` e `20260925126_126_instagram_serializar_publicador.sql`. Elas criam contas, publicações, auditoria e RPCs; RLS está habilitado e o cliente não recebe acesso direto às tabelas/token. A migration canônica correspondente está em `../cecchin-pizzas-backend/migracao/sql/103_instagram_marketing.sql` e `104_instagram_serializar_publicador.sql`.

A UI foi aberta em `http://localhost:3000/operacional/marketing` em desktop e viewport móvel. Como não há credenciais, mostrou “Configuração do servidor pendente”; nenhum OAuth, leitura de conta real ou post foi executado. Os containers locais do worker ainda usam uma imagem anterior a esta implementação. Portanto o código e schema locais não significam integração ativa ou pronta para produção.

## Configuração necessária

Configurar no runtime do frontend/BFF e no worker, sem expor valores ao navegador:

- `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET` do app Meta;
- `INSTAGRAM_REDIRECT_URI`, URL HTTPS cadastrada exatamente como callback (exceto localhost de desenvolvimento);
- `INSTAGRAM_TOKEN_ENCRYPTION_KEY`, 32 bytes aleatórios codificados como 64 caracteres hexadecimais, igual no BFF e worker;
- `INSTAGRAM_GRAPH_API_VERSION`, versão Graph suportada e ainda vigente;
- no worker, `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (ou compatibilidade `SUPABASE_SERVICE_ROLE_KEY`) para gerar URLs assinadas de curta duração do bucket privado.

O app Meta precisa do produto/permissões de Instagram Login, conta profissional de teste e acesso de revisão apropriado para o uso pretendido. O callback solicita `instagram_business_basic` e `instagram_business_content_publish`; a coluna `scopes` registra escopos solicitados e **não prova** Advanced Access nem permissão efetiva. Erros reais da Meta são apresentados na conexão/publicação. O limite de 25 publicações API por janela móvel de 24 horas é verificado na criação e imediatamente antes do envio, serializando publicador por conta entre containers.

## Segurança e fluxo

- Login OAuth é iniciado apenas por gestão/admin; usa `state` aleatório em cookie HttpOnly/SameSite com vida curta e callback verificado.
- Access token é cifrado com AES-256-GCM antes de persistir. BFF/worker decifram somente em memória. Não registrar tokens nos logs ou respostas.
- A conta pode ser desconectada por gestão; token cifrado é apagado e publicações pendentes são encerradas.
- O bucket `marketing-conteudos` permanece privado. O worker cria URL assinada temporária só para o objeto da organização e a envia à Meta para processamento.
- A fila tem chave idempotente, reserva por publicação, bloqueio distribuído por conta e reconciliação após resultado ambíguo. Se a reconciliação não encontra exatamente um post compatível, a publicação falha para revisão; não é repetida automaticamente.

## Limites conhecidos

- A UI envia somente uma imagem JPEG/PNG/WebP no feed. Reels, carrossel e Stories não estão habilitados. A leitura de Stories depende de endpoint, tipo da conta e concessão real da Meta; Stories de concorrentes não são oferecidos.
- Insights, comentários, mensagens, monitoramento de seguidores/concorrentes e sincronização paginada em banco não fazem parte desta entrega.
- A API oficial não é uma reprodução completa do aplicativo Instagram; não há iframe da página inteira.
- A correção do bot de veículos foi feita no código backend mas o worker container ativo é antigo. A integração Instagram também não executará até reconstruir e reiniciar/deployar os serviços com as novas variáveis.
- Não rodamos typecheck/linter, conforme preferência registrada no workspace. Nenhuma conta ou publicação real foi acessada.

## Referências oficiais

- [Instagram API with Instagram Login — coleção oficial Meta](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login)
- [Instagram API — documentação Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7)
- [Exemplo oficial Meta de publicação de Reels](https://github.com/fbsamples/reels_publishing_apis) (referência de ciclo assíncrono; não é a arquitetura de login adotada aqui).

Antes de liberar produção, concluir revisão de permissões/termos da Meta e provar conexão, leitura e publicação de teste aprovada por responsável da conta.
