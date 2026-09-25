/**
 * A cadeia operacional inteira, de ponta a ponta.
 *
 *   conta nova  ->  vira staff
 *   staff       ->  ligado a um responsável   (/api/operacao/responsavel)
 *   responsável ->  recebe um evento futuro   (/api/operacao/evento)
 *   evento      ->  aparece em Minha rota     (tela, olhada em PNG)
 *
 * Cada elo tem teste próprio em `testes/integracao/`. O que falta lá é a
 * cadeia junta — e foi nela que o produto quebrou duas vezes. Ver SKILL.md.
 *
 * **Altera o banco de desenvolvimento e desfaz tudo no fim**, inclusive
 * devolvendo o evento ao responsável que tinha antes. A reversão roda no
 * `finally`: uma prova que falha no meio não pode deixar um evento alocado
 * para alguém que não existe mais.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { cookiesDeSessao } from "../verificar-tela/sessao.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));

const ALVO = process.env.ALVO ?? "http://localhost:3210";
const ADMIN = process.env.ADMIN ?? "arthur.heleus.thade@gmail.com";
const SAIDA = process.env.SAIDA ?? resolve(AQUI, "../verificar-tela/capturas");
const CONTAINER = process.env.CONTAINER_DB ?? "supabase_db_Nicolas";
const DOMINIO_ALVO = new URL(ALVO).hostname;

const TELAS = [
  { nome: "desktop", width: 1440, height: 900 },
  { nome: "celular", width: 390, height: 844 },
];

/**
 * `with ... select` em todo INSERT que devolve id: `psql -tAc` imprime o valor
 * E a etiqueta do comando (`INSERT 0 1`) na linha seguinte, e o id chega com
 * lixo colado. Já custou um 403 que parecia permissão e era string malformada.
 */
function sql(comando) {
  return execFileSync(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-tAc", comando],
    { encoding: "utf8" },
  ).trim();
}

const marca = Date.now().toString(36);
const emailStaff = `prova.cadeia.${marca}@cecchin.test`;

let evento = "";
let responsavelAntes = "";
let responsavel = "";
let falhou = false;

mkdirSync(SAIDA, { recursive: true });

try {
  // ---------------------------------------------------------------- elo 1
  const ckStaff = await cookiesDeSessao(ALVO, emailStaff, "real", DOMINIO_ALVO);
  sql(`update usuario set papel = 'staff' where email = '${emailStaff}'`);
  const idStaff = sql(`select id from usuario where email = '${emailStaff}'`);
  console.log(`conta ${emailStaff} criada como staff`);

  // ---------------------------------------------------------------- elo 2
  responsavel = sql(
    `with novo as (
       insert into responsavel (organizacao_id, slug, nome)
       values (app.org_padrao(), 'prova-cadeia-${marca}', 'Prova Cadeia ${marca}')
       returning id
     ) select id from novo`,
  );

  evento = sql(
    `select id from evento
      where data_evento >= current_date and status = 'confirmado'
      order by data_evento asc limit 1`,
  );

  if (!evento) throw new Error("nenhum evento futuro confirmado no banco");

  responsavelAntes = sql(
    `select coalesce(responsavel_id::text, '') from evento where id = '${evento}'`,
  );

  const ckAdmin = await cookiesDeSessao(ALVO, ADMIN, "real", DOMINIO_ALVO);
  const cabecalho = (ck) => ck.map((c) => `${c.name}=${c.value}`).join("; ");

  const ligar = await fetch(`${ALVO}/api/operacao/responsavel`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: cabecalho(ckAdmin) },
    body: JSON.stringify({ responsavel, usuario: idStaff }),
  });
  console.log("ligar:", ligar.status, await ligar.text());
  if (!ligar.ok) throw new Error("a ligação conta-responsável foi recusada");

  // ---------------------------------------------------------------- elo 3
  const alocar = await fetch(`${ALVO}/api/operacao/evento`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: cabecalho(ckAdmin) },
    body: JSON.stringify({ evento, responsavel }),
  });
  console.log("alocar:", alocar.status, await alocar.text());
  if (!alocar.ok) throw new Error("a alocação do evento foi recusada");

  // ---------------------------------------------------------------- elo 4
  const navegador = await chromium.launch();

  for (const tela of TELAS) {
    const ctx = await navegador.newContext({
      viewport: { width: tela.width, height: tela.height },
      deviceScaleFactor: 2,
      locale: "pt-BR",
    });
    await ctx.addCookies(ckStaff);

    const pag = await ctx.newPage();
    pag.on("pageerror", (e) => console.error(`[${tela.nome}] ${e.message}`));

    await pag.goto(`${ALVO}/operacional/minha-rota`, { waitUntil: "networkidle" });
    await pag.screenshot({ path: `${SAIDA}/cadeia-minha-rota-${tela.nome}.png` });

    // O que se quer provar é que a rota NÃO está vazia. Sem esta conferência o
    // script terminaria feliz com uma tela dizendo "nenhum evento".
    const vazia = await pag
      .getByText(/nenhum evento|ainda não está ligada/i)
      .count();
    if (vazia > 0) {
      falhou = true;
      console.error(`[${tela.nome}] Minha rota abriu VAZIA — a cadeia não fechou`);
    }

    await ctx.close();
  }

  await navegador.close();
} catch (erro) {
  falhou = true;
  console.error("prova interrompida:", erro.message);
} finally {
  // ------------------------------------------------------------- reversão
  if (evento) {
    sql(
      responsavelAntes
        ? `update evento set responsavel_id = '${responsavelAntes}' where id = '${evento}'`
        : `update evento set responsavel_id = null where id = '${evento}'`,
    );
  }
  if (responsavel) sql(`delete from responsavel where id = '${responsavel}'`);
  sql(`delete from pedido_login where email = '${emailStaff}'`);
  sql(`delete from auth.users where email = '${emailStaff}'`);

  console.log(
    `revertido: evento volta a ${responsavelAntes || "sem responsável"}; conta de teste apagada`,
  );
}

if (falhou) {
  console.error("CADEIA QUEBRADA");
  process.exit(1);
}

console.log(`cadeia fechada — abra os PNG em ${SAIDA}/ antes de concluir`);
