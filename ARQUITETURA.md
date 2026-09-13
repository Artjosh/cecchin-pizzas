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
| Google Maps | **existe** — geocoding e autocomplete reais |
| Server Components + SSR | **existe** — páginas protegidas e route handlers dinâmicos |
| Leitura de dado de negócio | **existe** — agenda, catálogo, equipe, clientes, mapa, checklist, suporte, rastreio e localidades usam PostgREST sob RLS |
| Storage do Supabase | container de pé, **nenhum bucket** |
| Escala de equipe | **existe** — convite, aceite pelo painel ou WhatsApp, falta, avaliação e bloqueio progressivo ficam no Postgres |
| Notificações | **existe** — fila rastreável para e-mail e WhatsApp; a Central responde texto na janela de 24h e usa templates fora dela; canais só entregam após credenciais e templates serem configurados no Nest |
| NestJS | faz limpeza de pedidos de login, consome a fila de notificações e recebe webhook do WhatsApp; permanece a fronteira para reserva e dinheiro |

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
| criar reserva, mexer em dinheiro | route handler → **NestJS** | transação, fila, retry |
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
- **nenhum bucket** de Storage
- **login pelo Google** — o gatilho de perfil já cobre o caminho; falta
  habilitar o provedor no GoTrue
- **rate limit por IP no BFF** — hoje só o do GoTrue, que conta por endpoint
  dele, não pelos nossos
- **entrega de produção** — os dois repositórios ainda não foram publicados
  no remoto

As 36 perguntas de `../cecchin-pizzas-backend/modelagem/docs/07-perguntas.md`
seguem sem resposta humana, e travam a modelagem — não o acesso.
