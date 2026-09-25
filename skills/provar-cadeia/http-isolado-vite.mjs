// Usa a API do Vite para não carregar os .env operacionais pela CLI Vinext.
import { createServer } from "vite";

if (process.env.CECCHIN_HTTP_TEST !== "true" || !/^cecchin_http_test_\d+$/.test(process.env.BANCO_TESTE_HTTP ?? "")) {
  throw new Error("Servidor exclusivo do ambiente HTTP isolado");
}
const server = await createServer({
  root: process.cwd(),
  envDir: false,
  server: { host: "127.0.0.1", port: 3100, strictPort: true },
});
await server.listen();
server.printUrls();
process.on("SIGINT", async () => { await server.close(); process.exit(0); });
process.on("SIGTERM", async () => { await server.close(); process.exit(0); });
