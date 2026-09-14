/**
 * Varre várias rotas nos três breakpoints, já autenticado.
 *
 * `captura.mjs` é para UM fluxo com muitos passos (a contratação). Este é para
 * MUITAS telas com um passo: depois de mexer em layout, cabeçalho, barra
 * lateral ou espaçamento, o defeito aparece em telas que não são a que você
 * editou.
 *
 * Uso:
 *   set -a; . ./.env; set +a
 *   bash skills/verificar-tela/servidor.sh 3210
 *   ALVO=http://localhost:3210 \
 *   EMAIL=alguem@dominio.com \
 *   ROTAS=/operacional/despacho,/admin/catalogo \
 *   SAIDA=capturas \
 *   node skills/verificar-tela/capturar-rotas.mjs
 *
 * Depois, ABRA CADA PNG com a ferramenta Read. `ls` confirmando que o arquivo
 * existe não é verificação.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { cookiesDeSessao } from "./sessao.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

const ALVO = process.env.ALVO ?? "http://localhost:3210";
/*
 * As capturas ficam DENTRO da skill, não numa pasta de scratch fora do
 * repositório: quem abrir esta pasta amanhã encontra a ferramenta e a última
 * conferência juntas. `skills/verificar-tela/capturas/` está no `.gitignore`.
 */
const SAIDA = process.env.SAIDA ?? resolve(AQUI, "capturas");
const EMAIL = process.env.EMAIL ?? "";
const FONTE = process.env.FONTE ?? "real";
const INTEIRA = process.env.INTEIRA === "1";

/*
 * A barra inicial é opcional, e no Git Bash é melhor omiti-la: o MSYS converte
 * qualquer valor de variável que comece com `/` em caminho do Windows, e
 * `ROTAS=/admin/catalogo` chega ao Node como
 * `C:/Program Files/Git/admin/catalogo`. `ROTAS=admin/catalogo` passa intacto.
 */
const ROTAS = (process.env.ROTAS ?? "operacional/despacho")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean)
  .map((r) => (r.startsWith("/") ? r : "/" + r));

const TELAS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "tablet", width: 834, height: 1112 },
  { nome: "celular", width: 390, height: 844 },
];

mkdirSync(SAIDA, { recursive: true });

// Playwright exige que o domínio do cookie coincida com o host de ALVO. Não
// suponha `localhost`: uma instância isolada pode usar 127.0.0.1.
const sessao = EMAIL
  ? await cookiesDeSessao(ALVO, EMAIL, FONTE, new URL(ALVO).hostname)
  : [];

const navegador = await chromium.launch();

for (const tela of TELAS) {
  const ctx = await navegador.newContext({
    viewport: { width: tela.width, height: tela.height },
    deviceScaleFactor: 2,
    locale: "pt-BR",
  });

  if (sessao.length) await ctx.addCookies(sessao);

  const pag = await ctx.newPage();

  // Falha alto: erro de console vira defeito silencioso na imagem.
  pag.on("pageerror", (e) => console.error(`[${tela.nome}] ${e.message}`));

  for (const rota of ROTAS) {
    const apelido = rota.replace(/^\//, "").replace(/\//g, "-") || "raiz";
    /*
     * Mapa vetorial mantém downloads de tiles enquanto a câmera se ajusta.
     * `networkidle` nunca chega nessa situação, embora o DOM já esteja pronto
     * para inspeção. Uma pequena espera de pintura preserva a captura e não
     * bloqueia a ferramenta em mapas.
     */
    await pag.goto(ALVO + rota, { waitUntil: "domcontentloaded" });
    await pag.waitForTimeout(900);

    /*
     * `fullPage` fica de fora por padrão. A verificação que importa é a do que
     * cabe na dobra: elemento escondido atrás do cabeçalho `fixed` e botão
     * coberto por `fixed` só aparecem no recorte da viewport — numa captura de
     * página inteira o navegador desenha tudo empilhado e o defeito some.
     */
    await pag.screenshot({
      path: `${SAIDA}/${apelido}-${tela.nome}.png`,
      fullPage: INTEIRA,
    });

    // Rolagem horizontal no corpo é defeito, não estilo. Só tabela, diagrama e
    // bloco de código podem rolar, cada um no próprio contêiner.
    const largura = await pag.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (largura > 1) {
      console.error(
        `[${tela.nome}] ${rota} rola ${largura}px na horizontal`,
      );
    }
  }

  await ctx.close();
}

await navegador.close();
console.log(`capturas em ${SAIDA}/ — abra cada PNG antes de concluir`);
