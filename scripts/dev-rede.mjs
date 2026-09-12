import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

function ipDaRedeLocal() {
  const redes = Object.values(networkInterfaces()).flat().filter(Boolean);
  const ipv4 = redes.find(
    (rede) =>
      rede.family === "IPv4" &&
      !rede.internal &&
      (rede.address.startsWith("192.168.") ||
        rede.address.startsWith("10.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(rede.address)),
  );
  return ipv4?.address ?? "127.0.0.1";
}

const argumentos = process.argv.slice(2);
const indicePorta = argumentos.findIndex((argumento) => argumento === "--port");
const portaBruta =
  (indicePorta >= 0 && argumentos[indicePorta + 1]) ||
  argumentos.find((argumento) => argumento.startsWith("--port="))?.slice(7) ||
  "3000";
if (!/^\d{2,5}$/.test(portaBruta)) {
  throw new Error("A porta deve conter apenas dígitos.");
}
const porta = portaBruta;
const appUrl = process.env.APP_URL || `http://${ipDaRedeLocal()}:${porta}`;
const hostDaRede = new URL(appUrl).hostname;
const hostDeCallback = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostDaRede)
  ? `${hostDaRede.replaceAll(".", "-")}.sslip.io`
  : hostDaRede;
const authRedirectUrl = `http://${hostDeCallback}:${porta}`;
const cliVinext = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));

console.log(`Cecchin Pizzas na rede: ${appUrl}`);
console.log(`Callback de acesso: ${authRedirectUrl}`);
console.log("O Supabase local aceita os redirecionamentos privados de desenvolvimento.");

const processo = spawn(process.execPath, ["--env-file=.env", cliVinext, "dev", "--hostname", "0.0.0.0", "--port", porta], {
  env: { ...process.env, APP_URL: appUrl, AUTH_REDIRECT_URL: authRedirectUrl },
  stdio: "inherit",
});

processo.on("exit", (codigo) => process.exit(codigo ?? 1));
