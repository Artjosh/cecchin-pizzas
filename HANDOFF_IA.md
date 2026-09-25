# Handoff para outra IA — 25/09/2026

Leia primeiro [AGENTS.md](AGENTS.md) do frontend e o `AGENTS.md` do backend. Este workspace contém **dois Git separados**: [frontend](README.md) e [backend](../cecchin-pizzas-backend/README.md). Consulte o [índice do frontend](README.md), a [arquitetura](ARQUITETURA.md) e a [auditoria funcional](AUDITORIA_SISTEMA_2026-09-25.md). Não dependa do histórico deste chat para continuar.

## Restrições e estado

- O usuário pediu expressamente para **nunca executar typecheck nem linter automaticamente**. Só após pedido explícito posterior. Nesta rodada de auditoria e interface, também não rodar testes.
- Não fazer cobrança real, enviar WhatsApp/e-mail, resetar banco/ETL ou reiniciar containers como consequência de uma inspeção visual. A Central WhatsApp usa dados reais mesmo no modo Desenho.
- A última inspeção local de banco relatou 122 migrations aplicadas, 4 staff ativos, zero veículos físicos e fila de e-mail com falhas HTTP 403; são fotografias datadas, não garantias do estado atual nem de produção.
- Em 25/09/2026 os repositórios estavam em `main` limpo antes desta rodada. **Há alterações locais de interface nesta rodada**; execute `git status` em ambos e revise diff antes de qualquer commit/push. Não presumir deploy.
- Checkout atual é link hospedado da InfinitePay. O modo histórico `teste_centavo` cobra **R$ 1,00 real**, não R$ 0,01. Proxy e iframe são apenas planos em `infra/PLANO_CHECKOUT_PROXY.md` e `PLANO_CHECKOUT_IFRAME.md`.

## Trabalho de interface desta rodada

- `/admin/frota`: `AdminFleetView.tsx` deixou de exibir os cards de eventos de `LogisticaPainel`. `CadastroVeiculos.tsx` agora oferece cards por carroceria, filtros e consulta de disponibilidade por dia/horário pela API logística. Para particular, cruza declaração do carro e da pessoa. O filtro de rotas indica apenas compatibilidade de capacidade; o mapa tático decide alocação. O catálogo cadastra **modelos** de forno, mas ainda não há tabela de unidades físicas/estoque de fornos. Conferir visual, inclusive estado sem veículos.
- `/operacional/mapa`: `TacticalMapView.tsx` aceita `?data=AAAA-MM-DD` e navegação de dias; o planejador `LogisticaPainel` foi movido para cá, visível a gestão/admin. Rota continua estimativa OSRM, sem GPS/trânsito ao vivo. Conferir se papel `staff` acessa mapa sem o planejador gerencial.
- `/admin/operacao`: `OperacaoEquipeView.tsx` separou Integrantes, Pré-cadastros e Vínculos. `EquipeOperacao.tsx` não deve mais fazer fetch/render de pré-cadastros na aba principal. O banco local auditado tinha 4 staff ativos, então a promessa de “10 integrantes” não pode ser feita por UI.
- `/admin/pagamentos`: agora chamado **Eventos solicitados** na tela/sidebar, com abas Para aprovar, Consultar disponibilidade e Cobranças. Configuração da conta e preço/equipe mudou para `/admin/financeiro?aba=configuracoes`. Devoluções seguem em rota própria com badge. Cards de cobranças usam largura uniforme e mostram data/endereço da solicitação quando disponíveis. Revise query/filtro e paginação ao mudar de aba.
- `/admin/financeiro`: ganhou navegação por Hoje, Freelancers, Cartões, Veículos, Conciliação, Lançamentos e Configurações, com rolagem interna. `GestaoFinanceira` oculta blocos por aba. Ainda há consultas de várias seções no render; otimizar por aba e medir RSC é trabalho posterior.
- `MarketingPainel.tsx`: prévia visual explícita e fictícia de Instagram ocupa metade da largura desktop; mobile alterna Prévia/Gestão. Abas internas reduzem a parede de cards. Não há conexão OAuth, múltiplas contas nem postagem real. Agenda/biblioteca/pedidos existentes continuam fluxo interno; preservar essas ações.
- Localidades: a inspeção visual do banco local confirmou **582 localidades e 68 com taxa**. O ETL documenta as 68 taxas e 18 vigências de preço; tempos normal/pico da fonte vieram vazios. A tela agora mostra a contagem real de localidades com taxa. Não confundir preço de evento com taxa do bairro.
- NSU e slug: o fluxo normal recebe via webhook/callback e valida via payment_check. Campos manuais do admin são contingência de recuperação; não preencher sinteticamente.

## Próximos passos de revisão

1. A inspeção visual local abriu `/admin/frota`, `/operacional/mapa`, `/admin/operacao`, `/admin/pagamentos`, `/admin/financeiro`, `/admin/localidades` e marketing; marketing também foi inspecionado em viewport mobile. Repetir no ambiente alvo com dados reais e conferir fluxos de gravação. Seguir [verificar-tela](skills/verificar-tela/SKILL.md). Nesta rodada não foram executados testes/typecheck/linter.
2. Inspecionar especialmente o fluxo de marketing em mobile, alternância de abas do financeiro, navegação por data no mapa e datas/dados vazios na frota. Corrigir defeitos observados.
3. Otimizar a leitura do Financeiro por aba para não buscar tudo a cada navegação. Em frota, o GET logístico traz mais dados que os cards precisam; considerar endpoint de disponibilidade enxuto.
4. Fazer correções de negócio da [auditoria](AUDITORIA_SISTEMA_2026-09-25.md) em trabalho separado, priorizando fila de e-mail travada e troca de veículo no WhatsApp. Isso requer backend, migrations e verificação de persistência.
5. Atualizar docs de arquitetura/infra com qualquer diferença encontrada, registrando claramente código implementado, migration aplicada, serviço atualizado e transação confirmada.

### Inventário físico de fornos ainda pendente

`modelo_forno` é um catálogo de tipos usados pelo evento; não representa cada forno da empresa. A tela de frota direciona para esse catálogo e informa a limitação. Para cadastrar unidades físicas de verdade, criar migration incremental com `organizacao_id`, modelo, identificador único, estado/atividade e RLS de gestão; depois ligar cada unidade à alocação do evento, com bloqueio por janela de saída/retorno. Sem esse vínculo, um cadastro visual permitiria prometer o mesmo forno a eventos simultâneos. Conferir histórico de migrations e ambiente antes de aplicar qualquer DDL; não tratar o link do catálogo como inventário concluído.

## Mapa de documentação

| Assunto | Fonte principal |
|---|---|
| Frontend, guards, dados, equipe, mapas | `cecchin-pizzas/ARQUITETURA.md` e `CLAUDE.md` |
| Serviços, Docker e ambiente | `cecchin-pizzas-backend/infra/README.md` |
| Cobrança e devolução | `cecchin-pizzas-backend/infra/INFINITEPAY.md` |
| Bot e Central | `cecchin-pizzas-backend/infra/WHATSAPP_INTEGRACAO.md` |
| Schema e ETL histórico | `cecchin-pizzas-backend/migracao/README.md`, `ETL.md`, `DECISOES.md` |
| Planos **não implementados** | `cecchin-pizzas/PLANO_CHECKOUT_IFRAME.md` e `cecchin-pizzas-backend/infra/PLANO_CHECKOUT_PROXY.md` |

Não registrar dados de clientes, números de telefone, tokens, screenshots privados ou payloads autenticados neste handoff.

