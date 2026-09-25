import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Aparelho, apagarContas, emailDeTeste, entrar, sql } from "./ajuda";

const contas: string[] = [];
let localidade = "";
let picoAnterior = "";

async function entrarComo(prefixo: string, papel: "staff" | "gestao") {
  const email = emailDeTeste(prefixo);
  contas.push(email);
  const aparelho = await entrar(email);
  sql(`update usuario set papel = '${papel}' where email = '${email}'`);
  return aparelho;
}

beforeAll(() => {
  picoAnterior = sql(
    "select inicio::text || '|' || fim::text from janela_pico where organizacao_id = app.org_padrao()",
  );
  // `psql` imprime o status de INSERT depois de um `returning`; gere o id
  // antes para o helper guardar somente o UUID e o cenário ficar removível.
  localidade = sql("select gen_random_uuid()");
  sql(`insert into localidade (id, organizacao_id, cidade, valor)
    values ('${localidade}', app.org_padrao(), 'Prova HTTP Localidade ${localidade}', 1)`);
});

afterAll(() => {
  if (localidade) sql(`delete from localidade where id = '${localidade}'`);
  if (picoAnterior) {
    const [inicio, fim] = picoAnterior.split("|");
    sql(`update janela_pico set inicio = '${inicio}', fim = '${fim}' where organizacao_id = app.org_padrao()`);
  } else {
    sql("delete from janela_pico where organizacao_id = app.org_padrao()");
  }
  apagarContas(contas);
});

describe("configuração de deslocamento", () => {
  it("gestão altera taxa, tempos e a janela de pico", async () => {
    const gestao = await entrarComo("local.gestao", "gestao");
    const local = await gestao.pedir("/api/localidade", {
      metodo: "PATCH",
      corpo: {
        tipo: "localidade", id: localidade, valor: 37.5,
        minutos_normal: 32, minutos_pico: 49, ativa: false,
      },
    });
    expect(local.status).toBe(200);
    expect(sql(`select valor || '|' || minutos_normal || '|' || minutos_pico || '|' || ativa from localidade where id = '${localidade}'`)).toBe("37.50|32|49|false");

    const pico = await gestao.pedir("/api/localidade", {
      metodo: "PATCH",
      corpo: { tipo: "pico", inicio: "15:30", fim: "19:45" },
    });
    expect(pico.status).toBe(200);
    expect(sql("select inicio::text || '|' || fim::text from janela_pico where organizacao_id = app.org_padrao()")).toBe("15:30:00|19:45:00");
  });

  it("staff e pessoa sem sessão não configuram a rota", async () => {
    const staff = await entrarComo("local.staff", "staff");
    const r = await staff.pedir("/api/localidade", {
      metodo: "PATCH",
      corpo: { tipo: "localidade", id: localidade, valor: 999, minutos_normal: 1, minutos_pico: 1 },
    });
    expect(r.status).toBe(403);
    expect(sql(`select valor from localidade where id = '${localidade}'`)).toBe("37.50");

    const semSessao = await new Aparelho().pedir("/api/localidade", {
      metodo: "PATCH",
      corpo: { tipo: "pico", inicio: "10:00", fim: "11:00" },
    });
    expect(semSessao.status).toBe(401);
  });

  it("recusa horário e número inválidos antes de escrever", async () => {
    const gestao = await entrarComo("local.invalido", "gestao");
    const horario = await gestao.pedir("/api/localidade", {
      metodo: "PATCH", corpo: { tipo: "pico", inicio: "25:00", fim: "19:00" },
    });
    expect(horario.status).toBe(400);

    const numero = await gestao.pedir("/api/localidade", {
      metodo: "PATCH", corpo: { tipo: "localidade", id: localidade, valor: -1, minutos_normal: 1, minutos_pico: 1 },
    });
    expect(numero.status).toBe(400);
  });
});
