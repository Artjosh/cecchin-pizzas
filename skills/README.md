# Instruções para agentes

As instruções reutilizáveis deste repositório ficam em `skills/`, versionadas
ao lado do código. Não use nem recrie `.claude/` para este fim.

| tarefa | instrução |
|---|---|
| ligar uma tela a dados reais | [`ligar-dado`](ligar-dado/SKILL.md) |
| conferir uma interface renderizada | [`verificar-tela`](verificar-tela/SKILL.md) |

Leia também `../ARQUITETURA.md` antes de alterar autenticação, rotas ou uma
tela ligada ao banco. Ele é o retrato do estado atual; os desenhos em
`src/views/desenho/` são apenas referência visual.
