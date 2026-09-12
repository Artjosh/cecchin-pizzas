import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// O BFF lê segredos de `process.env`. O Vite só os expõe automaticamente para
// o bundle quando têm NEXT_PUBLIC_, o que seria errado para estas chaves.
// Carregá-los aqui torna a integração igual ao processo iniciado por dev-rede.
Object.assign(process.env, loadEnv("test", process.cwd(), ""));

/**
 * Dois projetos, porque as duas famílias de teste têm custos diferentes.
 *
 * `unidade` roda sem nada de pé: lógica pura, milissegundos, e é o que roda a
 * cada salvamento. `integracao` exige o Supabase e o servidor do BFF no ar, e
 * fala HTTP de verdade — sem mock de `fetch`, sem stub de banco.
 *
 * Não há teste de navegador aqui, de propósito. O que um navegador provaria —
 * que o guarda de rota funciona, que a sessão não vaza para o corpo da
 * resposta — é decidido no servidor e no Postgres, e os dois se medem direto,
 * sem o ruído de subir um Chromium.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unidade",
          include: ["testes/unidade/**/*.test.ts"],
          environment: "node",
        },
        resolve: { alias: { "@": import.meta.dirname } },
      },
      {
        test: {
          name: "integracao",
          include: ["testes/integracao/**/*.test.ts"],
          environment: "node",
          // O fluxo de acesso fala com o GoTrue, com o PostgREST e com o
          // Mailpit. Trinta segundos é folga para o e-mail chegar.
          testTimeout: 30_000,
          hookTimeout: 30_000,
          // As suítes de login compartilham um recurso que não paraleliza: a
          // caixa de e-mail. Duas pedindo acesso ao mesmo tempo leriam o código
          // uma da outra. `singleFork` serializa sem depender de
          // `fileParallelism`, que não existe na configuração de projeto.
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
        },
        resolve: { alias: { "@": import.meta.dirname } },
      },
    ],
  },
});
