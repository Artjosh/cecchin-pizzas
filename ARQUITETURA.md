# Arquitetura do frontend

Estado real em 12/09/2026. O que não está marcado como **existe** não existe.

## O que está ligado

| peça | estado |
|---|---|
| Autenticação sem senha (magic link + OTP) | **existe** — GoTrue, com polling cross-device |
| Sessão em cookie `httpOnly` | **existe** — o token nunca chega ao JavaScript |
| Proxy de sessão | **existe** — `proxy.ts` |
| Guarda de papel no servidor | **existe** — nos layouts, sobre RLS |
| Quatro papéis e a promoção entre eles | **existe** — decidido no Postgres |
| Mapa operacional | **existe** — MapLibre com base vetorial escura, rota e localização via BFF |
| Server Components + SSR | **existe** — páginas protegidas e route handlers dinâmicos |
| Leitura de dado de negócio | **existe** — agenda, catálogo, equipe, clientes, mapa, checklist, suporte, rastreio e localidades usam PostgREST sob RLS |
| Storage do Supabase | container de pé, **nenhum bucket** |
| Escala de equipe | **existe** — convite, aceite pelo painel ou WhatsApp, falta, avaliação e bloqueio progressivo ficam no Postgres |
| Notificações | **existe** — fila rastreável para e-mail e WhatsApp; a Central responde texto na janela de 24h e usa templates fora dela; o worker Nest entrega WhatsApp e pede e-mail à rota interna do BFF, que concentra o único cliente Brevo |
| NestJS | API e worker em contêineres separados: a API recebe webhook do WhatsApp; o worker faz limpeza, fila e retries, e pode ganhar réplicas sem duplicar notificações |

Os desenhos de referência continuam em `src/views/desenho/`. As telas ligadas
ao banco mostram explicitamente as lacunas de dado quando a fonte não tem a
informação necessária, em vez de completar com valores fictícios.

## Autenticação

### Como uma pessoa entra

```
  computador                     servidor                    celular
      |                             |                           |
      |-- e-mail ------------------>|                           |
      |<-- selector ----------------|--- GoTrue manda o e-mail ->|
      |                             |                           |
      |-- polling (selector) ------>|                           |
      |<-- pendente ----------------|                           |
      |                             |<-- hash de uso único -----|
      |-- polling (selector) ------>|                           |
      |<-- ENTROU (cookie) ---------|                           |
```

Duas portas: o **link** e o **código de seis dígitos**. O código resolve na
mesma aba; o link resolve em qualquer aparelho, e é por isso que existe o
`selector`.

### As peças, e por que cada uma existe

**`selector`** — identificador público do pedido, em `pedido_login`. Viaja a
cada ciclo de polling e **não aprova nada**: só pergunta. É o conceito que o
GoTrue não tem — ele emite um link e espera o clique voltar no mesmo navegador,
o que deixaria preso quem pede no computador e abre o e-mail no celular.

**O hash do GoTrue** — segredo de uso único, existe só para quem abriu o
e-mail. A página o envia ao BFF, que o valida **contra o GoTrue** e recebe a
sessão só no servidor. Validar uma assinatura localmente aceitaria hash já
revogado; devolver uma sessão ao browser voltaria a expor o token.

**A comparação de e-mail** — o e-mail que o GoTrue devolve é conferido com o do
pedido. Sem ela, um hash válido de outra conta aprovaria este.

**O fragmento da URL** — o GoTrue devolve `#token_hash=…`, e fragmento não vai
ao servidor. A página `/entrar/confirmar` lê esse hash, apaga o fragmento antes
de qualquer outra coisa e chama o BFF. Ela nunca recebe `access_token` ou
`refresh_token`.

**Uso único** — o pedido morre ao virar sessão. O polling seguinte recebe 404, e
é assim que a aba sabe parar em vez de girar até o timeout.

### Onde a sessão mora

Dois cookies `httpOnly`: `cecchin_acesso` (access token, 1h) e
`cecchin_renovacao` (refresh, 30 dias). **O corpo das respostas nunca traz
token.** Um XSS não encontra o que roubar, porque a sessão nunca esteve ao
alcance de script.

`sameSite: lax`, não `strict`: o retorno do magic link é navegação de topo
vinda do cliente de e-mail, e `strict` não mandaria o cookie nela.

Sair apaga os cookies **e** revoga no GoTrue — apagar só o cookie deixaria o
refresh válido por trinta dias.

### Login social

Google e Apple usam a mesma sessão httpOnly do OTP. O BFF inicia PKCE com
`state` anti-CSRF e guarda `state`, `code_verifier` e destino em cookies
httpOnly por dez minutos. O callback troca o código no GoTrue, grava os
cookies da sessão e volta ao destino seguro.

Os botões só aparecem quando `AUTH_GOOGLE_ENABLED` ou `AUTH_APPLE_ENABLED`
estiverem habilitados; a rota também recusa o provedor desligado. Os client IDs,
segredos e URLs de callback são configuração do Supabase/Google/Apple, nunca
do frontend. O Supabase vincula automaticamente identidades que retornem o
mesmo e-mail **verificado**, mantendo o perfil criado pelo gatilho de
`auth.users`.[^identidades]

[^identidades]: [Supabase Auth — Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

## Papéis

```
  cliente ──pede──> [fila] ──gestao ou admin aprova──> staff
                                                         │
                                          só admin ──────┴──> gestao, admin
```

| papel | alcança |
|---|---|
| `cliente` | contratar e acompanhar o próprio evento |
| `staff` | rota, checklist, forno, mapa, WhatsApp |
| `gestao` | despacho, catálogo, e decide a fila de pedidos |
| `admin` | tudo, inclusive promover a gestao e admin |

Toda conta nasce `cliente`. Não há tela de cadastro: o primeiro acesso com um
e-mail cria a conta, e um gatilho em `auth.users` cria o perfil — por isso o
mesmo mecanismo atende magic link, OTP, Google e Apple.

**O papel nunca vem do JWT.** Claim é retrato do instante da emissão: rebaixar
alguém só surtiria efeito quando o token vencesse. Lido do banco a cada
checagem, a revogação vale no próximo statement — verificado: promover por SQL
muda o acesso sem novo login.

## As três camadas de acesso

Cada uma cobre o que a de cima não cobre. Não são redundância.

| camada | onde | o que decide |
|---|---|---|
| proxy | `proxy.ts` | tem cookie? Redireciona para `/entrar` |
| guarda de papel | layouts, Server Component | pode ver esta área? |
| **RLS** | Postgres | **quais linhas existem para esta pessoa** |

O proxy não consulta o banco de propósito: roda em toda requisição, e um
papel lido de cookie seria um papel que o cliente escolhe.

As funções que mudam papel — `app.promover()`,
`app.decidir_solicitacao_staff()` — moram no Postgres e checam ali dentro. A
tela desabilita botões por conveniência; quem recusa é o banco, inclusive para
quem chamar o PostgREST direto.

### A armadilha que custou dois defeitos

**Policy permissiva se SOMA.** Duas vezes neste trabalho o código leu uma
tabela sem filtro, confiando na RLS para sobrar só a linha certa — e uma
segunda policy, mais ampla, deixava outras linhas visíveis:

1. `sessaoAtual()` lia `usuario?limit=1`. `usuario_leitura` libera a
   organização inteira, então a **sessão resolvia para outra pessoa**.
2. `/cliente/equipe` lia `solicitacao_staff?limit=1`. Um admin via o pedido de
   outra pessoa apresentado como se fosse o dele.

Nenhum dos dois aparecia em `tsc`, no build ou em status HTTP. Os dois
apareceram olhando a tela e conferindo o e-mail da sessão.

Regra que ficou: **filtre pelo dono, sempre**, mesmo com RLS ligada. E quando o
que se quer é "a minha linha", use a função que o Postgres resolve —
`meu_perfil()` deriva de `auth.uid()`, e não de algo que o cliente diz.

## Server e client

As páginas de `app/` são Server Components. A fronteira de cliente é declarada
onde precisa: `src/components/Provedores.tsx` segura o `AuthProvider`, que
recebe o usuário **como prop, vindo do servidor** — um Server Component não lê
contexto, e um componente de cliente não consulta banco.

`useAuth()` serve para desenhar: escrever um nome, esconder um link. Não
protege nada. O `RoleSwitcher`, que trocava de papel no estado do React, foi
substituído pelo `MenuDoUsuario`.

## Como o dado de negócio vai chegar

| o que | por onde | por quê |
|---|---|---|
| ler catálogo, agenda, evento | Server Component → **PostgREST** | leitura simples com RLS; intermediário só adiciona salto de rede |
| arquivo | **Storage**, direto | nenhum bucket criado ainda |
| enviar solicitação de reserva | route handler → **RPC no Postgres** | estado durável, RLS e notificações idempotentes |
| cobrar e confirmar pagamento | pendente de integração Infinity Pay | webhook, conciliação e dinheiro não cabem no BFF |
| webhook | **NestJS** | chega fora de ordem, repete e falha |

`src/servidor/supabase.ts` já tem `consultar()` (como o usuário, sob RLS) e
`consultarComoServico()` (ignora RLS). O segundo existe para **um** caso: o
pedido de login, que acontece antes de haver usuário. Qualquer outro uso precisa
de justificativa escrita.

## O primeiro admin

Não há como criar um admin pela interface: promover a admin exige ser admin.
Numa instalação nova, o primeiro sai por SQL:

```sql
update usuario set papel = 'admin' where email = 'quem@cecchinpizzas.com.br';
```

A pessoa precisa ter entrado ao menos uma vez, para o perfil existir. O papel
novo vale na navegação seguinte, sem novo login.

## O que ainda não existe

- **perfil editável** — a rota existe, mas a tela ainda é um desenho e está
  reservada para o trabalho de OAuth
- **frota administrável** — o banco tem tipos de forno, mas não ativos ou
  veículos individuais
- **pagamento Infinity Pay** — a contratação gera solicitação e a operação
  informa o andamento; ainda não existe cobrança PIX/cartão, webhook ou
  conciliação financeira
- **nenhum bucket** de Storage
- **login pelo Google** — o gatilho de perfil já cobre o caminho; falta
  habilitar o provedor no GoTrue
- **rate limit por IP no BFF** — hoje só o do GoTrue, que conta por endpoint
  dele, não pelos nossos
- **entrega de produção** — os dois repositórios ainda não foram publicados
  no remoto

As 36 perguntas de `../cecchin-pizzas-backend/modelagem/docs/07-perguntas.md`
seguem sem resposta humana, e travam a modelagem — não o acesso.


### Central de WhatsApp — integração em andamento (14/09/2026)

A Central sempre consulta o banco sob a sessão de gestão, inclusive quando o
seletor de fonte está no desenho. `ConversaReal` pagina a lista de conversas
e o histórico. Atualiza mensagens/fila a cada dez segundos e a lista a cada
quinze segundos, cancelando leituras ao trocar de conversa ou desmontar.
O envio usa a fila existente; o destinatário fica fixo à conversa selecionada.

Clientes, eventos e agenda abrem a Central para gestão e o WhatsApp externo
para staff. Suporte usa o contato configurado ou o número autenticado na ponte.
O antigo botão inativo de chat no desenho do rastreio agora abre o suporte.
Falhas de consulta aparecem separadas dos estados vazios. As preferências de
WhatsApp do cliente preservam as opções de e-mail e dos demais avisos.

Anexos recebidos pela ponte são consultados pela API da Central: primeiro
autoriza a mensagem por sessão/RLS, depois busca o arquivo com credencial
privada. Imagens, áudios e vídeos têm prévia; documentos são baixados.

O envio autorizado pela Central retornou HTTP 201, foi processado uma vez e
recebeu confirmação de entrega no banco. A conclusão depende ainda da prova
de recebimento de resposta/anexo e dos cenários de recuperação registrados em
`../cecchin-pizzas-backend/infra/WHATSAPP_INTEGRACAO.md`.


### Minha rota e embarque (15/09/2026)

`Minha rota` tem as abas de rota e checklist/saida, sempre para o mesmo evento da
escala aceita. `/operacional/checklist` redireciona para essa segunda aba.
`/api/operacao/embarque` le/escreve via RPC com JWT do usuario; nunca usa service role.
O banco gera o QR ao confirmar o evento, valida checklist e registra autor/horario da saida.
Gestao/admin imprimem no detalhe do evento ou no checklist da propria rota.
O scanner le camera ao vivo em HTTPS/localhost e foto/arquivo em HTTP da rede local.
O modo Desenho oferece QR exclusivo de demonstracao e nunca envia liberacao ao banco.
GPS abre direcoes de carro no Google Maps com o endereco do evento.
Prova reproduzivel: `skills/verificar-tela/embarque-real.mjs` (evento e usuario sinteticos,
notificacoes removidas antes do commit da fixture; limpeza no finally).
# Montagem e avaliação de equipes — 15/09/2026

`/admin/montar-equipe` atende gestão/admin, com acesso também pelos cartões
de Agenda e Despacho. Cards permitem adicionar, retirar e arrastar pessoas
ou a sugestão inteira. O rascunho persiste no banco; confirmar usa o fluxo de
convites de escala. Quantidades base/extras são revisáveis por evento.

O BFF `/api/operacao/montagem-equipe` consulta as notas individuais e a regra
de dimensionamento da organização. Sem regra cadastrada, não inventa uma
proporção: pede quantidade manual. As planilhas trazem adicionais financeiros
e pedidos em texto; detalhes em `migracao/DIMENSIONAMENTO_EQUIPE.md` no backend.

`/cliente/avaliar-evento?evento=...`, acessível em Meus eventos, permite ao
cliente vinculado confirmar o fim e avaliar evento/equipe de 0 a 5. O banco
valida vínculo, horário e integrantes; o fechamento retira o evento da
montagem. As notas individuais alimentam o ranking, incluindo nota zero.

Conferido no navegador: rascunho após reload, convites de contas sintéticas
com canais desativados, arrastar individual/coletivo, acesso recusado ao
cliente na montagem, notas persistentes e três larguras sem overflow.
QR na Agenda/Despacho renderizado; seletor e opções contrastam no tema escuro.
Typecheck, linter e suítes não foram executados, conforme orientação do usuário.

## Consolidacao da equipe ? 15/09/2026

A pagina antiga `/operacional/escala`, sua view e seu componente foram removidos.
A gestao usa somente `/admin/montar-equipe`. A API `/api/operacao/escala`
mantem apenas PATCH de resposta aos convites, usado pela Minha escala dos
funcionarios. Acoes HTTP exclusivas da tela antiga foram removidas; dados
de escala e avaliacoes historicas continuam sustentando o fluxo atual.

## Header operacional, retorno e filtros ? 15/09/2026

O layout operacional publica os titulos de paginas e subpaginas no header
por `TituloNoHeader`. O contexto existe somente na area com sidebar; fora
dela, o componente preserva o h1 local. As descricoes e acoes continuam no
conteudo em formato compacto. Paginas da area do cliente e contratacao nao
receberam esse layout.

`VoltarDinamico` registra origens internas em sessionStorage por URL da aba,
com cadeia limitada a 30 etapas. Mantem query de filtro e pagina; links da
sidebar iniciam uma nova origem. Evento/cliente abertos diretamente recebem
um destino padrao. Retornos nao sobrescrevem a propria cadeia, permitindo
Pendencias -> Evento -> Cliente -> Evento -> Pendencias sem ciclo.

Agenda guarda aba, busca e filtros na URL. O painel inclui telefone,
responsavel alocado/nao alocado, cidade, forno, periodo e atencao, respeitando
os eventos carregados pela consulta existente e atualizando as contagens.
Nao dispara consultas adicionais por tecla.

Conferencia no navegador: retorno com filtros/pagina e apos reload, cadeia
entre evento/cliente, restauracao dos filtros da agenda, 15 paginas da sidebar
com um titulo no header e nenhum h1 visivel no conteudo. Desktop, tablet e
celular nos temas claro/escuro; sem erros JavaScript. Sem typecheck/linter.


### Controles de paginação

`Paginacao` padroniza Clientes, Pendências e lista/histórico da Central: página atual, total, primeira/última e campo de salto direto. URLs preservam os filtros; a interface começa em 1 mesmo nas rotas com offset zero. As consultas paginadas usam `Prefer: count=exact`; `consultar` expõe o total do Content-Range, mantendo RLS e sem carregar todos os registros. A contagem respeita os mesmos filtros da consulta.


### Atenção manual e configurações por abas

A página do evento oferece marcar/remover atenção. A RPC `pode_marcar_atencao`
controla a apresentação e `definir_atencao_evento` valida novamente a escrita no banco.
Admin escolhe os perfis exatos em Notificações e regras > Permissões; inicialmente
Admin, Gestão e Equipe estão autorizados. A flag continua manual, independente da situação financeira.

Notificações e regras separa destinatários, canais, permissões, disciplina, reservas
e entregas. Os destinatários são buscados no BFF sob RLS, 12 por página, com busca
por nome/e-mail/telefone e filtro por perfil. Cada card exibe cinco controles, telefone e salvar diretamente, sem expansão.
As preferências existentes e as regras de entrega não mudam ao navegar ou filtrar.
A lista tem rolagem interna limitada, sem centenas de formulários no HTML inicial.

Cards de destinatários: altura de 96px (antes 82px), controles inline com nomes acessíveis, legenda e estado pressionado. Salvar altera somente a pessoa do card e não desmonta os demais editores.


### Preferências em lote

Destinatários mantém uma seleção explícita de IDs fora da lista paginada:
continua entre páginas, buscas, perfis e abas da mesma tela. Não depende dos cards
visíveis. Selecionar página e selecionar todos dos filtros adicionam à seleção,
sem duplicar pessoas. Limite de 1000 por lote, contador global e limpeza explícita.

Editor do lote distingue Manter/Ativar/Desativar para os cinco campos. Somente as
alterações escolhidas chegam à RPC atômica; telefones não são editados em lote.
Após sucesso, limpa a seleção e recarrega a página atual. Falhas preservam o lote.
Canais e Avisos usam fieldsets com legendas e cores distintas nos cards e no lote.

Controles do lote ficam permanentemente na barra de seleção, ao lado do contador. Não há botão de abrir editor nem painel separado. Cada ícone alterna Manter/Ativar/Desativar; Aplicar salva somente os campos escolhidos. Sem seleção ficam desabilitados e limpar/aplicar reinicia os controles.
