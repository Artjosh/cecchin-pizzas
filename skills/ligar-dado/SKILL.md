---
name: ligar-dado
description: Conectar ou revisar dados reais de uma tela, preservando sessão, autorização, componentes compartilhados e persistência.
---

# Ligar dado numa tela

Leia [arquitetura](../../ARQUITETURA.md) e o [backend](../../../cecchin-pizzas-backend/README.md). Confira o código antes de chamar uma tela de mock: montagem/perfis já compartilham componentes em Banco e Desenho.

## Escolher o caminho

| Necessidade | Caminho atual |
|---|---|
| Leitura inicial autorizada | Server Component → PostgREST com JWT |
| Interação/paginação no browser | Componente → BFF autenticado → PostgREST |
| Escrita atômica de domínio | BFF → RPC PostgreSQL existente |
| Fila, bot, webhooks e retries | Serviços Nest/adaptador |
| Mídia WhatsApp | BFF autoriza mensagem sob RLS e busca ponte privada |
| Upload geral no domínio | Ainda não há contrato genérico; a Biblioteca de Marketing usa o bucket privado `marketing-conteudos` |

Uma transação não exige Nest se a RPC já garante suas invariantes. Não recrie autorização em React nem use service_role para esconder uma policy incorreta.

## Passos

1. Localize consulta/RPC e confira campos, grants e papel. Use dados mínimos no DTO.
2. Verifique regra vigente; consulte perguntas históricas somente com as respostas e decisões posteriores. Não peça novamente uma decisão já aprovada.
3. Preserve modo Banco real e Desenho local, sem fallback fictício na resposta real.
4. Confira migrations no ambiente alvo e derivação do ORM se houve mudança de contrato.
5. Trate vazio, erro, loading e dados incompletos. Não invente foto, coordenada, avaliação ou dinheiro real.
6. Preserve filtros/seleção entre páginas e carregamento apropriado ao domínio; histórico de chat usa cursor ascendente.
7. Verifique interface e persistência separadamente, respeitando restrições da sessão. [Verificar tela](../verificar-tela/SKILL.md).

## Domínio e privacidade

`valor_cobrado` NULL não é zero. Ajustes financeiros podem ser negativos. Data do evento segue fluxo de transferência. Número do dia é rastro textual. Perfil residencial não pertence à leitura ampla de usuário.

Segredos não entram no cliente. `NEXT_PUBLIC_` é público. Não registre payloads com contatos/endereço. Confirmação de equipe e Central podem enviar mensagens reais; Desenho não isola globalmente o WhatsApp.

Atualize o contrato principal afetado e indique o que foi implementado, aplicado e efetivamente conferido.
