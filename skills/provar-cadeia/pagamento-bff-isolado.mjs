// BFF habilitado somente na base isolada; nenhum worker/provedor é iniciado.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
const env = JSON.parse(readFileSync(".env.http-test.json", "utf8"));
if (env.CECCHIN_HTTP_TEST !== "true" || !/^cecchin_http_test_[a-z0-9_]+$/.test(env.BANCO_TESTE_HTTP ?? "")) throw Error("Exige base HTTP isolada");
Object.assign(process.env, env, { INFINITEPAY_ENABLED: "true", ALVO_BFF: "http://localhost:3101", APP_URL: "http://localhost:3101", TESTE_PAGAMENTO_HABILITADO: "true" });
const { createServer } = await import("vite");
const server = await createServer({ root: process.cwd(), cacheDir: "node_modules/.vite-pagamento-isolado", envDir: false, server: { host: "127.0.0.1", port: 3101, strictPort: true } });
try {
  await server.listen();
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--project", "integracao", "testes/integracao/reserva-paga-bff.test.ts"], { env: process.env, stdio: "inherit" });
    child.on("error", reject); child.on("exit", resolve);
  });
  process.exitCode = code ?? 1;
} finally { await server.close(); }
