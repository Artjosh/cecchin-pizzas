---
name: verificar-tela
description: Inspecionar interface e interações em desktop, tablet e celular usando o ambiente disponível sem interromper processos existentes.
---

# Verificar tela

Build, tipos e HTTP 200 não comprovam layout. Leia [TESTES](../../TESTES.md) e as restrições da sessão. Scripts deste diretório são provas de cenários específicos; alguns geram sessões, alteram fixtures ou fazem chamadas reais.

## Preparar

Prefira o navegador disponível e o servidor já em uso. Não instale dependência nem sobrescreva package.json/lockfile só para tirar screenshot. **Nunca use git checkout nesses arquivos para desfazer sua instalação**, pois pode apagar trabalho de outra pessoa.

O script legado `servidor.sh` faz build, remove saída e encerra processo da porta escolhida. Não é o procedimento padrão e não deve rodar quando build/reinício estão proibidos. Se houver necessidade de ambiente isolado, confirme o alvo e o processo que a tarefa pode controlar.

Não trate 404 em dev como motivo automático para reiniciar. Confira a rota e o estado do grafo conforme [VINEXT](../../VINEXT.md).

## Capturar e interagir

Referências usuais: 1440×900, 834×1112 e 390×844, além do breakpoint relatado pelo usuário. Capture viewport para avaliar header/fixed; use página inteira apenas para verificar conteúdo abaixo.

`captura.mjs` e `capturar-rotas.mjs` são ferramentas existentes; leia suas variáveis e ações antes de usar. `ALVO`, `ROTAS`, `EMAIL`, `SAIDA` e `FONTE` variam por script. No PowerShell, defina variáveis com `$env:...`; não copie sintaxe Bash. Não escreva segredos no histórico do terminal.

`sessao.mjs` usa geração administrativa de link para preparar sessão. Use conta de prova autorizada; nunca exponha o token. **Central WhatsApp permanece real mesmo quando a fonte é mock.**

Além da imagem, confira clique/toque, foco, teclado, busca, paginação, seleção, arraste, scroll e estados vazios conforme o fluxo. Mudanças de RLS/persistência precisam de evidência de banco/API, não apenas screenshots.

## O que observar

- Conteúdo sem corte lateral, header cobrindo títulos ou fixed cobrindo ações.
- Botões alcançáveis e com nomes acessíveis, inclusive quando o texto some no mobile.
- Contagens e estados coerentes com dados; ausência não preenchida por valores fictícios.
- Modais, nomes longos e mapas funcionando nas larguras menores.
- Scroll preservado quando necessário (chat/histórico), e retorno à origem com filtros.
- Drag da superfície do card sem seleção de texto ou conflito com botões.
- Mapa com tiles e canvas visíveis; HTTP 200/ausência de erro não prova WebGL renderizado.

Abra as capturas com a ferramenta de imagem e inspecione. Para WebGL, uma captura remota vazia pode ser limitação do método; confirme no navegador alvo antes de concluir que o mapa funciona ou falha.

## Evidência

Capturas ficam em `capturas/`, ignoradas pelo Git, com dados pessoais mascarados. Registre cenário, modo, viewport, resultado e limitações. Não declare algo verificado apenas porque um arquivo PNG existe.

Relatórios datados: [Banco/Desenho](AUDITORIA_BANCO_2026-09-15.md) e [performance](PERFORMANCE_2026-09-15.md). Não publique dumps RSC com dados de sessão ou clientes.
