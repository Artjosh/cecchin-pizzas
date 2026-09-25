---
name: desenhar-interface
description: Projetar ou revisar telas operacionais do Cecchin Pizzas com hierarquia, densidade, navegação e estados reais antes de codificar.
---

# Desenhar interface

Use esta skill em qualquer alteração relevante de layout ou fluxo visual. Leia também `CLAUDE.md` e, depois de implementar, `skills/verificar-tela/SKILL.md`.

1. Identifique a tarefa principal da tela e as ações que precisam ficar visíveis sem rolar. Desenhe primeiro a hierarquia: contexto, navegação entre tarefas, conteúdo, ação.
2. Trabalhos distintos dentro da mesma entidade pedem abas ou painel lateral. Não acrescente uma nova seção depois de listas longas. Na montagem de evento, equipe e carro/saída são tarefas irmãs; ambas devem ser alcançadas no topo.
3. Reserve a altura disponível para o conteúdo. Listas extensas rolam dentro de seus painéis; controles e troca de abas permanecem acessíveis. Revise a tela com 0, 1, 10 e 60 registros.
4. Use os tokens e componentes do projeto. Cards devem ter título, dado decisivo, estado e ação claros, com dimensões e espaçamento coerentes. Escolha uma ênfase principal por região; metadados ficam discretos e detalhes podem ser abertos sob demanda.
5. Projete também carregamento, vazio, erro, sucesso, bloqueio e responsividade. A ação principal nunca deve desaparecer sem explicar o motivo. O layout mobile pode trocar colunas por abas, mantendo a tarefa principal acessível.
6. Verifique interações reais no navegador: clique, teclado, foco, rolagem, mudanças de estado e dados longos. Compare desktop e celular. Corrija o que a captura mostrar, não apenas o JSX.

Referência adicional para direção visual: [frontend-design da Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md). Adapte ao sistema existente; mantenha os tokens, a linguagem e os fluxos reais deste projeto.
