/* Captura uma rota local pública sem criar sessão nem acionar e-mail. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const alvo = process.env.ALVO ?? "http://localhost:3210";
const rota = process.env.ROTA ?? "/cliente/contratar";
const saida = process.env.SAIDA ?? "skills/verificar-tela/capturas/local";
mkdirSync(saida, { recursive: true });

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await pagina.goto(alvo + rota, { waitUntil: "domcontentloaded", timeout: 15000 });
await pagina.waitForTimeout(1600);
await pagina.screenshot({ path: `${saida}/tela.png`, fullPage: false });
await navegador.close();
console.log(`${saida}/tela.png`);
