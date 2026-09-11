/**
 * Captura a interface nos três breakpoints e salva PNG por momento do fluxo.
 *
 * Uso:  ALVO=http://localhost:3000 node .claude/skills/verificar-tela/captura.mjs
 *
 * O trecho marcado FLUXO é o único que muda de tela para tela. Os breakpoints
 * não mudam.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.ALVO ?? "http://localhost:3000";
const ROTA = process.env.ROTA ?? "/cliente/contratar";
const SAIDA = process.env.SAIDA ?? "capturas";

const TELAS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "tablet", width: 834, height: 1112 },
  { nome: "mobile", width: 390, height: 844 },
];

mkdirSync(SAIDA, { recursive: true });
const navegador = await chromium.launch();

for (const tela of TELAS) {
  const ctx = await navegador.newContext({
    viewport: { width: tela.width, height: tela.height },
    deviceScaleFactor: 2,
    locale: "pt-BR",
  });
  const pag = await ctx.newPage();

  // Falha alto: erro de console vira defeito silencioso na imagem.
  pag.on("pageerror", (e) => console.error(`[${tela.nome}] ${e.message}`));

  await pag.goto(BASE + ROTA, { waitUntil: "networkidle" });
  await pag.waitForTimeout(600);
  await pag.screenshot({ path: `${SAIDA}/${tela.nome}-1-inicial.png` });

  // ---------------------------------------------------------------- FLUXO
  // Adapte daqui para baixo à tela que está verificando.
  // Prefira getByLabel e getByRole: se o seletor não acha o elemento, o
  // problema costuma ser falta de nome acessível, não o seletor.

  await pag.getByLabel("Ver mapa").click();
  await pag.waitForTimeout(400);
  await pag.screenshot({ path: `${SAIDA}/${tela.nome}-2-fundo.png` });

  await pag.getByLabel("Retomar reserva").click();
  await pag.waitForTimeout(400);
  await pag.getByRole("button", { name: "Moinhos de Vento, POA" }).click();
  await pag.getByRole("button", { name: "Casa Térrea" }).click();
  await pag.fill("#data-evento", "2026-12-20");
  await pag.fill("#hora-evento", "20:00");
  await pag.getByRole("button", { name: "Aniversário" }).click();
  await pag.waitForTimeout(300);
  await pag.screenshot({ path: `${SAIDA}/${tela.nome}-3-preenchido.png` });

  for (let i = 0; i < 3; i += 1) {
    await pag.getByRole("button", { name: /^Avançar/ }).click();
    await pag.waitForTimeout(350);
  }
  await pag.screenshot({ path: `${SAIDA}/${tela.nome}-4-final.png` });
  // ------------------------------------------------------------ FIM FLUXO

  await ctx.close();
}

await navegador.close();
console.log(`capturas em ${SAIDA}/ — abra cada PNG antes de concluir`);
