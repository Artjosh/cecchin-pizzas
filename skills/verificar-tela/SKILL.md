---
name: verificar-tela
description: Inspecionar interface e interações em desktop, tablet e celular com o navegador disponível, preservando sessão, processos e dados existentes.
---

# Verificar tela

Uma captura, build ou resposta HTTP 200 não comprova que a interface está correta. Confira a página renderizada e as interações relevantes nos tamanhos afetados. Leia [TESTES](../../TESTES.md), as instruções locais e as restrições da sessão antes de escolher qualquer verificação.

## Preparação

1. Prefira a aba já aberta e o servidor em uso. Preserve a sessão, os filtros e o estado inicial do usuário; não abra serviços externos ou contas sociais sem pedido explícito.
2. Leia o código da tela e os dados/estados que ela usa. Para mudanças de layout, consulte também [desenhar-interface](../desenhar-interface/SKILL.md).
3. Não instale dependências, altere manifests, carregue dados fictícios no banco, nem reinicie ou encerre serviços só para obter uma captura.
4. Nunca execute typecheck ou linter automaticamente neste workspace. Comandos compostos que os invoquem também exigem pedido explícito. Testes, build e scripts com efeitos seguem [TESTES](../../TESTES.md) e as instruções do usuário; uma tarefa visual não os autoriza por si só.

Use a automação de navegador disponível para redimensionar a aba existente e inspecionar o DOM/acessibilidade quando útil. Se ela não estiver disponível, o Playwright local está instalado. Não presuma que um navegador novo herda a sessão autenticada. Não exponha cookies, tokens, payloads autenticados ou dados pessoais em logs, capturas ou respostas.

## Capturar e interagir

Confira os viewports pertinentes ao pedido. Referências úteis: 1440×900, 834×1112 e 390×844; inclua o breakpoint indicado pelo usuário. Prefira captura da viewport para avaliar conteúdo fixo e a dobra. Use captura da página inteira só para conferir conteúdo abaixo da dobra.

Após a inspeção visual, teste as ações afetadas por clique/toque, foco e teclado. Confira estados de carregamento, vazio, erro e conteúdo, seleção, navegação, paginação e rolagem quando fizerem parte do fluxo. Verifique que ações importantes continuam visíveis e alcançáveis em mobile. Para alterações de persistência ou autorização, uma captura não basta: obtenha evidência apropriada da API/banco sem produzir escritas reais não autorizadas.

## Scripts existentes

Os scripts desta pasta são provas específicas, não um runner genérico de screenshots. Leia o script e identifique rotas, autenticação, seletores, fixtures e chamadas de escrita antes de executá-lo:

- `captura.mjs` percorre um fluxo antigo e específico de contratação e mapa; não o use para uma captura genérica nem contra dados operacionais sem autorização para aquele fluxo.
- `capturar-rotas.mjs` percorre rotas em três viewports. Se `EMAIL` for definido, `sessao.mjs` gera uma sessão local via credencial administrativa do Supabase. Use apenas ambiente e conta de prova autorizados; não imprima chaves nem tokens. `FONTE=mock` não torna toda a interface mock: a Central WhatsApp permanece real.
- Outros arquivos `.mjs` podem consultar serviços, criar fixtures ou realizar ações reais. Inspecione-os e siga os limites descritos em [TESTES](../../TESTES.md).
- `servidor.sh` é legado e destrutivo: encerra o processo que escuta na porta escolhida, remove `dist/`, roda build e carrega `.env`. Não o use para verificar uma tela ou substituir o servidor existente.

Ao configurar scripts no PowerShell, use `$env:NOME`; instruções Bash não são intercambiáveis. Nunca passe segredos na linha de comando ou os grave no histórico do terminal.

## O que observar

- Conteúdo sem corte lateral; cabeçalhos fixos sem cobrir títulos ou ações.
- Ações visíveis e acessíveis, com nome útil inclusive quando o rótulo visual some no mobile.
- Hierarquia, espaçamento e densidade coerentes; rolagem apenas onde o desenho e o conteúdo pedem.
- Contagens e estados coerentes com os dados; não preencher ausências com valores fictícios.
- Modais, nomes longos e mapas utilizáveis em larguras menores.
- Retorno à origem preservando filtros; rolagem de conversas/histórico sem saltos inesperados.
- Arraste sem seleção de texto nem conflito com controles clicáveis.
- Mapa com tiles e canvas efetivamente visíveis. HTTP 200 ou ausência de erro não prova que WebGL renderizou.

Para mapas, uma captura remota vazia pode ser limitação do método; confirme no navegador alvo antes de concluir que o mapa funciona ou falha.

## Evidência

Se salvar capturas, use `skills/verificar-tela/capturas/`, ignorada pelo Git, e remova ou mascare qualquer dado pessoal antes de compartilhar. Abra e inspecione as imagens; a existência de um PNG não é evidência de que foi validado.

Ao relatar o resultado, informe tela, estado, viewport, interações verificadas e limitações. Distinga inspeção visual de testes automatizados. Não publique dumps RSC, cookies, tokens ou payloads de clientes.
