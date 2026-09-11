# Cecchin Pizzas — frontend

App de contratação e operação do rodízio. **vinext** (reimplementação do
Next.js da Cloudflare sobre Vite) rodando em Workers.

Leia `ARQUITETURA.md` antes de propor integração e `VINEXT.md` antes de mexer
em build, rota ou layout.

## A coisa mais importante de saber

**Nenhuma tela lê banco.** Zero cliente Supabase, zero route handler, zero
server action, zero middleware. Todo dado visível é mock escrito no
componente.

Quando for ligar de verdade, a fronteira já está decidida em
`../cecchin-pizzas-backend/infra/README.md`: leitura simples vai do Server
Component direto ao PostgREST; o NestJS entra onde há transação, dinheiro,
fila, cron ou webhook.

## Autenticação não existe

`src/contexts/AuthContext.tsx` é `useState(defaultUsers.cliente)`. O
`RoleSwitcher` troca o papel à mão.

**O guard de papel não é autorização.** `OperationalLayout` chama `redirect()`
dentro de um client component. O 307 que `/operacional/*` devolve no `curl` é
SSR do mesmo componente. Quem abrir o DevTools entra em `/admin`.

Não descreva isso como "protegido" em commit, doc ou resposta.

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
árvore. `src/components/Provedores.tsx` é a fronteira que segura `AuthProvider`
e `RoleSwitcher` para o layout raiz continuar server.

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

`tsc --noEmit` e build passando **não dizem nada sobre interface**. Painel
escondido atrás do cabeçalho, botão coberto e preço fantasma passam pelos dois.

Mudou layout, tela ou componente visual: rode a skill `verificar-tela` e
**olhe as imagens**. Status 200 não é verificação de interface.

## Comandos

```bash
npm run dev      # vinext dev (porta 3000)
npm run build    # 13 rotas
npx vinext start --port 3201
npx tsc --noEmit
```

## Estilo

Português nos nomes novos (`PainelPassos`, `ProvedorReserva`, `Passo1Local`),
acompanhando o vocabulário do domínio. Código herdado do AI Studio mantém o
nome original até ter motivo para mudar.

Comentário explica o **porquê**, especialmente quando o código parece estranho
de propósito — cada um deles custou uma depuração.
