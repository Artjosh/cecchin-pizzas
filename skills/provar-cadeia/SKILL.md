---
name: provar-cadeia
description: Conferir o fluxo real de planejamento de equipe, convite e aceite de escala, Minha rota e checklist/saída, identificando efeitos de escrita e notificações antes de executar.
---

# Provar a cadeia operacional

Revisado em 26/09/2026. Esta skill orienta a conferência do fluxo atual. Não afirma que o cenário foi executado nem que o ambiente está saudável. A montagem atual usa `planejamento_equipe`, `perfil_operacional_equipe`, `regra_dimensionamento_equipe` e `escala_evento`; `responsavel.usuario_id` e `evento.responsavel_id` são vínculos legados e, isoladamente, não provam planejamento, convite, aceite nem elegibilidade para Minha rota.

## Leia os contratos antes de agir

- [TESTES do frontend](../../TESTES.md): comandos, ambiente HTTP isolado e efeitos.
- [TESTES do backend](../../../cecchin-pizzas-backend/TESTES.md): pgTAP, RLS, transações e notificações.
- [Dimensionamento da equipe](../../../cecchin-pizzas-backend/migracao/DIMENSIONAMENTO_EQUIPE.md): regras e composição válidas.
- [Verificação visual](../verificar-tela/SKILL.md): telas, scripts específicos e limites de execução.
- Código atual: `app/api/operacao/montagem-equipe/route.ts`, `app/api/operacao/escala/route.ts`, `app/api/operacao/embarque/route.ts`, `src/views/FieldRouteView.tsx` e `src/components/embarque/RotaComChecklist.tsx`.

Reutilize os serviços já ativos. Não execute `servidor.sh`, não reinicie serviços nem rode reset/build/check/typecheck/linter como preparação automática. No frontend, `npm test` inclui typecheck; no backend, `npm test` inclui `npm run check`, que também executa typecheck. Respeite a preferência permanente deste workspace: typecheck e linter só após pedido explícito.

## Estado dos scripts desta pasta

`cadeia.mjs` é uma prova legada e não corresponde à montagem atual: cria uma conta com `cookiesDeSessao`, altera seu papel, cria um `responsavel`, escolhe o evento confirmado mais próximo e o aloca pelos endpoints legados `/api/operacao/responsavel` e `/api/operacao/evento`. Não cria nem confirma `planejamento_equipe`, não valida funções/líderes, não percorre aceite de `escala_evento` e não prova checklist. Além disso, altera um evento existente e tenta reverter as alterações e apagar a conta no `finally`; a reversão pode falhar e não desfaz efeitos externos. **Não execute esse script como prova da cadeia atual.** Atualize-o e revise sua estratégia de isolamento/rollback antes de voltar a recomendá-lo.

`http-isolado.mjs` cobre uma suíte HTTP do projeto de acesso, não a cadeia de montagem. `preparar` cria um banco PostgreSQL separado e containers locais de Auth, PostgREST e Mailpit, copia definições de schema e carrega fixtures sintéticas. Exige Docker e o container local `supabase_db_Nicolas`; grava `.env.http-test.json` ignorado pelo Git. `servir` inicia o gateway/BFF e `testar` executa o projeto Vitest de integração. O launcher não copia linhas de negócio nem apaga base/containers, mas a preparação cria recursos persistentes: inspecione estado existente e siga [TESTES](../../TESTES.md) antes de usar. As provas HTTP atuais não exercitam montagem, aceite, Minha rota ou checklist.

## Como conferir o fluxo atual

1. Defina o ambiente e os atores explicitamente: organização, evento futuro elegível, gestor, integrantes staff ativos e, para isolamento, um staff de outra organização. Confirme se a fonte da interface está em Banco ou Desenho. Desenho contém estado demonstrativo e não prova persistência.
2. Antes de escrever, confira regras de dimensionamento, perfis/habilidades, bloqueios, escala já existente e qualquer estado atual do evento. Não use `limit=1` para deduzir identidade; confira a sessão efetiva e os IDs explícitos.
3. No modo Banco, abra `/admin/montar-equipe`. Carregue evento e composição; salve um rascunho incompleto e confira que ele persiste sem criar convites. Depois confira validação de vagas, quantidade mínima de líderes e habilidades compatíveis.
4. **Confirmação tem efeito externo potencial:** `salvar_planejamento_funcoes` pode atualizar/cancelar escalas e criar convites/notificações. Sem autorização explícita para enviar, use fixtures e transação isolada cuja execução não possa ser observada pelos workers, ou ambiente isolado que suprima entregas externas. Não confirme planejamento operacional só para obter captura de tela.
5. Verifique o aceite pelo fluxo real de staff (`responder_escala` via `/api/operacao/escala`, ou o canal de resposta que a tarefa pretende cobrir). Uma escala `convidado` ainda não dá acesso de campo; confira estado `aceito` e recusas/duplicidade com identidades e organização distintas.
6. Em `/operacional/minha-rota`, use a sessão do staff aceito e confira que o evento, data/horário e detalhes pertencem à escala dele. Um evento associado apenas por `responsavel` não substitui esse requisito. O modo Banco é a leitura real; o modo Desenho não comprova autorização nem dados persistidos.
7. Abra “Checklist e saída”. `GET /api/operacao/embarque` exige acesso via `pode_embarcar_evento`; confira que outro staff sem escala aceita e outro tenant recebem recusa. As marcações persistem por `conferir_item_saida`. A liberação exige os sete itens conferidos e QR ativo do evento; valide QR revogado, código de outro evento, concorrência e repetição nos testes SQL isolados, sem liberar uma saída operacional real.
8. O checklist faz parte de Minha rota; `/operacional/checklist` redireciona para `/operacional/minha-rota?aba=checklist`. Não procure a antiga página independente como evidência.

Ao conferir composição, lembre que `forno` e `garcom` são habilidades independentes, liderança é uma atribuição do planejamento, e o número mínimo de líderes depende da regra configurada. Rascunho pode ficar incompleto; confirmar exige composição válida. Campos residenciais e de transporte são dados privados: não os copie para logs, capturas ou relatórios.

## Dados, limpeza e evidência

Prefira pgTAP com fixtures sintéticas, `SET LOCAL ROLE authenticated` e `ROLLBACK`, ou ambiente isolado. Um rollback SQL não desfaz e-mail/WhatsApp já enviado nem chamada externa; mantenha workers sem acesso ao cenário antes de confirmar. Nunca desative canais reais globalmente para testar.

Registre IDs exatos da execução e valores anteriores de cada linha alterada. Reverta apenas essas linhas, respeitando dependências e verificando o resultado; não use `DELETE` amplo por prefixo nem comandos de limpeza copiados sem conferir o alvo. Se a execução for interrompida, audite os IDs registrados antes de qualquer limpeza. Proteja tokens, cookies, QR/códigos de saída e dados pessoais; mascare evidências.

Separe evidências: resposta HTTP não prova estado no banco; linha no banco não prova isolamento RLS; screenshot não prova persistência; arquivo de migration não prova que ela foi aplicada. Informe ambiente, papel, IDs mascarados, etapas realmente exercitadas, efeitos externos possíveis e lacunas. Não declare a cadeia completa se alguma transição foi inferida ou coberta apenas por um mock.

Se auditoria autenticada falhar, investigue trigger, função e grants específicos. Não resolva concedendo INSERT livre em histórico/auditoria.
