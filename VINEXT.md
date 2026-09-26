# Vinext, desenvolvimento e implantação

Revisado em 26/09/2026 contra `package.json`, `package-lock.json`, `vite.config.ts`, `scripts/dev-rede.mjs`, `scripts/copiar-worker-maplibre.mjs`, `src/components/Provedores.tsx` e `app/layout.tsx`. As versões abaixo são as resolvidas no lockfile, não os ranges do manifest: Vinext 0.1.8, Vite 8.3.0, React 19.3.0, `@cloudflare/vite-plugin` 1.54.7 e MapLibre 6.9.1.

## Runtime e comandos

O projeto usa React 19 e App Router via Vinext sobre Vite 8. Imports compatíveis com Next não significam que o servidor usado seja `next dev`. Os comandos reais estão em [package.json](package.json):

- `npm run dev`: executa o script de rede, que inicia `vinext dev` com hostname `0.0.0.0` e porta 3000 por padrão.
- `npm run build`: prepara o worker estático do MapLibre pelo `prebuild` e executa `vinext build`.
- `npm start`: executa `vinext start` e serve o build existente.
- `npm run preview`: faz um novo build e inicia `wrangler dev` localmente.
- `npm run deploy`: faz um novo build e executa `npx @vinext/cloudflare deploy`, que publica no destino configurado. Só use quando a publicação estiver autorizada.

O plugin `cloudflare()` está registrado somente quando `command === "build"`, com ambiente Vite `rsc` e subambiente `ssr`. A configuração documenta que ativá-lo também em desenvolvimento causou 404 generalizado no Vinext 0.1.8, com e sem `rsc()` explícito. Preserve a condição até investigar novamente com a versão instalada. O destino previsto é Cloudflare Workers. `preview` e `deploy` não são comandos apenas de leitura: ambos constroem; `deploy` também publica.

## Desenvolvimento em rede

`npm run dev` usa `scripts/dev-rede.mjs`. O script escolhe o IP privado de uma interface que não pareça virtual, usa `127.0.0.1` como fallback e aceita `APP_URL` para sobrescrever a origem. Aceita `--port N`/`--port=N`, com `3000` como padrão. Se o hostname configurado for um IPv4 literal, o callback de autenticação usa o hostname equivalente `sslip.io`; o processo recebe `APP_URL` e `AUTH_REDIRECT_URL` no ambiente. Isso facilita testar login entre computador e celular, desde que rede, firewall e redirects do GoTrue estejam coerentes. GPS e câmera em outro aparelho exigem HTTPS; o próprio script avisa que o endereço HTTP da rede não concede essas permissões.

O Vite permite os hosts `.sslip.io` e `host.docker.internal`. A opção `CECCHIN_HTTP_TEST=true` separa o cache Vite em `node_modules/.vite-http-test` e desativa a leitura do `.env` pelo Vite, para coexistir com o servidor normal de desenvolvimento.

Reutilize o processo existente quando possível. Não encerre um processo por porta nem reinicie bot/containers para verificar documentação ou layout. Em rota nova com 404, inspecione o grafo e os logs; um incidente antigo não prova que todo 404 exige reinício.

## Fronteira server/client

O layout raiz é Server Component: lê a sessão no servidor e passa apenas o usuário para `Provedores`, a fronteira client que contém os contextos. Páginas que leem sessão/cookies devem seguir o padrão dinâmico já usado nas rotas protegidas. Hooks, eventos e canvas ficam em componentes client. Um Server Component pode renderizar um componente client; código de servidor não deve executar uma função exportada por módulo marcado com `"use client"`.

Variáveis públicas seguem `NEXT_PUBLIC_` e `process.env`. Segredos ficam no ambiente server, sem prefixo público. Não importe `src/servidor/` no cliente nem registre cookies/payloads privados.

## MapLibre

O renderer é carregado no navegador; importar o renderer durante SSR já causou `window is not defined`. `vite.config.ts` exclui `maplibre-gl` de `optimizeDeps` e inclui o pacote em `ssr.noExternal` para que o Vite processe o worker ESM.

O hook `predev`/`prebuild` roda `scripts/copiar-worker-maplibre.mjs`, que copia `maplibre-gl-worker.mjs` e `maplibre-gl-shared.mjs` de `maplibre-gl/dist` para `public/maplibre`. Ao atualizar MapLibre, confira renderer, worker e caminho servido em conjunto. Um mapa que recebe HTTP 200 mas não tem tiles/worker não está validado.

## Cache de desenvolvimento e RSC

`vite.config.ts` envia `Cache-Control: no-store, max-age=0` nos recursos servidos pelo Vite. `src/components/Provedores.tsx` também instala, no navegador, recuperação de uma única recarga por sessão para erros de dependência Vite obsoleta, import dinâmico falho ou worker MapLibre; a chave é limpa ao encerrar a sessão do navegador. Isso não substitui investigar erros persistentes.

RSC de desenvolvimento inclui metadados, referências e stacks. Conte linhas apenas como diagnóstico auxiliar. Meça bytes, TTFB, tempo total, consultas, render/hidratação e arraste. Build de produção deve ser medido separadamente, quando autorizado; não prometa um ganho percentual sem execução.

O projeto reduziu árvores repetitivas usando DTOs e componentes client de tabela, além de paginação e memoização. Fazer dez requests sequenciais para substituir uma resposta pode somar latência; não é uma otimização automática.

## Antes de publicar

Confirme configurações e segredos do ambiente alvo, migrations, URLs de callback e acesso aos serviços. Só execute deploy quando autorizado. A presença de `wrangler` ou de um remoto Git não prova que esta revisão está em produção. Validações e seus efeitos estão em [TESTES](TESTES.md); não execute comandos proibidos pelo usuário.
