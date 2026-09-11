# Arquitetura do frontend

Estado real em 10/09/2026. O que não está marcado como **existe** não existe.

## A resposta curta

**Este app não fala com banco nenhum.** Nenhuma linha de dado na tela vem do
Postgres. Toda tela é mock escrito no próprio componente.

```
grep -rlE 'supabase|createClient|fetch\(|/api/' app src   →  0 arquivos
```

Não há cliente Supabase, nem route handler, nem server action, nem middleware.
As dependências de runtime são: vinext, react, motion, lucide-react,
tailwind-merge, clsx, `@vis.gl/react-google-maps` e `@google/genai`.

## O que está ligado de verdade

| peça | estado |
|---|---|
| Google Maps (`LocationPickerMap`) | **existe** — chave em `.env`, geocoding e autocomplete reais |
| Server Components + SSR | **existe** — 13 páginas, todas server; 6 das 12 views são server |
| Supabase (Postgres, Auth, Storage, REST) | containers de pé, **nenhum consumido** |
| NestJS (`/agenda`) | **existe** no repo do backend, **nenhuma tela chama** |
| Autenticação | **não existe** |
| Middleware | **não existe** |

## Autenticação: o que há hoje

`src/contexts/AuthContext.tsx` é uma simulação:

```ts
const [user, setUser] = useState<User>(defaultUsers.cliente);
```

Um objeto em memória. `RoleSwitcher` troca o papel na mão.

**O guard de papel é só do cliente.** `OperationalLayout` chama `redirect()`,
mas é client component. O 307 que `/operacional/*` devolve no `curl` é SSR do
mesmo componente — não é autorização. Quem abrir o DevTools e trocar o estado
entra em `/admin`. Isso é aceitável num protótipo e inaceitável no dia em que
houver dado real por trás.

O GoTrue do Supabase (`supabase_auth_Nicolas`) está de pé sem ninguém falar
com ele.

## Server e client

As 13 páginas de `app/` são Server Components — nenhuma tem `"use client"`.
A fronteira de cliente é declarada onde precisa:

- `src/components/Provedores.tsx` — envolve `AuthProvider` e `RoleSwitcher`
- as 6 views que usam hook ou animação

As outras 6 views (`AdminCatalogView`, `AdminFleetView`, `DispatchView`,
`FieldRouteView`, `SupportView`, `WhatsAppCentralView`) renderizam no
servidor. É o que permite que elas leiam banco sem virar client no futuro.

## Como o dado vai chegar (decidido, não implementado)

A regra de `../cecchin-pizzas-backend/infra/README.md` é **o BFF chama, o Nest
decide**. Traduzindo para este repo:

| o que | por onde | por quê |
|---|---|---|
| ler catálogo, agenda, evento | Server Component → **PostgREST** do Supabase | leitura simples com RLS; não precisa de intermediário |
| arquivo (foto, comprovante) | **Storage** do Supabase, direto | nenhum bucket criado ainda |
| criar reserva, mexer em dinheiro | Route handler do vinext → **NestJS** | precisa de transação, fila e retry; Worker não sustenta |
| webhook de WhatsApp e pagamento | direto no **NestJS** | chega fora de ordem, repete e falha |
| sessão e papel | **middleware do vinext** | roda antes do render; é o único lugar que corta a rota de verdade |

O middleware é do BFF, não do Nest: quem precisa barrar a navegação é quem
renderiza a página. O Nest valida o JWT de novo nas rotas dele, porque
confiar no chamador é o mesmo que não validar.

## Por que o BFF não basta

O Worker abre e fecha conexão por requisição, não tem cron e tem teto de CPU.
Isso já elimina fila, retry, conciliação e as duas rotinas que a planilha roda
hoje (`atualizacaoCompleta` às 8h, `sincronizarEventos` às 18h). Detalhe em
`../cecchin-pizzas-backend/infra/README.md`.

## Telas

13 rotas. A lista, o papel exigido e o modo tela-cheia estão em `VINEXT.md`.

Nenhuma tela persiste nada. `BookingView` calcula orçamento em memória e o
botão final abre um `alert()`.

## Próximo passo, na ordem

1. Middleware de sessão no vinext, trocando `AuthContext` por GoTrue de verdade
2. Primeira leitura real: `/cliente/eventos` pelo PostgREST, com RLS ligado
3. `POST` de reserva pelo NestJS
4. Bucket de comprovante no Storage

Nada disso adianta antes das 36 perguntas de
`../cecchin-pizzas-backend/modelagem/docs/07-perguntas.md` terem resposta.
