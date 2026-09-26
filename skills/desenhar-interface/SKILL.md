---
name: desenhar-interface
description: Projetar ou revisar telas operacionais do Cecchin Pizzas com hierarquia, densidade, navegação e estados reais antes de codificar.
---

# Desenhar interface

Use esta skill em mudanças relevantes de layout ou fluxo visual. Antes de implementar, leia `CLAUDE.md` e os componentes próximos da tela para encontrar os padrões usados no próprio produto. Depois de implementar, siga `skills/verificar-tela/SKILL.md`, respeitando as restrições da sessão e do usuário.

## Planejar o layout

1. Identifique a tarefa principal, o contexto necessário e as ações que precisam ficar visíveis. Organize contexto, navegação, conteúdo e ação pela ordem de uso.
2. Considere a altura e a largura reais do viewport alvo. Em telas compactas, agrupe informações relacionadas na mesma faixa quando couberem, reduza espaçamento com critério e evite repetir contexto em banners ou cabeçalhos. Não esconda opções essenciais só para reduzir a tela.
3. Faça contagens e navegação representarem todos os dados disponíveis. Se a seleção precisa exibir sete dias, todos os sete devem continuar alcançáveis e visíveis na largura alvo; confira corte, largura mínima e rolagem horizontal.
4. Para vários registros associados a uma seleção, escolha uma apresentação adequada à densidade: lista com rolagem interna, paginação ou carrossel. Um carrossel deve manter seus controles e posição junto ao cabeçalho do conteúdo, sem criar uma faixa que aumente desnecessariamente a altura.
5. Tarefas distintas da mesma entidade podem usar abas ou painéis próximos. Na montagem de evento, equipe e carro/saída são tarefas irmãs e devem ser alcançáveis sem percorrer listas longas.

## Aplicar o sistema visual

6. Reutilize tokens, componentes, ícones e padrões já presentes no projeto. As telas usam Tailwind com tokens semânticos de superfície, texto e estado; prefira-os a cores fixas e estilos isolados. A tipografia do projeto usa pares como `font-label-md text-label-md`; consulte `src/lib/utils.ts` quando combinar classes.
7. Dê a cada região uma prioridade visual clara. Cards devem expor título, informação decisiva, estado e ação; deixe metadados discretos e detalhes secundários sob demanda. Evite contornos, cartões ou seções extras sem função de navegação ou leitura.
8. Garanta rótulos acessíveis para ícones e controles compactos. Uma dica que explica um botão deve estar dentro ou diretamente associada ao próprio botão e funcionar também com foco por teclado/toque, não depender apenas de hover.
9. Projete estados de carregamento, vazio, erro, sucesso, bloqueio e responsividade. A ação principal deve continuar alcançável; quando indisponível, explique o motivo perto dela.

## Verificar

10. Inspecione a tela no navegador e use as larguras de `skills/verificar-tela/SKILL.md`, além do viewport relatado. Verifique clique/toque, teclado, foco, rolagem, mudança de estado e conteúdo longo. Para layouts dependentes de densidade, examine dados vazios, um item e vários itens, sem criar dados reais para a validação.
11. Compare o resultado renderizado com o pedido e as capturas de referência: alinhamento, quantidade de linhas, elementos visíveis, cortes e rolagem. Corrija o que aparece na tela; a leitura do JSX sozinha não valida o layout.
12. Não execute typecheck, linter, testes, build ou reinícios automaticamente quando a sessão ou as instruções do usuário os proibirem. Registre com clareza quais verificações visuais foram feitas e quais não puderam ser exercitadas com os dados disponíveis.

Referência complementar de composição: [frontend-design da Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md). Adapte ideias ao sistema visual e aos fluxos reais do produto; não substitua os tokens existentes por uma linguagem visual paralela.
