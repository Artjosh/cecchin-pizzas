# Instagram na central de marketing

## Estado atual

`/operacional/marketing` tem agenda, pedidos, biblioteca, responsáveis e uma prévia visual fictícia. O upload fica no Storage privado. O botão “Marcar publicado” apenas registra uma ação humana no banco; não envia conteúdo ao Instagram. Não há contas próprias conectadas. A interface deve continuar identificando claramente essa prévia até a integração real estar ativa.

## Integração escolhida

Usar a **Instagram API oficial com Instagram Login**, sem automação do navegador ou cópia de um cliente Instagram de terceiros. Ela permite conectar contas profissionais, ler mídias da conta autorizada e publicar conteúdo mediante permissões. A [coleção oficial da Meta](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login) descreve esse modo e a permissão `instagram_business_content_publish`. O [exemplo oficial de Reels](https://github.com/fbsamples/reels_publishing_apis) serve para estudar o ciclo de contêiner, status e publicação; usa um fluxo de Facebook Login mais antigo e não deve ser copiado diretamente como arquitetura da aplicação. Confirmar na documentação Meta vigente a cobertura de Stories por tipo de conta antes de habilitar o botão; no modo Facebook Login, a [documentação oficial](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7) restringe Stories a contas Business.

## Experiência

- Uma barra compacta no topo seleciona a conta conectada e mostra estado da conexão. “Conectar conta” inicia OAuth; não se digita senha do Instagram no Cecchin Pizzas.
- Metade esquerda no desktop mostra perfil, stories ativos quando a API da conta permitir, Reels e feed reais. Um clique abre a mídia e seus dados; prévias de rascunho são visualmente distintas. No celular, a mesma região ocupa a tela e há uma aba para alternar com a gestão.
- Metade direita tem abas `Calendário`, `Criar`, `Biblioteca` e `Resultados`. O compositor escolhe conta, Feed/Carrossel/Reel/Story, mídia, legenda, miniatura e horário. Mostra proporções, duração e erros antes de agendar. A ação “Publicar agora” fica separada da ação “Agendar”.
- Cada card informa `rascunho`, `agendado`, `preparando`, `publicando`, `publicado` ou `falhou`, com motivo, tentativa e permalink quando houver. Publicação manual externa tem estado e rótulo próprios, sem se passar por publicação via API.

## Fluxo técnico

1. **Conta e autorização:** criar tabela `instagram_conta` por organização e conta profissional, com identificador Meta único, usuário, tipo, permissões, expiração, estado e último erro. Segredo e tokens ficam criptografados no servidor, nunca em RSC ou JSON do navegador. OAuth usa `state` de curta duração ligado à sessão e callback HTTPS. Permitir múltiplas contas e desconexão.
2. **Conteúdo:** manter `agenda_marketing` para tarefas internas. Criar entidade de publicação ligada à conta, responsável e mídia, com tipo, legenda, agendamento, status remoto, id de contêiner, id de mídia publicado, permalink, erro e chave idempotente. Não reutilizar `situacao='publicado'` da agenda como prova de entrega à Meta.
3. **Mídia:** arquivos da biblioteca seguem privados para usuários, mas o publicador gera uma URL HTTPS temporária acessível à Meta pelo tempo exigido para processamento. Validar MIME, dimensão, duração e tamanho por formato. Não expor o bucket inteiro. Preparar/transcodificar apenas quando necessário.
4. **Publicador:** usar o worker existente para buscar publicações vencidas com trava transacional. Criar contêiner, acompanhar processamento, chamar `media_publish`, consultar o objeto publicado e salvar permalink. Tratar expiração de token, limites, erros permanentes e transitórios, repetição segura e cancelamento antes da publicação. Reconciliar jobs após reinício.
5. **Leitura:** sincronizar perfil, mídias e métricas da própria conta conectada pela API, com paginação e cache no banco. Stories só aparecem quando o escopo/endpoint e a conta permitirem. O preview de um agendamento usa a própria mídia armazenada; conteúdo remoto não é inventado.
6. **Permissões:** gestão/admin conecta contas e configura publicação; equipe de marketing autorizada cria e programa conteúdo. Escopos mínimos; auditoria registra quem aprovou, agendou, publicou, reconectou ou desconectou.

## Sequência para entrega real

Primeiro configurar aplicativo Meta, produto Instagram, URL HTTPS de callback, contas profissionais de teste e permissões. Depois migrar banco e implementar OAuth/múltiplas contas. Em seguida trazer feed real; depois publicar uma foto com reconciliação; então carrossel, Reel e Story conforme capacidades concedidas; por fim agendamento automático, métricas e alertas de falha. Cada etapa deve ser conferida visualmente em desktop e celular e com ao menos uma conta real autorizada. Até a prova de publicação e leitura reais, a central continua sendo agenda interna e prévia, não um Instagram conectado.
