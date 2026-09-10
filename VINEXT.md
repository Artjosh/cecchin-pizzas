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
/cliente/contratar         BookingView
/cliente/rastreio          TrackingView
/cliente/eventos           placeholder
/operacional/despacho      DispatchView
/operacional/minha-rota    FieldRouteView
```

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

Não registre `@vitejs/plugin-rsc` no `vite.config.ts` — o vinext faz isso.

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
| `vinext build` | passa — 6 rotas |
| `vinext start` + curl nas 6 rotas | **200 em todas**, conteúdo renderizado no servidor |
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
