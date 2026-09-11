import { afterAll, describe, expect, it } from "vitest";

import { Aparelho, apagarContas, emailDeTeste, entrar, sql } from "./ajuda";

/**
 * Cliente pede para virar staff; gestão decide.
 *
 * Aprovar é o único caminho de cliente para staff. O que importa medir aqui é
 * que ele passa por gente — e que ninguém pula a fila por HTTP.
 */

const criados: string[] = [];
function conta(prefixo: string): string {
  const e = emailDeTeste(prefixo);
  criados.push(e);
  return e;
}

afterAll(() => apagarContas(criados));

async function entrarComo(prefixo: string, papel: string) {
  const email = conta(prefixo);
  const ap = await entrar(email);
  if (papel !== "cliente") {
    sql(`update usuario set papel = '${papel}' where email = '${email}'`);
  }
  return { ap, email };
}

const PEDIDO = {
  telefone: "51999990000",
  cidade: "Porto Alegre",
  tem_cnh: true,
  tem_veiculo: false,
  disponibilidade: "Fins de semana",
  experiencia: "Trabalhei em bufê",
};

describe("abrir pedido", () => {
  it("cliente abre, e o pedido aparece só para ele", async () => {
    const { ap, email } = await entrarComo("s-pede", "cliente");

    const r = await ap.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });
    expect(r.status).toBe(201);

    const meus = await ap.pedir("/api/equipe/solicitacoes");
    expect(meus.corpo.solicitacoes).toHaveLength(1);
    expect(meus.corpo.solicitacoes[0].status).toBe("pendente");
    expect(meus.corpo.solicitacoes[0].cidade).toBe("Porto Alegre");

    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("cliente");
  });

  it("um pedido em aberto por pessoa", async () => {
    const { ap } = await entrarComo("s-duplo", "cliente");

    expect((await ap.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO })).status).toBe(201);

    const segundo = await ap.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });
    expect(segundo.status).toBe(409);
    expect(segundo.corpo.codigo).toBe("ja_existe");
  });

  it.each([
    ["sem telefone", { ...PEDIDO, telefone: "" }],
    ["sem cidade", { ...PEDIDO, cidade: "   " }],
    ["sem nada", {}],
  ])("recusa pedido %s", async (_r, corpo) => {
    const { ap } = await entrarComo(`s-incompleto-${Math.random().toString(36).slice(2, 6)}`, "cliente");
    const r = await ap.pedir("/api/equipe/solicitacoes", { corpo });
    expect(r.status).toBe(400);
  });

  it("quem já é staff não pede para entrar na equipe", async () => {
    const { ap } = await entrarComo("s-jastaff", "staff");
    const r = await ap.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });
    expect(r.status).toBe(400);
  });

  it("sem sessão, 401", async () => {
    const r = await new Aparelho().pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });
    expect(r.status).toBe(401);
  });

  it("o pedido é sempre em nome de quem está logado", async () => {
    // O corpo até pode trazer outro `usuario_id`; a policy amarra a
    // `auth.uid()`, e o handler nem repassa o campo.
    const { ap, email } = await entrarComo("s-nomedeoutro", "cliente");
    const outro = conta("s-alvo");
    await entrar(outro);
    const outroId = sql(`select id from usuario where email = '${outro}'`);

    const r = await ap.pedir("/api/equipe/solicitacoes", {
      corpo: { ...PEDIDO, usuario_id: outroId },
    });
    expect(r.status).toBe(201);

    const dono = sql(
      `select u.email from solicitacao_staff s join usuario u on u.id = s.usuario_id
        where s.telefone = '51999990000' and u.email = '${email}'`,
    );
    expect(dono).toBe(email);
  });
});

describe("decidir", () => {
  it("gestão aprova, e a pessoa vira staff na hora", async () => {
    const { ap: cliente, email } = await entrarComo("s-aprova-c", "cliente");
    await cliente.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });

    const { ap: gestao } = await entrarComo("s-aprova-g", "gestao");

    const fila = await gestao.pedir("/api/auth/sessao"); // aquece a sessão
    expect(fila.status).toBe(200);

    const id = sql(
      `select s.id from solicitacao_staff s join usuario u on u.id = s.usuario_id
        where u.email = '${email}'`,
    );

    const decisao = await gestao.pedir("/api/equipe/solicitacoes", {
      metodo: "PATCH",
      corpo: { id, aprovar: true },
    });
    expect(decisao.status).toBe(200);

    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("staff");

    // E o acesso muda sem novo login.
    expect((await cliente.rota("/operacional/minha-rota")).status).toBe(200);
  });

  it("recusa exige motivo, e o motivo chega a quem pediu", async () => {
    const { ap: cliente, email } = await entrarComo("s-recusa-c", "cliente");
    await cliente.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });

    const { ap: admin } = await entrarComo("s-recusa-a", "admin");
    const id = sql(
      `select s.id from solicitacao_staff s join usuario u on u.id = s.usuario_id
        where u.email = '${email}'`,
    );

    const semMotivo = await admin.pedir("/api/equipe/solicitacoes", {
      metodo: "PATCH",
      corpo: { id, aprovar: false },
    });
    expect(semMotivo.status).toBe(403);

    const comMotivo = await admin.pedir("/api/equipe/solicitacoes", {
      metodo: "PATCH",
      corpo: { id, aprovar: false, motivo: "Precisamos de alguém com CNH" },
    });
    expect(comMotivo.status).toBe(200);

    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("cliente");

    const meus = await cliente.pedir("/api/equipe/solicitacoes");
    expect(meus.corpo.solicitacoes[0].status).toBe("recusada");
    expect(meus.corpo.solicitacoes[0].motivo).toContain("CNH");
  });

  it("cliente não decide o próprio pedido", async () => {
    const { ap, email } = await entrarComo("s-autodecide", "cliente");
    await ap.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });

    const id = sql(
      `select s.id from solicitacao_staff s join usuario u on u.id = s.usuario_id
        where u.email = '${email}'`,
    );

    const r = await ap.pedir("/api/equipe/solicitacoes", {
      metodo: "PATCH",
      corpo: { id, aprovar: true },
    });

    expect(r.status).toBe(403);
    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("cliente");
  });

  it("staff não decide o pedido de ninguém", async () => {
    const { ap: cliente, email } = await entrarComo("s-staffdecide-c", "cliente");
    await cliente.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });

    const { ap: staff } = await entrarComo("s-staffdecide-s", "staff");
    const id = sql(
      `select s.id from solicitacao_staff s join usuario u on u.id = s.usuario_id
        where u.email = '${email}'`,
    );

    const r = await staff.pedir("/api/equipe/solicitacoes", {
      metodo: "PATCH",
      corpo: { id, aprovar: true },
    });

    expect(r.status).toBe(403);
    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("cliente");
  });

  it("pedido já decidido não é decidido de novo", async () => {
    const { ap: cliente, email } = await entrarComo("s-redecide-c", "cliente");
    await cliente.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });

    const { ap: admin } = await entrarComo("s-redecide-a", "admin");
    const id = sql(
      `select s.id from solicitacao_staff s join usuario u on u.id = s.usuario_id
        where u.email = '${email}'`,
    );

    expect(
      (await admin.pedir("/api/equipe/solicitacoes", {
        metodo: "PATCH",
        corpo: { id, aprovar: true },
      })).status,
    ).toBe(200);

    const denovo = await admin.pedir("/api/equipe/solicitacoes", {
      metodo: "PATCH",
      corpo: { id, aprovar: false, motivo: "mudei de ideia" },
    });
    expect(denovo.status).toBe(403);
    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("staff");
  });
});

describe("quem enxerga a fila", () => {
  it("a rota de pedidos devolve só os da própria pessoa, mesmo para admin", async () => {
    // A regressão do defeito que mostrava ao admin o pedido de outra pessoa
    // como se fosse o dele: a policy permite ver a fila inteira, e sem filtro
    // por dono o `limit=1` trazia uma linha qualquer.
    const { ap: cliente } = await entrarComo("s-fila-c", "cliente");
    await cliente.pedir("/api/equipe/solicitacoes", { corpo: PEDIDO });

    const { ap: admin } = await entrarComo("s-fila-a", "admin");
    const meus = await admin.pedir("/api/equipe/solicitacoes");

    expect(meus.status).toBe(200);
    expect(meus.corpo.solicitacoes).toHaveLength(0);
  });
});
