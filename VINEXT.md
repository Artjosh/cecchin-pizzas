# Migração para vinext + Cloudflare Workers

O app saiu de **SPA React + react-router** (applet do Google AI Studio) para
**vinext** — o plugin Vite da Cloudflare que reimplementa a API do Next.js —
rodando em **Workers**.

## O que mudou

| antes | depois |
|---|---|
| `index.html` + `src/main.tsx` + `src/App.tsx` | `app/` (App Router) |
| `react-router-dom` | `next/link` + `next/navigation` |
| `<Outlet />` | `{children}` no layout |
| `useLocation().pathname` | `usePathname()` |
| `src/pages/` | `src/views/` — renomeado para não colidir com o Pages Router |
| `express` + `server.js` do AI Studio | Cloudflare Workers |
| tudo no cliente | RSC por padrão |

`src/views/` guarda os componentes de tela; `app/` só faz roteamento.

## Server vs Client Components

Só duas telas carregam `"use client"`, porque só elas usam estado:

| view | hooks | renderiza |
|---|---|---|
| `BookingView` | 12× `useState` | cliente |
| `TrackingView` | `useState`, `useEffect` | cliente |
| `DispatchView` | nenhum | **servidor** |
| `FieldRouteView` | nenhum | **servidor** |

Os dois layouts são client por causa do `usePathname()` (link ativo).

## Rotas

```
/                          → redirect para /cliente/contratar

/cliente/contratar         BookingView          cliente
/cliente/rastreio          TrackingView         cliente
/cliente/eventos           ClientEventsView     cliente
/cliente/perfil            ProfileView          cliente
/cliente/suporte           SupportView          cliente

/operacional/despacho      DispatchView         gestão, admin
/operacional/minha-rota    FieldRouteView       staff, gestão, admin
/operacional/mapa          TacticalMapView      staff, gestão, admin
/operacional/whatsapp      WhatsAppCentralView  staff, gestão, admin
/operacional/checklist     StaffChecklistView   staff, gestão, admin

/admin/catalogo            AdminCatalogView     admin
/admin/frota               AdminFleetView       admin
```

`/admin` usa o mesmo shell de `/operacional` — o que separa as duas áreas é o
papel exigido, não o layout.

## Tela cheia

`/cliente/contratar` é a única rota em modo full-bleed: o mapa ocupa a
viewport inteira abaixo do cabeçalho e o assistente de reserva flutua sobre
ele. `ClientLayout` liga esse modo por rota — sem rodapé, sem respiro
embaixo, sem rolagem de página. Quem rola é o painel.

O cabeçalho é `fixed` com 80px (`h-20`) em todos os breakpoints. Daí
`pt-20` junto de `h-[100dvh]`: com `box-sizing: border-box` o padding fica
dentro da altura, então a área do mapa é exata e nada transborda.

`dvh` em vez de `vh` por causa da barra de endereço do navegador móvel, que
some ao rolar — `100vh` deixaria o rodapé do painel embaixo dela.

## Controle de acesso

`OperationalLayout` chama `redirect()` quando o papel não permite. Em client
component isso funciona: lança um erro que o roteador intercepta, sem
`useEffect`.

Verificado no servidor — `/operacional/despacho` com papel `cliente` responde
**307** e o HTML não carrega nada do conteúdo operacional. Não é `display:none`.

O papel vem do `AuthProvider`, montado em `src/components/Provedores.tsx`. O
layout raiz continua Server Component; só a árvore de providers é client.

## Comandos

```bash
npm run dev       # vinext dev
npm run build     # vinext build
npm run start     # servidor de produção local
npm run preview   # build + wrangler dev (workerd de verdade)
npm run deploy    # build + @vinext/cloudflare deploy
```

## Versões travadas, e por quê

| pacote | versão | motivo |
|---|---|---|
| `vite` | `^8.3.0` | vinext importa `parseSync`, export que **só existe no Vite 8** (Rolldown + Oxc). No Vite 7 o build morre com `SyntaxError` |
| `@vitejs/plugin-react` | `^5.1.4` | peer do vinext |
| `@vitejs/plugin-rsc` | `^0.5.26` | peer opcional do vinext; a faixa é estreita |
| `next` | devDependency | **só os tipos.** vinext reimplementa a API, mas `Metadata`, `LinkProps` etc. vêm do pacote `next`. Nada dele entra no bundle |

Não registre `@vitejs/plugin-rsc` no `vite.config.ts` — o vinext faz isso, e
aborta com *"Your config also registers it manually"* se você registrar.

## ⚠ O plugin do Cloudflare só entra no build

Com `cloudflare()` ativo durante `vinext dev`, **toda rota responde 404** —
inclusive a raiz — e o log não mostra erro, só `GET / 404 in 66ms`.

O build de produção continua passando e `vinext start` serve tudo em 200, o
que esconde o problema: ele aparece **só em desenvolvimento**.

Testado no vinext 0.1.8 com as duas formas documentadas:

| tentativa | dev |
|---|---|
| `vinext()` + `cloudflare()` | 404 em tudo |
| `vinext({ rsc: false })` + `rsc({ entries })` + `cloudflare()` | 404 em tudo |
| `vinext()` sem `cloudflare()` | **200** |

Por isso o `vite.config.ts` condiciona o plugin a `command === "build"`.

O que se perde: acesso a bindings (`cloudflare:workers`) durante o dev. Este
projeto ainda não usa nenhum. Quando usar, o caminho é `npm run preview`, que
builda e sobe o workerd de verdade.

O snippet de config do README do vinext está desatualizado em relação à 0.1.8:
ele mostra `rsc()` registrado à mão, o que a versão atual recusa.

## Deploy

```bash
wrangler login          # ou CLOUDFLARE_API_TOKEN
wrangler secret put GEMINI_API_KEY
npm run deploy
```

`wrangler.jsonc` já tem `nodejs_compat`. Bindings (D1, R2, KV) entram lá e são
lidos via `import { env } from "cloudflare:workers"` — sem `getPlatformProxy()`.

## Estado

| | |
|---|---|
| `tsc --noEmit` | passa |
| `vinext build` | passa — 13 rotas |
| `vinext start` + curl nas 13 rotas | 200 nas de cliente; **307** nas de operação e admin, pelo guard de papel |
| `vinext dev` | passa |
| `wrangler dev` (workerd real) | **não testado** |
| deploy em Workers | **não feito** |

## Ressalvas

1. **vinext é experimental.** A própria Cloudflare avisa: não é battle-tested
   em produção. Cobre ~94% da API do Next 16.
2. **Sem pré-renderização em build.** Só ISR — a página é gerada na primeira
   requisição e cacheada.
3. **`npm audit`: 2 vulnerabilidades high**, ambas via `image-size`, transitiva
   do próprio vinext. Nada que este projeto importe direto.
4. As rotas aparecem como `? Unknown` no relatório de build. É limitação da
   análise estática do vinext, não erro.
