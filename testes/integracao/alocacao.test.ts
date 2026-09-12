import { afterAll, describe, expect, it } from "vitest";

import { Aparelho, apagarContas, emailDeTeste, entrar, sql } from "./ajuda";

/**
 * Alocar responsável a um evento, por HTTP.
 *
 * É a outra metade do elo: ligar a conta ao responsável não adianta se nenhum
 * evento aponta para ele. Os 154 eventos futuros do banco vieram da planilha
 * com `responsavel_id` nulo — lá o nome de quem respondeu era anotado depois
 * que o evento aconteceu.
 *
 * `staff` PODE alocar: quem monta a escala do dia está na operação. O que
 * `staff` não pode é mexer no elo conta-responsável, medido em
 * `responsavel.test.ts`.
 */

const criados: string[] = [];
function conta(prefixo: string): string {
  const e = emailDeTeste(prefixo);
  criados.push(e);
  return e;
}

const MARCA = "prova-aloc";

/*
 * O estado anterior de cada evento tocado, para devolver no fim. Estes são
 * eventos REAIS do banco de desenvolvimento; um teste que os deixa alterados
 * mente para a próxima pessoa que abrir a agenda.
 */
const tocados: { id: string; antes: string }[] = [];

afterAll(() => {
  for (const e of tocados) {
    sql(
      e.antes
        ? `update evento set responsavel_id = '${e.antes}' where id = '${e.id}'`
        : `update evento set responsavel_id = null where id = '${e.id}'`,
    );
  }
  sql(`delete from responsavel where slug like '${MARCA}-%'`);
  apagarContas(criados);
});

async function entrarComo(prefixo: string, papel: string): Promise<Aparelho> {
  const email = conta(prefixo);
  const ap = await entrar(email);
  if (papel !== "cliente") {
    sql(`update usuario set papel = '${papel}' where email = '${email}'`);
  }
  return ap;
}

/**
 * Um evento futuro do banco, guardando o estado anterior.
 *
 * O `with ... select` não é enfeite: `psql -tAc` imprime a etiqueta do comando
 * junto do valor quando o comando não é um SELECT, e o id chega com lixo.
 */
function eventoFuturo(): string {
  const id = sql(
    `select id from evento
      where data_evento >= current_date and status = 'confirmado'
      order by data_evento asc limit 1`,
  );
  const antes = sql(`select coalesce(responsavel_id::text,'') from evento where id = '${id}'`);
  tocados.push({ id, antes });
  return id;
}

function responsavelDeTeste(apelido: string): string {
  const marca = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  return sql(
    `with novo as (
       insert into responsavel (organizacao_id, slug, nome)
       values (app.org_padrao(), '${MARCA}-${apelido}-${marca}',
               'Prova Aloc ${apelido} ${marca}')
       returning id
     ) select id from novo`,
  );
}

describe("alocar responsável", () => {
  it("gestão aloca e o evento passa a apontar para ele", async () => {
    const ap = await entrarComo("aloc.gestao", "gestao");
    const evento = eventoFuturo();
    const resp = responsavelDeTeste("a");

    const r = await ap.pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: { evento, responsavel: resp },
    });

    expect(r.status).toBe(200);
    expect(r.corpo.alocado).toBe(true);
    expect(sql(`select responsavel_id from evento where id = '${evento}'`)).toBe(resp);
  });

  it("staff também aloca: quem monta a escala está na operação", async () => {
    const ap = await entrarComo("aloc.staff", "staff");
    const evento = eventoFuturo();
    const resp = responsavelDeTeste("b");

    const r = await ap.pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: { evento, responsavel: resp },
    });

    expect(r.status).toBe(200);
    expect(sql(`select responsavel_id from evento where id = '${evento}'`)).toBe(resp);
  });

  it("desalocar devolve o evento a sem responsável", async () => {
    const ap = await entrarComo("aloc.tira", "gestao");
    const evento = eventoFuturo();
    const resp = responsavelDeTeste("c");

    await ap.pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: { evento, responsavel: resp },
    });

    const r = await ap.pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: { evento, responsavel: "" },
    });

    expect(r.status).toBe(200);
    expect(r.corpo.alocado).toBe(false);
    expect(sql(`select coalesce(responsavel_id::text,'') from evento where id = '${evento}'`)).toBe("");
  });

  it("cliente não aloca ninguém", async () => {
    const ap = await entrarComo("aloc.cliente", "cliente");
    const evento = eventoFuturo();
    const resp = responsavelDeTeste("d");

    const r = await ap.pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: { evento, responsavel: resp },
    });

    expect(r.status).toBe(403);
    expect(r.corpo.codigo).toBe("sem_papel");
    expect(sql(`select coalesce(responsavel_id::text,'') from evento where id = '${evento}'`)).not.toBe(resp);
  });

  it("sem sessão é 401", async () => {
    const r = await new Aparelho().pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: { evento: eventoFuturo(), responsavel: "" },
    });
    expect(r.status).toBe(401);
  });

  it("responsável que não existe é recusado, e o evento não muda", async () => {
    const ap = await entrarComo("aloc.fantasma", "gestao");
    const evento = eventoFuturo();

    const r = await ap.pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: {
        evento,
        responsavel: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect(r.status).toBe(404);
    expect(r.corpo.codigo).toBe("sem_responsavel");
  });

  it("evento que não existe é 404", async () => {
    const ap = await entrarComo("aloc.semevento", "gestao");
    const r = await ap.pedir("/api/operacao/evento", {
      metodo: "PATCH",
      corpo: {
        evento: "00000000-0000-0000-0000-000000000000",
        responsavel: "",
      },
    });
    expect(r.status).toBe(404);
    expect(r.corpo.codigo).toBe("sem_evento");
  });
});
