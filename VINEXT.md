# Vinext, desenvolvimento e implantação

Revisado em 16/09/2026 a partir de `package.json`, `vite.config.ts`, `scripts/dev-rede.mjs` e dos componentes de mapas. Versões exatas vêm do lockfile; ranges do manifest não são versões travadas.

## Runtime deste projeto

React 19 e App Router via Vinext sobre Vite 8. Imports compatíveis com Next não significam que o servidor usado é `next dev`. Scripts de build/start/deploy estão em [README](README.md).

O plugin `cloudflare()` é ativado apenas quando `command === "build"`. O projeto registrou 404 generalizado ao ligá-lo em dev; preserve essa condição até investigar com a versão instalada. O destino configurado é Workers. `npm run preview` faz build e usa Wrangler; não é um comando neutro de leitura.

## Desenvolvimento em rede

`npm run dev` usa `scripts/dev-rede.mjs`, escuta em `0.0.0.0` e escolhe o IP privado preferindo interface física. `APP_URL` pode sobrescrever a origem; callback de IP literal é convertido para hostname `sslip.io`. Isso permite login entre computador e celular, desde que rede, firewall e redirects do GoTrue estejam coerentes.

Reutilize o processo existente quando possível. Não encerre um processo por porta nem reinicie bot/containers para verificar documentação ou layout. Em rota nova com 404, inspecione o grafo e os logs; um incidente antigo não prova que todo 404 exige reinício.

## Fronteira server/client

Páginas protegidas leem sessão e autorizam no servidor; marque como dinâmicas conforme o padrão das rotas autenticadas. Hooks, eventos e canvas ficam em componentes client. É válido renderizar um componente client a partir de um Server Component. Não execute no servidor uma função exportada de módulo `"use client"`.

Variáveis públicas seguem `NEXT_PUBLIC_` e `process.env`. Segredos ficam no ambiente server, sem prefixo público. Não importe `src/servidor/` no cliente nem registre cookies/payloads privados.

## MapLibre

O renderer é carregado no navegador; importar o renderer durante SSR já causou `window is not defined`. `optimizeDeps.exclude` e `ssr.noExternal` têm configuração específica para MapLibre no Vite.

`scripts/copiar-worker-maplibre.mjs` prepara o worker estático nos hooks predev/prebuild. Ao atualizar MapLibre, confira renderer, worker e caminho servido em conjunto. Um mapa que recebe HTTP 200 mas não tem tiles/worker não está validado.

## Cache de desenvolvimento e RSC

Módulos dev usam `Cache-Control: no-store`; existe tratamento para módulo obsoleto. Não confunda URLs de módulos Vite ou `_rsc` com endpoints de negócio novos.

RSC de desenvolvimento inclui metadados, referências e stacks. Conte linhas apenas como diagnóstico auxiliar. Meça bytes, TTFB, tempo total, consultas, render/hidratação e arraste. Build de produção deve ser medido separadamente, quando autorizado; não prometa um ganho percentual sem execução.

O projeto reduziu árvores repetitivas usando DTOs e componentes client de tabela, além de paginação e memoização. Fazer dez requests sequenciais para substituir uma resposta pode somar latência; não é uma otimização automática.

## Antes de publicar

Confirme configurações e segredos do ambiente alvo, migrations, URLs de callback e acesso aos serviços. Só execute deploy quando autorizado. A presença de `wrangler` ou de um remoto Git não prova que esta revisão está em produção. Validação: [TESTES](TESTES.md).
