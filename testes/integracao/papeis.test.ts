import { afterAll, describe, expect, it } from "vitest";

import {
  Aparelho,
  apagarContas,
  emailDeTeste,
  entrar,
  sql,
} from "./ajuda";

/**
 * Guardas de rota e troca de papel, por HTTP.
 *
 * O que os testes de pgTAP provam dentro do Postgres, estes provam do lado de
 * fora: que o BFF realmente aplica a regra, e que a resposta que chega ao
 * navegador não contém o que ele não deveria ver.
 */

const criados: string[] = [];
function conta(prefixo: string): string {
  const e = emailDeTeste(prefixo);
  criados.push(e);
  return e;
}

afterAll(() => apagarContas(criados));

/** Entra e promove por SQL — o mesmo caminho do primeiro admin de verdade. */
async function entrarComo(prefixo: string, papel: string): Promise<Aparelho> {
  const email = conta(prefixo);
  const ap = await entrar(email);
  if (papel !== "cliente") {
    sql(`update usuario set papel = '${papel}' where email = '${email}'`);
  }
  return ap;
}

function idDe(email: string): string {
  return sql(`select id from usuario where email = '${email}'`);
}

describe("middleware: sem sessão não se chega a lugar nenhum", () => {
  it.each([
    "/cliente/contratar",
    "/cliente/eventos",
    "/cliente/equipe",
    "/operacional/despacho",
    "/operacional/minha-rota",
    "/admin/equipe",
    "/admin/catalogo",
  ])("%s redireciona para /entrar", async (rota) => {
    const r = await new Aparelho().rota(rota);
    expect(r.status).toBe(307);
    expect(r.destino).toContain("/entrar");
  });

  it("guarda o destino para devolver a pessoa onde ela queria estar", async () => {
    const r = await new Aparelho().rota("/operacional/despacho");
    expect(r.destino).toContain("para=%2Foperacional%2Fdespacho");
  });

  it("/entrar é pública", async () => {
    const r = await new Aparelho().rota("/entrar");
    expect(r.status).toBe(200);
  });

  it("as rotas de acesso são públicas, senão ninguém consegue entrar", async () => {
    const r = await new Aparelho().pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: "qualquer-coisa" },
    });
    // 404 do pedido inexistente, e não 307 do middleware.
    expect(r.status).toBe(404);
  });
});

describe("guarda de papel, com sessão", () => {
  it("cliente entra na área dele e é barrado na operação", async () => {
    const ap = await entrarComo("g-cliente", "cliente");

    expect((await ap.rota("/cliente/contratar")).status).toBe(200);

    for (const rota of ["/operacional/despacho", "/operacional/minha-rota", "/admin/equipe"]) {
      const r = await ap.rota(rota);
      expect(r.status, rota).toBe(307);
      // Vai para a área DELE, e não para o login: mandá-lo entrar de novo só o
      // faria bater no mesmo muro.
      expect(r.destino, rota).toContain("/cliente/contratar");
    }
  });

  it("nada da operação vaza no HTML que o cliente recebe", async () => {
    const ap = await entrarComo("g-vazamento", "cliente");
    const r = await ap.pedir("/operacional/despacho");

    // Seguiu o redirect e caiu na tela de contratação. O corpo servido não pode
    // conter o conteúdo da tela negada — esconder com CSS não contaria.
    expect(r.texto).not.toContain("Console Operacional");
    expect(r.texto).not.toContain("Despacho & Agenda");
  });

  it("staff entra na operação e é barrado no painel", async () => {
    const ap = await entrarComo("g-staff", "staff");

    expect((await ap.rota("/operacional/minha-rota")).status).toBe(200);
    expect((await ap.rota("/operacional/despacho")).status).toBe(200);
    expect((await ap.rota("/cliente/contratar")).status).toBe(200);

    const painel = await ap.rota("/admin/equipe");
    expect(painel.status).toBe(307);
  });

  it("gestao e admin alcançam o painel", async () => {
    for (const papel of ["gestao", "admin"]) {
      const ap = await entrarComo(`g-${papel}`, papel);
      expect((await ap.rota("/admin/equipe")).status, papel).toBe(200);
      expect((await ap.rota("/operacional/despacho")).status, papel).toBe(200);
    }
  });

  it("mudar o papel no banco muda o acesso sem novo login", async () => {
    // É a razão de o papel NÃO ser claim de JWT: com claim, rebaixar alguém só
    // surtiria efeito quando o token dela vencesse, até uma hora depois.
    const email = conta("g-promove");
    const ap = await entrar(email);

    expect((await ap.rota("/operacional/despacho")).status).toBe(307);

    sql(`update usuario set papel = 'staff' where email = '${email}'`);
    expect((await ap.rota("/operacional/despacho")).status).toBe(200);

    sql(`update usuario set papel = 'cliente' where email = '${email}'`);
    expect((await ap.rota("/operacional/despacho")).status).toBe(307);
  });

  it("conta desativada perde o acesso na hora", async () => {
    const email = conta("g-inativa");
    const ap = await entrar(email);
    expect((await ap.pedir("/api/auth/sessao")).status).toBe(200);

    sql(`update usuario set ativo = false where email = '${email}'`);

    // `meu_perfil()` filtra por `ativo`: sem perfil, não há sessão.
    expect((await ap.pedir("/api/auth/sessao")).status).toBe(401);
  });
});

describe("troca de papel pela API", () => {
  it("admin promove; gestao não alcança gestao nem admin", async () => {
    const alvo = conta("t-alvo");
    await entrar(alvo);
    const alvoId = idDe(alvo);

    const gestao = await entrarComo("t-gestao", "gestao");
    const admin = await entrarComo("t-admin", "admin");

    // gestao sobe alguém até staff
    const ate = await gestao.pedir("/api/equipe/papel", {
      metodo: "PATCH",
      corpo: { usuario: alvoId, papel: "staff" },
    });
    expect(ate.status).toBe(200);
    expect(sql(`select papel from usuario where id = '${alvoId}'`)).toBe("staff");

    // e para por aí
    const alem = await gestao.pedir("/api/equipe/papel", {
      metodo: "PATCH",
      corpo: { usuario: alvoId, papel: "gestao" },
    });
    expect(alem.status).toBe(403);
    expect(alem.corpo.mensagem).toContain("admin");
    expect(sql(`select papel from usuario where id = '${alvoId}'`)).toBe("staff");

    // admin alcança
    const comAdmin = await admin.pedir("/api/equipe/papel", {
      metodo: "PATCH",
      corpo: { usuario: alvoId, papel: "gestao" },
    });
    expect(comAdmin.status).toBe(200);
    expect(sql(`select papel from usuario where id = '${alvoId}'`)).toBe("gestao");
  });

  it("cliente não promove ninguém, nem a si mesmo", async () => {
    const email = conta("t-cliente");
    const ap = await entrar(email);
    const id = idDe(email);

    const r = await ap.pedir("/api/equipe/papel", {
      metodo: "PATCH",
      corpo: { usuario: id, papel: "admin" },
    });

    expect(r.status).toBe(403);
    expect(sql(`select papel from usuario where id = '${id}'`)).toBe("cliente");
  });

  it("sem sessão a rota devolve 401, não 403", async () => {
    const r = await new Aparelho().pedir("/api/equipe/papel", {
      metodo: "PATCH",
      corpo: { usuario: "00000000-0000-0000-0000-000000000000", papel: "admin" },
    });
    expect(r.status).toBe(401);
  });

  it("a lista de equipe não traz cliente", async () => {
    const cliente = conta("t-lista-cliente");
    await entrar(cliente);
    const admin = await entrarComo("t-lista-admin", "admin");

    const r = await admin.pedir("/api/equipe/papel");
    expect(r.status).toBe(200);

    const emails = r.corpo.pessoas.map((p: any) => p.email);
    expect(emails).not.toContain(cliente);
    expect(r.corpo.pessoas.every((p: any) => p.papel !== "cliente")).toBe(true);
  });
});
