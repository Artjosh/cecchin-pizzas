---
name: ligar-dado
description: Conectar ou revisar dados reais de uma tela, preservando sessão, autorização, componentes compartilhados e persistência.
---

# Ligar dados a uma tela

Leia [arquitetura](../../ARQUITETURA.md) e o [backend](../../../cecchin-pizzas-backend/README.md). Confira o código e o contrato atual antes de chamar uma tela de mock. Montagem e perfis já compartilham componentes entre Banco e Desenho.

## Escolher o caminho

| Necessidade | Caminho atual |
|---|---|
| Leitura inicial autorizada | Server Component → PostgREST com JWT do usuário |
| Interação, paginação ou escrita no browser | Componente → BFF autenticado → PostgREST com JWT do usuário |
| Escrita atômica de domínio | BFF → RPC PostgreSQL existente, chamada com o JWT do usuário |
| Fila, bot, webhooks e retries | Serviços Nest/adaptador |
| Mídia WhatsApp | BFF autoriza a mensagem sob RLS e busca a ponte privada |
| Biblioteca de Marketing | BFF `/api/operacao/marketing/midia` e `/biblioteca`, bucket privado `marketing-conteudos`, filtrado por organização e políticas de acesso |
| Upload genérico de domínio | Não existe contrato genérico; não reutilize o fluxo específico de Marketing sem definir e proteger um contrato próprio |

O acesso PostgREST do servidor está encapsulado em `src/servidor/supabase.ts`: `consultar` e `chamarFuncao` recebem o token da sessão. `consultarComoServico` ignora RLS e hoje é restrito ao fluxo pré-login de pedido de acesso. Não use `service_role` para contornar policy, papel ou vínculo ausente. Uma transação não exige Nest se a RPC já garante suas invariantes. Não reimplemente autorização em React.

## Passos

1. Localize a consulta, rota BFF ou RPC existente. Confira campos, argumentos nomeados, grants, RLS, papel e vínculo com organização; envie no DTO somente os dados usados pela tela.
2. Verifique a regra vigente e decisões posteriores. Consulte histórico apenas junto das respostas e decisões mais recentes; não peça novamente uma decisão já aprovada.
3. Preserve o modo Banco real e o modo Desenho local. Não forneça fallback fictício quando a resposta real falhar ou estiver vazia.
4. Trate loading, vazio, erro e dados incompletos. Não invente foto, coordenada, avaliação ou valor financeiro real.
5. Preserve filtros e seleção entre páginas. Use paginação apropriada ao domínio; o histórico do chat carrega para cima com cursor estável, sem substituir a âncora.
6. Se o contrato do banco mudar, siga [mudar-schema](../../../cecchin-pizzas-backend/skills/mudar-schema/SKILL.md) e [fluxo de migrations](../../../cecchin-pizzas-backend/migracao/README.md). Antes de aplicar, confira projeto e histórico no ambiente-alvo (`supabase migration list --local` ou `--linked`); aplique somente a migration autorizada e confirme o histórico e o catálogo depois. Arquivo versionado não prova que a migration foi aplicada. Nunca use reset ou ETL histórico para atualizar banco operacional.
7. Confira interface e persistência separadamente, dentro dos limites de autorização e do ambiente. Registre o que foi implementado, aplicado e efetivamente verificado; não declare aplicação remota nem sucesso de escrita sem evidência.

## Domínio e privacidade

`valor_cobrado = NULL` não é zero. Ajustes financeiros podem ser negativos. A data do evento segue o fluxo de transferência. Número do dia é rastro textual, não chave. Perfil residencial não pertence à leitura ampla de usuário.

Segredos não entram no cliente; `NEXT_PUBLIC_` é público. Não registre payloads com contatos ou endereços. Confirmação de equipe e Central podem enviar mensagens reais. O modo Desenho não isola globalmente o WhatsApp.

Não execute typecheck nem linter automaticamente neste workspace; só rode se o usuário solicitar explicitamente. Relate testes ou verificações apenas quando realmente executados.
