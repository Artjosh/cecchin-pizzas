# Verificação do frontend

Revisado em 26/09/2026. Este documento descreve os comandos disponíveis e o que cada evidência comprova; não declara uma suíte passando agora. Preferência permanente do usuário: não executar typecheck nem lint automaticamente. Essa regra também vale para comandos compostos que os invoquem, como `npm test` e `npm run test:tudo`; só execute após pedido explícito. A tabela documenta os efeitos dos comandos, não autoriza sua execução.

## Comandos e efeitos

| Comando na raiz do frontend | Executa | Dependências/efeitos |
|---|---|---|
| `npm run typecheck` ou `npm run lint` | TypeScript sem emissão | Os dois scripts são equivalentes; execução apenas após pedido explícito |
| `npm run test:unidade` | Vitest, projeto unidade | Lógica isolada |
| `npm test` | Typecheck + unidade | Não é apenas teste unitário; inclui typecheck |
| `npm run test:integracao` | Vitest, projeto integração | BFF/GoTrue/PostgREST locais; pode criar fixtures |
| `npm run test:tudo` | Typecheck + projetos Vitest | Inclui typecheck e requer serviços configurados |
| `npm run build` | Build Vinext | Não comprova UI nem deploy |

Configuração efetiva está no manifest e nos arquivos de Vitest. Não fixe contagem de testes neste documento. Leia preparação/limpeza do cenário antes de rodar contra um banco com dados reais.

## O que verificar

### Integração HTTP isolada

A suíte HTTP exige `CECCHIN_HTTP_TEST=true` e banco com prefixo
`cecchin_http_test_`. Não aponte para o banco operacional: testes antigos alteram
catálogos/eventos e limpam a caixa de e-mail. Use o launcher na raiz frontend:

```powershell
node skills/provar-cadeia/http-isolado.mjs preparar
node skills/provar-cadeia/http-isolado.mjs servir
# Em outro terminal:
node skills/provar-cadeia/http-isolado.mjs testar
```

`preparar` copia somente definições public/app/auth do Supabase local, versões
do GoTrue e fixtures sintéticos. Cria banco separado e containers de teste;
não copia clientes/eventos nem conecta workers. Exige Docker e o container local
`supabase_db_Nicolas`. O arquivo `.env.http-test.json` é ignorado pelo Git.
Se já existe, reutilize `servir`/`testar`; o script não sobrescreve ou apaga bases.

Portas: BFF 3100, gateway 54621, Mailpit 54624, PostgREST 54631 e Auth 54632.
O launcher usa ambiente restrito e inicia Vite sem carregar `.env` operacional.
O cache é separado do servidor habitual. Fechar o launcher encerra seus processos;
containers e base ficam disponíveis para inspeção. Não há limpeza automática ampla.
Mudanças posteriores de schema exigem aplicar as migrations novas também nessa
base isolada. O schema copiado não replica privilégios padrão de papéis gerenciados;
os testes pgTAP locais com rollback continuam sendo a referência complementar de RLS.

O SMTP de teste usa apenas Mailpit. O teste de primeiro acesso exige entrega,
template, código e consumo do hash; não passa silenciosamente sem e-mail.
`reserva-pagamento.test.ts` cobre reserva pelo BFF, autorização, origem, leitura
da cobrança, idempotência do retorno e ausência de confirmação financeira por query.
Ele mantém InfinitePay desabilitado e não chama o PSP.

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

Meça com o mesmo papel, volume, filtros, viewport e modo. Registre bytes RSC, tempo da consulta/resposta e fluidez do arraste. Linhas do payload de desenvolvimento não são teto de produto.

## Reserva e pagamento

Teste os estados de capacidade em /cliente/contratar, incluindo consulta manual à Central e checkout hospedado. O administrador pode selecionar checkout real de R$ 1,00 na etapa de pagamento; esse ensaio cobra dinheiro e os testes automatizados não efetuam a transação. Disponibilidade obrigatória também se aplica ao teste. Confira /admin/pagamentos e /admin/pagamentos/devolucoes, onde a devolução é registrada manualmente. Contrato e migrations: [InfinitePay](../cecchin-pizzas-backend/infra/INFINITEPAY.md). Capturas locais em skills/verificar-tela/capturas/ não são versionadas.
