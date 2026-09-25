# Auditoria funcional do sistema — 25/09/2026

Esta é a memória da auditoria solicitada em 25/09/2026. A inspeção original foi de código, migrations e amostras do banco **local**. A atualização documental abaixo confronta commits posteriores com o texto, sem nova prova integral de ponta a ponta. Não equivale a teste completo em produção. Na revisão visual e documental não foram executados testes, typecheck ou linter. ✅ implementado no código observado; 🟡 parcial; ⚠️ regra ou operação problemática; ❓ sem confirmação de ponta a ponta. A existência de tabela ou tela isolada não foi tomada como prova do fluxo.

**Como ler a evidência:** a coluna de código/banco indica onde a regra está implementada ou foi observada. Ela não prova execução no ambiente alvo. Para considerar uma entrega pronta, conferir separadamente arquivo versionado, migration aplicada e objeto no catálogo, serviço executando a imagem nova, efeito persistido e resultado externo quando houver provedor. Os números locais abaixo são fotografias datadas.

## Escala, logística, frota e equipe

| # | Requisito e estado | Evidência no código/banco | Lacuna e correção necessária |
|---:|---|---|---|
| 1 | Eventos duplos 🟡 | `migracao/sql/` modela `evento_duplo`; `LogisticaPainel` lê pares e trajetos entre eventos; há consulta de número compartilhado. | O vínculo exige equipes confirmadas idênticas e a experiência de criar/alterar duplas ainda não cobre todos os rearranjos de escala. Rever regra transacional, horários e uma única saída inicial. |
| 2 | Geração assistida 🟡 | `src/lib/logistica/planejador.ts` produz alternativas; `LogisticaPainel.tsx` deixa selecionar carros, motoristas e paradas. | Não há um ciclo geral de pergunta, escolha, impacto e retomada da escala para toda ambiguidade. Modelar decisões pendentes persistidas. |
| 3 | Otimização logística 🟡 | Planejador considera carga, distância, disponibilidade, planos e custos. | Heurística gulosa não prova ótimo global entre várias rotas/eventos. Comparar propostas completas e explicitar trade-offs. |
| 4 | Pequenos ajustes sugeridos 🟡 | Requisitos e saídas podem ser editados no painel logístico. | Não detecta/projeta automaticamente troca de forno, pessoa ou saída por poucos minutos para desbloquear uma solução. Apresentar ajustes como propostas antes de gravar. |
| 5 | Carro particular com material ⚠️ | `regra_veiculo_particular`, `uso_veiculo_particular`, `ReembolsoVeiculos.tsx` e RPCs registram R$ 1,75/km, mínimo, adicional e ciclos de lavagem/bônus. | A informação `transportou_material` depende de registro humano; não é inferida com segurança do plano. Conferir vínculo do requisito logístico e autorização do acerto. Unicidade por plano/uso impede bônus duplicado para a mesma ocorrência. |
| 6 | Carro particular só pessoas ✅ | Mesmas RPCs e tela distinguem tarifa de R$ 1,50/km e ausência do adicional de material; uso é numerado e registrado. | Ainda requer conferência operacional da quilometragem real. |
| 7 | WhatsApp: pessoa e carro 🟡 | Bot consulta ficha ativa e pergunta disponibilidade do carro; em `whatsapp.service.ts`, a confirmação agora percorre todos os carros ativos da pessoa e grava/limpa a semana de forma reconciliada. | Código corrigido, mas ainda não executado no worker Docker ativo. Confirmar persistência após reconstruir/deployar worker. |
| 21 | Saída e deslocamento 🟡 | `plano_logistico`, rotas e janela de ocupação calculam saída/retorno. | Estimativa de estrada não inclui todas as tarefas reais de carga/descarga e espera. Ajustar marcos operacionais por tipo de serviço. |
| 22 | Pico/trânsito ⚠️ | `localidade`, `janela_pico` e fator de rota têm configuração administrativa. | OSRM não traz trânsito ao vivo; fator fixo não representa congestionamento real. Expor como estimativa e calibrar dados próprios. |
| 23 | Carro de funcionário/terceiro 🟡 | `veiculo_operacional.proprietario_id`, perfil/CNH e disponibilidade do carro são independentes. | Não há ciclo completo de aceite/autorização de terceiro e veículo externo ocasional. |
| 24 | Frota da empresa 🟡 | `veiculo_operacional` aceita proprietário nulo; BFF `/api/operacao/veiculos`. | Na auditoria local havia **zero veículos físicos** cadastrados: modelagem não prova operação. Cadastrar frota real e conferir agenda. |
| 25 | Início da escala 🟡 | `MontagemEquipe.tsx` tem abas no topo para Equipe e Carro e saída; `LogisticaPainel` abre o evento selecionado. Base usa regra configurável e fallback da migration 124. | A navegação conjunta não é um assistente transacional completo de equipe, carga, carro, rota e aprovação. A aba foi conferida visualmente sem veículo real; alocação efetiva ainda requer prova. |
| 26 | Próprio x terceiro 🟡 | Planejador distingue carro de empresa e particular. | Carro de terceiro fora do cadastro não tem contrato/aceite/custo completo. |
| 27 | Mais eventos que carros / “levar” 🟡 | Propostas de `modo=levar` e viagens com paradas são previstas. | Depende de escolha/registro manual e de compatibilidade de horários; validar eventos simultâneos reais. |
| 28 | Flexibilidade até 30 minutos ✅ | Migration `089` ajusta a margem de flexibilidade, e o planejador a aplica. | Conferir resultados no ambiente alvo antes de depender da regra. |
| 29 | Capacidade do carro “levar” 🟡 | Limite por saída e assentos entram no cálculo do planejador. | Carga física e combinação de paradas ainda precisam de validação prática. |
| 30 | Fluxo do veículo “levar” 🟡 | Há previsão de múltiplas paradas e retorno em `LogisticaPainel`/API. | A busca, saída real e comunicação ao motorista não estão fechadas num único fluxo de execução. |
| 31 | Priorização do “levar” 🟡 | Heurística considera saídas alternativas. | Não há prova de melhor solução global nem critério transparente para sempre priorizar a opção desejada. |
| 32 | Configurações do “levar” 🟡 | `limite_eventos_levar` por carro e parâmetros logísticos existem. | Faltam parâmetros operacionais mais finos para carga/descarga e intervalo por parada. |
| 33 | Disponibilidade carro/motorista ⚠️ | `janelasCarro`, `janelasPessoa`, `carroEMotoristaCoincidemNoDia` e planos aprovados fazem checagem. | Divergência possível quando disponibilidade de um carro antigo fica ativa após escolha de outro no bot. Corrigir escrita atômica e conferir no banco. |
| 34 | Compatibilidade evento/veículo 🟡 | `forno_maximo`, `bebida_maxima`, lugares e requisitos são comparados. | Inferência da carga e exceções físicas dependem de dados completos; não selecionar carro sem cadastro confiável. |

## Pessoas, financeiro, marketing e Brotos

| # | Requisito e estado | Evidência no código/banco | Lacuna e correção necessária |
|---:|---|---|---|
| 8 | Freelancer 🟡 | `acerto_freelance`, `vw_acertos_freelance_por_pix` e `GestaoFinanceira` registram conclusão, PIX e quitação. | Pagamento é marcado manualmente, sem comprovante bancário automatizado; conciliar antes de declarar pago. |
| 9 | Cartões/faturas 🟡 | Cartões, compras e faturas existem em `GestaoFinanceira`; migration `116` aceita dias 29–31 com ajuste para mês curto. | Despesas genéricas não são automaticamente vinculadas à compra do cartão; evitar contagem duplicada e conciliar faturas. |
| 10 | Financeiro “Hoje” ✅ | `vw_caixa_hoje`, `vw_caixa_resumo_dia` e paginação são lidas em `FinanceiroView`. | Saldo com taxa InfinitePay pendente é provisório, conforme aviso. |
| 11 | Agenda de marketing 🟡 | `MarketingPainel` e API de marketing gravam compromissos por semana. | Não publica de fato no Instagram; “publicado” é registro operacional. |
| 12 | Anexos de marketing 🟡 | Upload/consulta de mídia autorizada e `midia_caminho` na agenda. | Não converte nem publica o anexo no provedor. Validar armazenamento/permissões no alvo. |
| 13 | Solicitação de serviço marketing 🟡 | Formulário e estados de recebimento/prazo em `MarketingPainel`. | Fluxo humano existe, mas sem integração de postagem automática. |
| 14 | Instagram parcial | A ponte local implementa feed, Stories, perfil, comentários, curtidas e paginação pela sessão autenticada do navegador; veja a verificação datada abaixo. | A ponte usa endpoints web não oficiais. Filtro de posts sem mídia, avatares e paginação foram alterados, mas aguardam verificação com a extensão recarregada; perfil retornou HTTP 429 e sua causa não está confirmada. Comentários, curtidas e grade de perfil não foram validados ponta a ponta. OAuth/publicação oficial e runtime continuam sem prova externa. |
| 15 | Concorrência 🟡 | Cadastro e job de coleta existem; erros/última coleta são exibidos. | Sem chaves/ambiente e dados coletados, métricas ficam vazias. Não tratar cadastro como coleta comprovada. |
| 16 | Biblioteca de conteúdos 🟡 | `BibliotecaMarketing` existe e é conectada à área de marketing. | Não está ligada a publicação automática no Instagram. |
| 17 | Clientes Broto 🟡 | Tabelas/API/UI de Brotos. | Cadastro ainda exige CNPJ, limitando clientes pessoa física; revisar contrato. Banco local da auditoria não tinha clientes Broto. |
| 18 | Pedido Broto pelo site 🟡 | Fluxo de pedido e gestão existe. | Sem pedido real no banco local auditado, não foi possível confirmar de ponta a ponta. |
| 19 | Preço por cliente Broto 🟡 | Regra/tabela de preço por cliente. | Conferir precedência, histórico e preço efetivo com casos reais. |
| 20 | Financeiro Brotos x eventos 🟡 | Lançamentos e views distinguem origens. | Sem dados Broto reais, conciliação cruzada permanece sem prova. |

## Integrações, dados e prova operacional

| # | Requisito e estado | Evidência no código/banco | Lacuna e correção necessária |
|---:|---|---|---|
| 35 | Banco e migrations 🟡 | Além das migrations até 124, `20260925125` criou as tabelas/RPCs Instagram e `20260925126` o bloqueio por conta; ambas foram aplicadas sem reset ao banco local nesta tarefa. | Produção não foi conferida. Confirmar schema alvo e aplicar migrations pelo processo normal de deploy. Tabelas Instagram ainda vazias. |
| 36 | APIs 🟡 | Route handlers Vinext, PostgREST com JWT, Nest e RPCs fazem validação de sessão/domínio. | Auditoria de todos os endpoints e cenários de erro não equivale a cobertura total. Evitar confundir HTTP 200 com efeito persistido. |
| 37 | Automações/notificações ⚠️ | Consulta local nesta tarefa: 30 mensagens WhatsApp enviadas; 15 notificações de e-mail em falha após cinco tentativas com HTTP 403. A tela administrativa já oferece reenvio explícito via RPC `reenfileirar_notificacao`; nenhum reenvio foi acionado. |
| 38 | Ponta a ponta ❓ | Havia evidência local de um checkout real administrativo de R$ 1,00 confirmado via Pix e convertido em evento; migrations/testes versionados cobrem partes. | Não prova cartão, estorno, produção, todas as telas, carga, concorrência nem liquidação em extrato. Teste real exige autorização e ambiente controlado. |
| 39 | Funcionalidades Instagram parcial | A pré-visualização fictícia foi substituída por uma central ligada à sessão web do Instagram e por um fluxo oficial de publicação em código. | A ponte local ainda requer validação de partes da UI e usa endpoints não oficiais; OAuth/publicação dependem de configuração e confirmação externa. Modo Desenho e `src/servidor/fonte.ts` ainda oferecem mock; mapa continua sem GPS real. |

## Achados transversais e ordem sugerida

### Segurança de RLS observada nesta tarefa

`npx supabase db query --local` sinalizou as tabelas `public.disponibilidade_carro_conversa` e `public.disponibilidade_conversa` como críticas por estarem sem RLS e sugeriu habilitá-lo. A consulta direta a `pg_class.relacl`, porém, mostrou somente o grant de `postgres` nas duas tabelas (nenhum grant direto para `anon`/`authenticated`). Não foi feita alteração: antes de habilitar RLS, revisar acesso do backend/bot e definir políticas apropriadas; o aviso do scanner e a ACL devem ser reconciliados para o ambiente alvo.

### Mudanças posteriores à inspeção inicial

- O Mapa Tático passou a mostrar os eventos do dia com coordenadas estáveis, rotas rodoviárias em lotes e uma aba lateral de saídas. Isso melhora a leitura e o planejamento; não valida todos os endereços históricos, nem converte estimativa OSRM em trânsito ao vivo ou rastreio GPS.
- A montagem passou a calcular Base no Banco, oferecer pequena margem de escala apertada e separar Equipe de Carro e saída em abas no topo. A troca de abas foi vista no navegador em desktop e celular; o banco local observado não tinha carro para verificar uma alocação completa.
- A skill [desenhar-interface](skills/desenhar-interface/SKILL.md) formaliza hierarquia, densidade, estados e revisão responsiva. É procedimento de projeto, não evidência de que todas as telas foram redesenhadas.
- A integração Instagram tem implementação inicial de OAuth, feed da conta, imagem de feed e fila. Configuração Meta/runtime ausente e imagem dos workers antiga impedem execução externa; ver [INSTAGRAM_INTEGRACAO.md](INSTAGRAM_INTEGRACAO.md).

### Verificação parcial da ponte Instagram - 25/09/2026

O navegador abriu a bandeja e o visualizador de Stories; foram mostrados dois itens, o controle seguinte avançou ao segundo e `Esc` fechou a modal. A abertura de perfil retornou HTTP 429. A versão anterior consultava até dez avatares em paralelo, o que pode ter contribuído, mas não comprova a causa. Código posterior limitou consultas complementares a quatro sequenciais por página com cache, filtrou itens sem mídia e implementou paginação por cursor; esses ajustes ainda precisam de recarga da extensão e verificação real. Perfil/grade, comentários ponta a ponta, curtida e paginação não foram confirmados. Nenhuma curtida ou comentário foi enviado. Esta nota atualiza somente o escopo Instagram; não revalida os outros requisitos desta auditoria. Detalhes em [INSTAGRAM_INTEGRACAO.md](INSTAGRAM_INTEGRACAO.md).

### Prioridades de correção

1. Corrigir HTTP 403 de e-mail e reconstruir/deployar worker para levar a correção da seleção de múltiplos carros ao runtime.
2. Cadastrar veículos e conferir disponibilidade/planos no banco alvo. Sem frota, uma UI bonita não valida logística.
3. Formalizar decisões assistidas da escala e comparar alternativas completas; a heurística atual é ponto de partida.
4. Fechar conciliação financeira e comprovantes de freelancers/cartões/InfinitePay antes de automatizar status.
5. Configurar e revisar o app Meta, secrets e callback; reconstruir worker/API e validar OAuth, leitura e uma publicação de teste autorizada antes de declarar o Instagram ativo.

Valores de localidades: [ETL](../cecchin-pizzas-backend/migracao/ETL.md) documenta 68 taxas de deslocamento e 18 vigências de preço preservadas da planilha. Os minutos normal/pico vieram vazios e permanecem nulos. **Preço de catálogo**, **taxa de localidade** e **tempo de rota** são campos diferentes; não copiar um para outro nem gerar minutos artificiais. Se a UI mostra taxa de localidade vazia, conferir registro específico e importação antes de gravar valor.

Fluxo InfinitePay: [contrato](../cecchin-pizzas-backend/infra/INFINITEPAY.md). NSU e slug chegam por callback/webhook e são verificados via `payment_check`; a digitação manual no admin é apenas recuperação quando a notificação automática não chegou. Não inventar identificadores a partir do link ou do UUID do pedido.

