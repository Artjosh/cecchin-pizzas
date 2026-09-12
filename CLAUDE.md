# Cecchin Pizzas — frontend

App de contratação e operação do rodízio. **vinext** (reimplementação do
Next.js da Cloudflare sobre Vite) rodando em Workers.

Leia `ARQUITETURA.md` antes de propor integração e `VINEXT.md` antes de mexer
em build, rota ou layout.

## Outro agente pode estar trabalhando aqui

Antes de mexer, leia `../AGENTES.md` — um arquivo só, na pasta que contém os
dois repositórios. Ele diz quem está fazendo o quê agora e quais arquivos estão
travados.

Ao começar algo, acrescente sua linha em **Em andamento**. Ao terminar, mova
para **Concluído**. Edite por acréscimo: reescrever a seção inteira apaga o que
o outro escreveu no intervalo.

## Onde escrever arquivo de trabalho

**Nada de pasta `.claude` neste repositório.** Ferramenta de verificação,
script de prova e a saída que eles geram vivem em `skills/`, junto da
instrução que explica para que servem — quem abrir a pasta amanhã encontra as
duas coisas no mesmo lugar.

| o que | onde |
|---|---|
| instrução de uma tarefa repetível | `skills/<nome>/SKILL.md` |
| script que a executa | `skills/<nome>/*.mjs`, `*.sh` |
| captura de tela, saída de conferência | `skills/verificar-tela/capturas/` (no `.gitignore`) |
| quem está fazendo o quê agora | `../AGENTES.md` |

Skills que já existem: `verificar-tela` (captura e olha a interface),
`provar-cadeia` (prova conta → responsável → evento → Minha rota, e desfaz),
`ligar-dado` (trocar mock por banco numa tela).

## A coisa mais importante de saber

**Autenticação, papéis e leituras de negócio são reais.** Agenda, catálogo,
equipe, clientes, mapa, checklist, suporte, rastreio e localidades leem o
PostgREST sob RLS. Quem é você e o que você pode fazer também vem do Postgres.
Os desenhos de referência em `src/views/desenho/` continuam estáticos de
propósito.

A fronteira para o resto está em `ARQUITETURA.md` e em
`../cecchin-pizzas-backend/infra/README.md`: leitura simples vai do Server
Component direto ao PostgREST; o NestJS entra onde há transação, dinheiro,
fila, cron ou webhook.

## Acesso: três camadas, nenhuma redundante

| camada | onde | decide |
|---|---|---|
| proxy | `proxy.ts` | tem cookie? Senão, `/entrar` |
| guarda de papel | layouts de área, Server Component | pode ver esta área? |
| **RLS** | Postgres | **quais linhas existem para esta pessoa** |

O proxy **não** consulta banco: roda em toda requisição, e papel lido de
cookie é papel que o cliente escolhe.

`useAuth()` serve para DESENHAR — escrever um nome, esconder um link. Nunca
para proteger dado. Se precisa decidir acesso, use `exigirPapel()` num Server
Component, e confie na RLS por baixo.

**A sessão nunca aparece no corpo de uma resposta.** Ela mora em dois cookies
`httpOnly` gravados pelos route handlers. Se escrever um endpoint que repassa
o corpo do GoTrue, o token vaza para o `response.json()`.

## Server Component NÃO escreve cookie

`cookies().set()` e `.delete()` LANÇAM em Server Component. Só route handler,
server action e proxy podem escrever.

Isso já travou o app inteiro: a renovação de sessão morava em `sessaoAtual()`,
que o `app/layout.tsx` chama. Bastava o token vencer com refresh inválido para
toda página virar 500 — inclusive `/entrar`, a única capaz de consertar. A
saída era limpar cookie no navegador à mão.

Onde cada coisa mora agora:

| escrita | onde |
|---|---|
| renovar a sessão | `proxy.ts` |
| gravar no login | route handler de `/api/auth/*` |
| apagar sessão quebrada | `/api/auth/encerrar` |
| **ler** | qualquer lugar, via `lerSessao()` / `sessaoAtual()` |

`lerSessao()` distingue `ausente` de `suja` de propósito: cookie que não presta
precisa ser APAGADO, não só ignorado — senão a pessoa é mandada ao login
carregando o mesmo cookie quebrado, para sempre.

## Policy permissiva se SOMA

A armadilha que já produziu dois defeitos aqui. Ler uma tabela sem filtro
confiando na RLS para "sobrar só a minha linha" **não funciona**: uma segunda
policy mais ampla (`usuario_leitura` libera a organização inteira) deixa outras
linhas visíveis, e o `limit=1` traz uma qualquer.

Aconteceu com a sessão — que resolveu para outra pessoa — e com a tela de
pedido de staff. Nenhum dos dois apareceu em `tsc`, build ou status HTTP.

**Filtre pelo dono, sempre.** Para "a minha linha", use `meu_perfil()`, que o
Postgres resolve de `auth.uid()`. Há teste de regressão para os dois casos em
`testes/integracao` e em `supabase/tests/03_rls_leitura.sql`.

## Segredos no servidor

`SUPABASE_SERVICE_ROLE_KEY` ignora RLS. Só `consultarComoServico()` a usa, e só
no pedido de login — que acontece antes de existir usuário para a RLS
reconhecer. Qualquer outro uso precisa de justificativa escrita.

Nada em `src/servidor/` pode ser importado por componente de cliente.

## Regras de build

**Vite 8 é obrigatório.** vinext importa `parseSync` de `vite`; versões
anteriores não exportam.

**`cloudflare()` só no build.** Com o plugin ativo em `vinext dev`, todas as
rotas devolvem 404. `vite.config.ts` liga por `command === "build"`. Não
"simplifique" isso.

**`NEXT_PUBLIC_`, não `VITE_`.** Variável exposta ao browser precisa do
prefixo `NEXT_PUBLIC_` e chega por `process.env`. `import.meta.env.VITE_*` é
convenção do Vite puro e não funciona aqui.

Chave com esse prefixo **vai para o bundle do cliente e é pública**. A única
proteção de uma chave de Maps é restrição por domínio no Google Cloud.

## Regras de estilo

**Só tokens do design system.** Nunca `stone-*`, `slate-*`, `gray-*`, `white`,
`black` crus. Use `surface`, `surface-container{,-low,-lowest,-high,-highest}`,
`on-surface`, `on-surface-variant`, `primary`, `on-primary`, `tertiary`,
`outline-variant`, `inverse-surface`, `inverse-on-surface`.

Espaçamento: `space-xs|sm|md|lg|xl`, margem de página `margin`,
`margin-tablet`, `margin-desktop`.

Tipografia é **par de classes**: `font-label-md text-label-md`. Papéis:
`display`, `headline`, `title`, `body`, `label`; escalas `sm`, `md`, `lg`.
`src/lib/utils.ts` estende o `tailwind-merge` para essas famílias — sem isso
`cn()` descartaria `text-label-md` achando que é `text-label`.

## Server e client

As 13 páginas de `app/` são Server Components. Não adicione `"use client"` a
uma página.

`"use client"` só onde há hook, evento ou animação, e o mais fundo possível na
árvore. `src/components/Provedores.tsx` é a fronteira que segura o
`AuthProvider` para o layout raiz continuar server — e o usuário desce como
prop, vindo do servidor.

Seis views são server de propósito: `AdminCatalogView`, `AdminFleetView`,
`DispatchView`, `FieldRouteView`, `SupportView`, `WhatsAppCentralView`.
**Não marque nenhuma como client sem motivo concreto** — já aconteceu por
descuido de busca e substituição.

`motion/react`, nunca `framer-motion`: o segundo é dependência transitiva do
primeiro e não está declarado.

## Nada de data no render

`new Date()` dentro do corpo de um componente causa divergência de hidratação.
Vai para `useEffect`, com um marcador (`--:--`) no primeiro render.

## Verificar antes de dizer que está pronto

```bash
npm test           # typecheck + 106 testes de unidade. Rápido.
npm run test:tudo  # o de cima + 75 de integração. Exige Supabase e `npm run dev`.
```

Mexeu em acesso, papel, policy ou rota de API: **rode `test:tudo`**, e rode
também `npm test` no repositório do backend (136 testes de pgTAP). Detalhe em
`TESTES.md`.

Teste novo de acesso vai em `testes/integracao`, falando HTTP de verdade — sem
mock de `fetch`. O que um mock esconderia é exatamente o que se quer medir:
que o cookie sai `HttpOnly`, que o corpo não traz token, que a RLS recusa.

`tsc --noEmit` e build passando **não dizem nada sobre interface**. Painel
escondido atrás do cabeçalho, botão coberto e preço fantasma passam pelos dois.

Mudou layout, tela ou componente visual: rode a skill `verificar-tela` e
**olhe as imagens**. Status 200 não é verificação de interface.

## Comandos

```bash
npm run dev      # vinext dev (porta 3000)
npm run build    # 22 rotas
npx vinext start --port 3201
npx tsc --noEmit
```

## Estilo

Português nos nomes novos (`PainelPassos`, `ProvedorReserva`, `Passo1Local`),
acompanhando o vocabulário do domínio. Código herdado do AI Studio mantém o
nome original até ter motivo para mudar.

Comentário explica o **porquê**, especialmente quando o código parece estranho
de propósito — cada um deles custou uma depuração.
