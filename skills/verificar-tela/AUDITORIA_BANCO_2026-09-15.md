# Auditoria de Banco, interface e persistência — 15/09/2026

Escopo: alterações de operação desta conversa e inventário das integrações existentes no app. Ambiente verificado: Supabase local e frontend em localhost:3000. Não é uma certificação de produção nem de todas as combinações de papéis/volumes futuros.

## Recursos pedidos

| Recurso | Banco / caminho de escrita | Interface |
| --- | --- | --- |
| Funções de atendimento e forno | `perfil_operacional_equipe`, RPC `salvar_perfil_operacional` (039) | Mesmo perfil em Banco e Desenho; abertura pelo card ou botão direito |
| Transporte da pessoa | `meios_transporte` (041): Uber, ônibus, carro, moto, van, empresa, bicicleta, a pé | Grupo próprio com múltipla seleção |
| Veículos próprios | `veiculos` (040): carro, moto, van | Independente do meio de deslocamento |
| CNH | `cnh_categorias` (040): A, B, C, D, E | Múltiplas categorias; não inferidas dos veículos |
| Casa / QG | Endereço e coordenadas do perfil (039); QG vem da configuração `QG_CECCHIN` | Mapa interativo com zoom/pan; dados ausentes são indicados |
| Ponto do evento | **Lacuna corrigida nesta auditoria:** `localizacao_evento` + RPC `salvar_localizacao_evento` (043) | Escolha explícita do resultado da busca salva no Banco; retorno inclui latitude/longitude; endereço alterado invalida uso do ponto anterior |
| Perfis na montagem | Mesmo perfil e mapa, com evento como contexto | Banco tem o mesmo modal amplo, controles e mapa; celular corrigido para nomes compridos |
| Mapa de montagem | Mesmos candidatos e notas consultados para a montagem | Coluna com rolagem, opções, slider de tamanho e aplicação da equipe |
| Vários líderes | `planejamento_equipe.lideres` e `quantidade_lideres` (039) | Líderes atribuídos primeiro nas sugestões e equipe montada; totais de forno, atendimento e funções a definir |
| Proporções e rascunho | `regra_dimensionamento_equipe`, `planejamento_equipe`; RPCs de funções (035/039) | Ajustável por evento e configurável por organização |
| Confirmação | RPC valida habilidades e grava função em `escala_evento` (039) | Confirmação explícita antes de convites |
| Diretório de pessoas | BFF autenticado lê usuários staff ativos, perfis, notas e bloqueios | Cards e paginação de 24; busca; avatar ilustrado quando sem foto |
| Atenção | `configuracao_notificacao.papeis_atencao`, evento e RPC (037) | Controle por papel e flag no evento |
| Notificações em lote | Preferências e RPC de lote (038) | Seleção entre páginas e controles inline |
| QR de saída / checklist | `evento_qr_saida`, `evento_checklist_saida` e RPCs (034) | Expansão é estado visual; confirmação é persistida |
| Agenda / paginação / volta | Consultas de eventos e parâmetros de navegação | Densidade, modo planilha e origem de navegação são estado de interface; não precisam de nova tabela |
| Histórico WhatsApp | `conversa_whatsapp`/central e BFF com cursor (023/024/028–033) | Carrega mensagens antigas para cima; botão de retorno ao fim; integração com bot preservada |

## Evidência

- Seletor **Banco clicado na UI**, cookie conferido e diretório comparado ao BFF: 1 integrante ativo. Perfil, transporte/CNH, mapa, slider e contexto do evento abriram sem erros JavaScript.
- Capturas de Banco em 1440×900, 834×1112 e 390×844 inspecionadas. Foi encontrado e corrigido corte lateral do formulário por nome comprido. Banco e Desenho usam os mesmos componentes dessas funcionalidades.
- Salvamento de perfil/transporte, preservação de campos omitidos, rascunho/confirmação e localização do evento conferidos como `authenticated`, em transações terminadas em ROLLBACK. Endereço desatualizado foi recusado; staff não lê os endereços privados nem os altera. Não ficaram dados artificiais ou convites gravados. Isso prova as RPCs; não é uma gravação definitiva de dados de pessoas reais pela UI.
- A composição com dois líderes foi conferida no Desenho. O banco contém apenas um staff ativo e nenhum perfil/plano preenchido: não há dados suficientes para obter uma sugestão real com vários líderes. A estrutura e a validação aceitam múltiplos IDs; não foram inventadas habilidades para preencher as vagas.
- `auditar-recursos-banco.py` inventaria tabelas/views e RPCs literais e compara seus nomes ao catálogo. Não substitui verificação dos caminhos dinâmicos, autorização e formulários.
- Histórico local: **43 arquivos, 43 versões registradas**, incluindo 043 desta auditoria. 029–038 foram reconciliadas anteriormente após comparação do catálogo; 039–042 já estavam aplicadas. Schema Drizzle derivado novamente após 043.

## O app inteiro ainda tem diferenças conhecidas

Não seria correto afirmar que tudo que aparece no Desenho está implementado no Banco:

- **Frota física:** não existe tabela de veículos/ativos, alocação ou manutenção. A tela Banco lê `modelo_forno`, um catálogo de tipos. O transporte pessoal está persistido; não equivale a cadastrar a frota empresarial.
- **Rastreio ao vivo:** não existe transmissão de GPS dos veículos. Banco mostra dados reais do evento; Desenho possui representação demonstrativa de rastreio.
- **Tempos por transporte:** os trajetos atuais são estimativas de carro via OSRM, sem trânsito e sem cálculo específico de ônibus/moto/Uber. O cadastro do meio de transporte não muda o algoritmo do provedor.
- **Fotos:** leitura de `foto_url` e avatar padrão funcionam; o perfil operacional não oferece upload, e não foi criado bucket de fotos nesta entrega.
- **Catálogo e outras telas herdadas:** existem leituras reais, mas controles ilustrativos do Desenho não significam automaticamente CRUD equivalente. A revisão de nomes de recursos não certifica essas ações.
- **Configuração do QG:** o endereço/ponto usado é configuração existente no código, sem editor de QG no Banco.

Nada foi implantado em ambiente remoto nesta conferência. Não foram executados build, lint, typecheck ou suítes de testes; serviços existentes permaneceram ativos.
