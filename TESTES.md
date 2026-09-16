# Verificação do frontend

Revisado em 16/09/2026. Este documento descreve os comandos disponíveis e o que cada evidência comprova. Não declara uma suíte passando agora. Restrições do usuário sobre testes, typecheck, lint, build e processos prevalecem.

## Comandos e efeitos

| Comando na raiz do frontend | Executa | Dependências/efeitos |
|---|---|---|
| `npm run typecheck` ou `npm run lint` | TypeScript sem emissão | Os dois scripts são equivalentes |
| `npm run test:unidade` | Vitest, projeto unidade | Lógica isolada |
| `npm test` | Typecheck + unidade | Não é apenas teste unitário |
| `npm run test:integracao` | Vitest, projeto integração | BFF/GoTrue/PostgREST locais; pode criar fixtures |
| `npm run test:tudo` | Typecheck + projetos Vitest | Requer os serviços configurados |
| `npm run build` | Build Vinext | Não comprova UI nem deploy |

Configuração efetiva está no manifest e nos arquivos de Vitest. Não fixe contagem de testes neste documento. Leia preparação/limpeza do cenário antes de rodar contra um banco com dados reais.

## O que verificar

Unidade cobre decisões isoladas: papéis, cookies, destinos seguros, orçamento e mapeamento de erros. Integração HTTP cobre cookies reais, corpo sem tokens, respostas 401/403 e acesso direto ao PostgREST. Cross-device exige dois potes de cookies independentes.

Banco e autorização são descritos em [TESTES do backend](../cecchin-pizzas-backend/TESTES.md). Uma resposta 200, typecheck ou build não prova isolamento entre organizações, nem que uma migration foi aplicada.

A verificação visual tem scripts em [skills/verificar-tela](skills/verificar-tela/SKILL.md). Há provas de navegador para equipe, perfil, mapa, paginação e rolagem; não confundi-las com uma suíte E2E única continuamente mantida. Inspecione seletores, fixtures e endpoints antes de reutilizar scripts datados.

## Casos que não devem regredir

- Identidade vem de `auth.uid()`/`meu_perfil()`, não da primeira linha de uma tabela com policy ampla.
- API sem sessão devolve erro adequado, sem transformar redirect seguido em HTML com status 200.
- Banco e Desenho mantêm distinção de dados; Central WhatsApp continua real.
- Equipe: fornos primeiro, busca nas duas listas, liderança automática na adição individual e remoção manual, contagens, drag e composição válida antes dos convites.
- Mapa: abertura no perfil e na montagem, contexto do evento, zoom/pan, ponto escolhido e dados ausentes.
- Histórico: abre no fim, mantém posição ao inserir mensagens antigas e não arrasta a leitura quando chega mensagem nova.
- Voltar preserva origem/filtros; paginação tem navegação direta, exceto histórico de conversa.
- Mobile: modal, ações e nomes longos cabem; botões de ícone têm nome acessível.

## Efeitos externos e privacidade

A suíte de autenticação usa contas sintéticas e geração de OTP sem depender de entrega real. Isso não torna todo script do workspace isento de efeitos externos. `email:prova`, envio na Central e confirmação de equipe podem entregar mensagens. Exigem autorização de envio e destinatário conhecido; não os execute para uma simples revisão.

Fixtures devem ter IDs únicos e limpeza restrita às linhas criadas. SQL com rollback não garante reversão de chamadas HTTP externas já feitas; prefira cenários em que o worker não veja os registros. Não desative canais reais globalmente para testar.

Capturas e payloads autenticados ficam locais e mascarados. Abra as imagens antes de afirmar que o layout foi validado.

## Desempenho

Meça com o mesmo papel, volume, filtros, viewport e modo. Registre bytes RSC, tempo da consulta/resposta e arraste. [Performance de 15/09](skills/verificar-tela/PERFORMANCE_2026-09-15.md) é evidência histórica em dev, não benchmark de produção.

Na revisão documental de 16/09 não foram executados testes, typecheck, lint, build ou reinícios.
