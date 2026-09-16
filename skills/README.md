# Instruções para agentes

As instruções reutilizáveis deste repositório ficam em `skills/`, versionadas
ao lado do código. Não use nem recrie `.claude/` para este fim.

| tarefa | instrução |
|---|---|
| ligar uma tela a dados reais | [`ligar-dado`](ligar-dado/SKILL.md) |
| conferir um fluxo completo | [`provar-cadeia`](provar-cadeia/SKILL.md) |
| conferir uma interface renderizada | [`verificar-tela`](verificar-tela/SKILL.md) |

Leia também `../ARQUITETURA.md` antes de alterar autenticação, rotas ou uma
tela ligada ao banco. Ele é o retrato do estado atual; o modo Desenho permite interações demonstrativas. Não presumir que tudo é mock: a Central WhatsApp continua real. Relatórios datados em verificar-tela são evidência histórica, não instruções nem garantia de validação atual.
