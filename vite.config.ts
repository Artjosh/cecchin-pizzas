import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import vinext from "vinext";

/*
 * O plugin do Cloudflare entra SÓ no build.
 *
 * Com ele registrado durante `vinext dev`, toda rota responde 404 — inclusive
 * a raiz — e o log não mostra erro nenhum, só `GET / 404`. O build de produção
 * continua passando, então o sintoma aparece apenas em desenvolvimento.
 *
 * Testado no vinext 0.1.8 com as duas formas documentadas: com `rsc()`
 * explícito (as três entradas virtuais) e sem. As duas dão 404 em dev.
 *
 * Como `vinext deploy` e `wrangler dev` consomem a saída do BUILD, o deploy em
 * Workers não perde nada. O que se perde é acesso a bindings
 * (`cloudflare:workers`) durante o dev — este projeto ainda não usa nenhum.
 * Quando usar, o caminho é `npm run preview`, que builda e sobe o workerd.
 */
export default defineConfig(({ command }) => {
  const paraWorkers = command === "build";

  return {
    plugins: [
      vinext(),
      ...(paraWorkers
        ? [cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } })]
        : []),
      tailwindcss(),
    ],
    resolve: {
      // import.meta.dirname, não __dirname: o configLoader nativo do Vite 8
      // avisa que __dirname deixará de ser suportado.
      alias: { "@": import.meta.dirname },
    },
    /*
     * MapLibre 6 entrega o renderer e o worker como módulos ESM separados.
     * O otimizador do Vite 8 tenta pré-empacotar o worker e aponta o navegador
     * para um arquivo inexistente em `node_modules/.vite/deps`. Deixar esta
     * dependência fora da pré-otimização preserva o worker original.
     */
    optimizeDeps: {
      exclude: ["maplibre-gl"],
    },
    server: {
      // O callback local usa `192-168-x-x.sslip.io`, hostname que resolve para
      // o IP Wi-Fi atual e evita a restrição do GoTrue a IPv4 literal.
      allowedHosts: [".sslip.io"],
      /*
       * Os módulos de desenvolvimento mudam quando Vite reconstrói as
       * dependências. Sem isto, uma aba aberta pode pedir o arquivo da execução
       * anterior e receber 504, impedindo a hidratação de toda a página.
       */
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  };
});
