import { afterAll, describe, expect, it } from "vitest";

import { Aparelho, apagarContas, emailDeTeste, entrar, sql } from "./ajuda";

/**
 * Toda tela responde, nos dois modos de fonte.
 *
 * Um teste raso de propósito: não afirma conteúdo, afirma que **nenhuma rota
 * quebra**. É o que pega o erro mais comum ao ligar tela em banco — uma coluna
 * que não existe, um join que a RLS recusa, um `select=*` sobre view com nome
 * repetido. Tudo isso vira 500, e 500 não aparece em `tsc` nem no build.
 *
 * Roda contra `npm run dev`. Rota criada depois que o dev subiu só é
 * reconhecida no reinício — se uma rota nova falhar aqui e passar em
 * `vinext start`, é isso.
 */

const criados: string[] = [];
afterAll(() => apagarContas(criados));

async function comoAdmin(): Promise<Aparelho> {
  const email = emailDeTeste("telas-admin");
  criados.push(email);
  const ap = await entrar(email);
  sql(`update usuario set papel = 'admin' where email = '${email}'`);
  return ap;
}

const ROTAS = [
  "/operacional/despacho",
  "/operacional/pendencias",
  "/operacional/clientes",
  "/operacional/minha-rota",
  "/operacional/mapa",
  "/operacional/checklist",
  "/operacional/whatsapp",
  "/admin/catalogo",
  "/admin/frota",
  "/admin/equipe",
  "/admin/financeiro",
  "/admin/localidades",
  "/admin/operacao",
  "/admin/auditoria",
  "/cliente/contratar",
  "/cliente/eventos",
  "/cliente/perfil",
  "/cliente/rastreio",
  "/cliente/suporte",
  "/cliente/equipe",
];

describe("nenhuma tela quebra", () => {
  for (const fonte of ["mock", "real"] as const) {
    describe(`fonte ${fonte}`, () => {
      for (const rota of ROTAS) {
        it(rota, async () => {
          const ap = await comoAdmin();
          ap.definirCookie("cecchin_fonte", fonte);
          const r = await ap.rota(rota);
          expect(r.status, `${rota} devolveu ${r.status}`).toBeLessThan(500);
        });
      }
    });
  }
});

describe("detalhe de evento e de cliente", () => {
  it("um id que existe abre; um que não existe dá 404", async () => {
    const ap = await comoAdmin();
    ap.definirCookie("cecchin_fonte", "real");

    const evento = sql("select id from evento order by data_evento desc limit 1");
    const cliente = sql("select id from cliente limit 1");

    expect((await ap.rota(`/operacional/eventos/${evento}`)).status).toBeLessThan(500);
    expect((await ap.rota(`/operacional/clientes/${cliente}`)).status).toBeLessThan(500);

    const nada = "00000000-0000-0000-0000-000000000000";
    expect((await ap.rota(`/operacional/eventos/${nada}`)).status).toBe(404);
  });

  it("cliente comum não alcança o detalhe de um evento alheio", async () => {
    // A RLS esconde, e `notFound()` não confirma que existe: para quem não
    // pode, não existe.
    const email = emailDeTeste("telas-cliente");
    criados.push(email);
    const ap = await entrar(email);
    ap.definirCookie("cecchin_fonte", "real");

    const evento = sql("select id from evento limit 1");
    const r = await ap.rota(`/operacional/eventos/${evento}`);

    // 307 do guarda de papel, que barra antes de a consulta acontecer.
    expect([307, 404]).toContain(r.status);
  });
});
