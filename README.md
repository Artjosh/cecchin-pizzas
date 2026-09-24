# Cecchin Pizzas — frontend

Aplicativo de contratação, gestão e operação de eventos de rodízio. Usa React 19, Vinext sobre Vite 8, Tailwind 4, MapLibre e um BFF em route handlers. O destino de implantação configurado é Cloudflare Workers; execução local e implantação são estados diferentes.

## Começar

Leia [AGENTS.md](AGENTS.md) e [CLAUDE.md](CLAUDE.md) antes de alterar o projeto. O contrato dos fluxos está em [ARQUITETURA.md](ARQUITETURA.md); build, rede e mapas em [VINEXT.md](VINEXT.md).

Use Node e npm compatíveis com o lockfile, instale com `npm ci` em um checkout novo e configure o ambiente conforme `.env.example`, sem copiar segredos para a documentação. O backend fica no repositório irmão [cecchin-pizzas-backend](../cecchin-pizzas-backend/README.md).

| Comando | Efeito |
|---|---|
| `npm run dev` | Prepara o worker do mapa e inicia o wrapper de desenvolvimento/rede |
| `npm run build` | Gera o build Vinext; não equivale a deploy |
| `npm start` | Serve o build existente |
| `npm run preview` | Faz build e inicia Wrangler local |
| `npm run deploy` | Faz build e publica; exige escopo de publicação autorizado |
| `npm run typecheck` / `npm run lint` | Ambos executam `tsc --noEmit` |

Antes de subir um servidor, confira se já existe um em uso. Validações e seus efeitos estão em [TESTES.md](TESTES.md); não execute comandos proibidos pelo usuário.

## Onde encontrar

| Pasta | Responsabilidade |
|---|---|
| `app/` | Rotas, layouts, guards e BFF em `app/api/` |
| `src/servidor/` | Sessão, consultas autenticadas e integrações privadas |
| `src/views/` | Composição das telas; referências antigas em `desenho/` |
| `src/components/equipe/` | Montagem, sugestões, perfis, transporte, mapas e contagens |
| `src/components/whatsapp/` | Central e histórico com rolagem ascendente |
| `src/components/painel/` | Tabelas compactas, paginação e cabeçalhos |
| `src/lib/demo-operacao.ts` | Dados demonstrativos da operação |
| `skills/` | Procedimentos, scripts de investigação e relatórios datados |

## Banco e Desenho

A montagem e o diretório de equipe compartilham componentes nos dois modos. Banco usa sessão, PostgREST/RPC e dados reais; Desenho oferece pessoas e eventos fictícios com interações locais. A presença de um botão no Desenho não comprova persistência real.

**A Central do WhatsApp usa a integração real mesmo com Desenho selecionado.** O seletor não é um isolamento global contra efeitos externos.

Limites conhecidos: frota física não está modelada, rastreio não transmite GPS, não existe upload de foto implementado e rotas usam estimativas de carro sem trânsito em tempo real. Veja a [arquitetura](ARQUITETURA.md) e o [contrato de equipe](../cecchin-pizzas-backend/migracao/DIMENSIONAMENTO_EQUIPE.md).
