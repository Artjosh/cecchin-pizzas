---
name: provar-cadeia
description: Conferir conta, perfil operacional, planejamento, escala aceita e Minha rota com cenário controlado, sem confundir vínculo legado com equipe confirmada.
---

# Provar a cadeia operacional

Contrato atualizado em 16/09/2026. A cadeia atual inclui conta staff ativa, perfil/habilidades, planejamento, confirmação, aceite de escala e Minha rota/checklist. Vínculo legado com `responsavel` sozinho não prova esse fluxo.

`cadeia.mjs` registra a prova anterior conta → responsável → evento. Leia e adapte ao cenário atual antes de executar: ele altera dados e seu resultado não cobre automaticamente planejamento/funções/convites.

## Preparação

Leia [TESTES](../../TESTES.md), [verificação visual](../verificar-tela/SKILL.md) e [dimensionamento](../../../cecchin-pizzas-backend/migracao/DIMENSIONAMENTO_EQUIPE.md). Reutilize o servidor existente. Não rode `servidor.sh` automaticamente: ele pode construir, apagar saída e encerrar processo.

Use IDs sintéticos, organização e contas de prova conhecidas. Registre os valores anteriores que serão modificados. Não faça limpeza ampla por prefixo sem comprovar que todos os registros pertencem à execução e que suas dependências estão cobertas.

## Conferências

1. Conta/papel corretos no servidor e no banco, sem sessão resolvida por `limit=1`.
2. Perfil com habilidades e privacidade de residência/transporte preservadas.
3. Rascunho salva seleção/quantidades sem criar convite.
4. Confirmação valida vagas, líderes e habilidades atomicamente.
5. Aceite torna a escala elegível ao fluxo de campo; pessoa/tenant não autorizado não recebe dados.
6. Minha rota mostra o evento correto, horários e checklist integrado. A antiga página Checklist separada redireciona; não exija seu antigo item de sidebar.
7. QR/checklist/saída obedecem autenticação e escala, sem divulgar código de liberação indevidamente.

Confirmar equipe pode enfileirar mensagens. Sem autorização de envio, prove transações com rollback antes que workers vejam os registros, ou use ambiente isolado; não confirme em produção para tirar screenshot.

## Finalização

Restaure somente o cenário criado e confira dependências. Interrupção exige revisar resíduos por IDs/registro da execução, não executar DELETE genérico copiado de documentação. Registre as etapas realmente cobertas e o que ficou sem prova.

Falha ao auditar escrita autenticada merece revisar o gatilho e grants de auditoria; não resolva concedendo INSERT livre ao histórico.
