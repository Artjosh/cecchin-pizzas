# Handoff para outra IA — atualizado em 25/09/2026

Leia primeiro [AGENTS.md](AGENTS.md) do frontend e o `AGENTS.md` do backend. Este workspace contém **dois Git separados**: [frontend](README.md) e [backend](../cecchin-pizzas-backend/README.md). Consulte o [índice do frontend](README.md), a [arquitetura](ARQUITETURA.md) e a [auditoria funcional](AUDITORIA_SISTEMA_2026-09-25.md). Não dependa do histórico deste chat para continuar.

## Restrições e estado

- Pesquisa revisada em 25/09/2026: [transferência Instagram pela extensão e sessões headless](../cecchin-pizzas-backend/infra/INSTAGRAM_SESSOES_SERVIDOR.md). Prioridade obrigatória: importar a sessão local, validar no servidor e funcionar com o PC fechado. Pool headless com contexto por conta, snapshots criptografados, contas compartilhadas por ACL e seleção independente por usuário/aba. noVNC somente para recuperação excepcional. Próximo passo: provar transferência, restauração e isolamento entre contas; arquitetura ainda não implementada/deployada nem validada com sessões reais.

- O usuário pediu expressamente para **nunca executar typecheck nem linter automaticamente**. Só após pedido explícito posterior. A auditoria e a revisão visual de 25/09/2026 foram conduzidas sem testes; não descreva isso como uma proibição permanente de testes.
- Não fazer cobrança real, enviar WhatsApp/e-mail, resetar banco/ETL ou reiniciar containers como consequência de uma inspeção visual. A Central WhatsApp usa dados reais mesmo no modo Desenho.
- A inspeção anterior relatou 4 staff ativos, zero veículos físicos e fila de e-mail com falhas HTTP 403. Depois dela, as migrations 123 e 124 foram versionadas e registradas como aplicadas **no banco local**; há 124 arquivos em `supabase/migrations/`. Esses dados são fotografias datadas, não garantias do estado atual nem de produção. Confira histórico e catálogo do banco alvo.
- Em 25/09/2026 ambos os repositórios estavam em `main`. Confira `git status`, HEAD e remoto de novo ao retomar; commit e push não provam deploy ou containers reconstruídos.
- Checkout atual é link hospedado da InfinitePay. O modo histórico `teste_centavo` cobra **R$ 1,00 real**, não R$ 0,01. O proxy continua apenas como plano em `cecchin-pizzas-backend/infra/PLANO_CHECKOUT_PROXY.md`; nenhum checkout incorporado foi implantado.
- O scanner Supabase desta tarefa sinalizou RLS desligado em `disponibilidade_carro_conversa` e `disponibilidade_conversa`. No catálogo local, `relacl` lista apenas `postgres`, sem grants diretos a `anon`/`authenticated`. Revisar scanner, ACL e caminho de acesso do bot antes de adicionar RLS/policies; a tarefa não alterou essas tabelas.

## Interface implementada até esta revisão

- `/admin/frota`: `AdminFleetView.tsx` deixou de exibir os cards de eventos de `LogisticaPainel`. `CadastroVeiculos.tsx` agora oferece cards por carroceria, filtros e consulta de disponibilidade por dia/horário pela API logística. Para particular, cruza declaração do carro e da pessoa. O filtro de rotas indica apenas compatibilidade de capacidade; o mapa tático decide alocação. O catálogo cadastra **modelos** de forno, mas ainda não há tabela de unidades físicas/estoque de fornos. Conferir visual, inclusive estado sem veículos.
- `/operacional/mapa`: `TacticalMapView.tsx` aceita `?data=AAAA-MM-DD` e navegação de dias; o planejador `LogisticaPainel` fica na lateral para gestão/admin. Pontos usam coordenadas dos eventos e linhas usam geometria rodoviária em lotes, inclusive viagens com paradas. Rota continua estimativa OSRM, sem GPS/trânsito ao vivo. Conferir se papel `staff` acessa mapa sem o planejador gerencial e não confundir essa revisão com prova de geocoding perfeito para todos os registros históricos.
- `/admin/operacao`: `OperacaoEquipeView.tsx` separou Integrantes, Pré-cadastros e Vínculos. `EquipeOperacao.tsx` não deve mais fazer fetch/render de pré-cadastros na aba principal. O banco local auditado tinha 4 staff ativos, então a promessa de “10 integrantes” não pode ser feita por UI.
- `/admin/pagamentos`: agora chamado **Eventos solicitados** na tela/sidebar, com abas Para aprovar, Consultar disponibilidade e Cobranças. Configuração da conta e preço/equipe mudou para `/admin/financeiro?aba=configuracoes`. Devoluções seguem em rota própria com badge. Cards de cobranças usam largura uniforme e mostram data/endereço da solicitação quando disponíveis. Revise query/filtro e paginação ao mudar de aba.
- `/admin/financeiro`: ganhou navegação por Hoje, Freelancers, Cartões, Veículos, Conciliação, Lançamentos e Configurações, com rolagem interna. `GestaoFinanceira` oculta blocos por aba. Ainda há consultas de várias seções no render; otimizar por aba e medir RSC é trabalho posterior.
- `MarketingPainel.tsx` incorpora `InstagramCentral`: feed e Stories da sessão autenticada no navegador via extensão local (`browser-extension/instagram-bridge`), com perfil, comentários, curtidas e navegação entre Stories implementados na ponte. A API oficial Meta Login/publicação é outro fluxo; OAuth e postagem ainda não foram executados por falta de configuração/credenciais. Ver a verificação parcial abaixo e [INSTAGRAM_INTEGRACAO.md](INSTAGRAM_INTEGRACAO.md).
- `/admin/montar-equipe`: a Base real vem da regra da organização ou dos valores iniciais da migration 124 (30 convidados por integrante, mínimo 1, 50 por líder), com ajuste manual e pequena margem de escala apertada. A montagem agora tem abas no topo **Equipe** e **Carro e saída**; os cards da equipe rolam em painéis separados e a logística abre o evento diretamente, sem ficar depois de dezenas de pessoas. Foi inspecionada visualmente em desktop e celular no banco local; não houve prova de alocação com carro real, pois nenhum estava cadastrado naquele momento.
- `skills/desenhar-interface/SKILL.md` é o procedimento de UI/UX do projeto. A ponte local e o publicador OAuth estão descritos em [INSTAGRAM_INTEGRACAO.md](INSTAGRAM_INTEGRACAO.md). Mudanças recentes no service worker exigem recarregar a extensão antes de validar o filtro de posts vazios, avatares e paginação; a publicação oficial aguarda configuração Meta e rebuild/deploy dos containers.
- Localidades: a inspeção visual do banco local confirmou **582 localidades e 68 com taxa**. O ETL documenta as 68 taxas e 18 vigências de preço; tempos normal/pico da fonte vieram vazios. A tela agora mostra a contagem real de localidades com taxa. Não confundir preço de evento com taxa do bairro.
- NSU e slug: o fluxo normal recebe via webhook/callback e valida via payment_check. Campos manuais do admin são contingência de recuperação; não preencher sinteticamente.

## Instagram - verificação parcial em 25/09/2026

A sessão do Instagram no navegador alimentou o feed e a bandeja de Stories. O visualizador mostrou dois itens retornados e avançou ao segundo; `Esc` fechou a modal. A tentativa de abrir um perfil retornou HTTP 429. Antes disso, a extensão fazia até dez consultas de avatar em paralelo; a redução para consultas sequenciais com cache e uma hipótese de mitigação, não uma causa confirmada do 429. Não houve teste confirmado do perfil/grade, comentários ponta a ponta, curtida ou paginação nessa versão; nenhuma curtida ou comentário foi enviado. O filtro de cards sem mídia, a busca de avatar e a paginação foram alterados no código e precisam de recarga da extensão e nova verificação no navegador. A API oficial para publicar segue independente e não foi autenticada nem usada.

## Próximos passos de revisão

1. A inspeção visual local abriu `/admin/frota`, `/operacional/mapa`, `/admin/operacao`, `/admin/pagamentos`, `/admin/financeiro`, `/admin/localidades` e marketing; marketing e a aba de carro na montagem também foram inspecionados em viewport mobile. Repetir no ambiente alvo com dados reais e conferir fluxos de gravação. Seguir [desenhar-interface](skills/desenhar-interface/SKILL.md) e [verificar-tela](skills/verificar-tela/SKILL.md). Na revisão de 25/09 não foram executados testes/typecheck/linter.
2. Inspecionar especialmente o fluxo de marketing em mobile, alternância de abas do financeiro, navegação por data no mapa, geocoding de eventos históricos e datas/dados vazios na frota. Corrigir defeitos observados.
3. Otimizar a leitura do Financeiro por aba para não buscar tudo a cada navegação. Em frota, o GET logístico traz mais dados que os cards precisam; considerar endpoint de disponibilidade enxuto.
4. Resolver HTTP 403 dos e-mails e rebuildar/deployar workers para aplicar a reconciliação de veículos WhatsApp; o reenvio manual já existe na tela administrativa.
5. Recarregar a extensão e concluir a verificação da ponte local conforme [INSTAGRAM_INTEGRACAO.md](INSTAGRAM_INTEGRACAO.md), sem curtir nem comentar em conteúdo real durante o teste. Em separado, configurar aplicativo Meta, callback HTTPS e secrets, reconstruir API/worker e validar OAuth/publicação com conta profissional autorizada.
6. Atualizar docs de arquitetura/infra com qualquer diferença encontrada, registrando claramente código implementado, migration aplicada, serviço atualizado e transação confirmada.

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
| Checkout incorporado **não implementado** | `cecchin-pizzas-backend/infra/PLANO_CHECKOUT_PROXY.md` |
| Instagram - ponte local parcial; OAuth/publicação oficial pendente | `cecchin-pizzas/INSTAGRAM_INTEGRACAO.md` |
| UI/UX e revisão visual | `cecchin-pizzas/skills/desenhar-interface/SKILL.md` e `skills/verificar-tela/SKILL.md` |

Não registrar dados de clientes, números de telefone, tokens, screenshots privados ou payloads autenticados neste handoff.

