import { afterAll, describe, expect, it } from "vitest";

import { Aparelho, apagarContas, emailDeTeste, entrar, sql } from "./ajuda";

/**
 * Escrita no catálogo, por HTTP.
 *
 * O que se mede aqui é a regra que vale mesmo sem tela: quem pode criar item,
 * quem pode ligar e desligar, quem pode definir preço — e, principalmente, que
 * `staff` NÃO pode nenhuma das três, nem pela rota do BFF nem falando direto
 * com o PostgREST.
 *
 * A segunda parte importa mais do que a primeira: 007_rls.sql tinha dado
 * escrita de catálogo ao papel que o 008 traduziu para `staff`, e um pizzaiolo
 * podia mudar o preço do rodízio com o próprio token, sem passar por tela
 * nenhuma. 009_catalogo.sql fechou isso; este teste é quem impede a volta.
 */

const SUPABASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";

const criados: string[] = [];

function conta(prefixo: string): string {
  const e = emailDeTeste(prefixo);
  criados.push(e);
  return e;
}

/*
 * A limpeza vai por PREFIXO do slug, não por uma lista de ids colhida durante
 * a execução. Uma execução interrompida no meio — o Supabase caindo, por
 * exemplo — deixa a lista pela metade e os itens ficam no banco de dev para
 * sempre. O prefixo apaga também o que ficou da vez passada.
 */
const MARCA = "prova-zz";

function limparItensDeTeste(): void {
  sql(
    `delete from preco_vigencia where modelo_rodizio_id in
       (select id from modelo_rodizio where slug like '${MARCA}-%')`,
  );
  sql(`delete from modelo_rodizio where slug like '${MARCA}-%'`);
  sql(`delete from modelo_forno where slug like '${MARCA}-%'`);
}

afterAll(() => {
  limparItensDeTeste();
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
 * Nome único por execução, com a marca que a limpeza procura.
 *
 * `slug` é unique por organização, então o sufixo aleatório evita colisão entre
 * execuções; o prefixo `Prova ZZ` é o que permite apagar por padrão depois.
 */
function nomeDeTeste(prefixo: string): string {
  const marca = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  return `Prova ZZ ${prefixo} ${marca}`;
}

describe("criar item", () => {
  it("gestão cria rodízio e ele nasce ativo", async () => {
    const ap = await entrarComo("cat.gestao", "gestao");
    const nome = nomeDeTeste("Rodizio prova");

    const r = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "rodizio", nome, horas_montagem: 2 },
    });

    expect(r.status).toBe(201);
    expect(r.corpo.id).toBeTruthy();

    // `boolean || text` no Postgres devolve 'true'/'false', não 't'/'f'.
    const linha = sql(
      `select ativo || '|' || horas_montagem from modelo_rodizio where id = '${r.corpo.id}'`,
    );
    expect(linha).toBe("true|2.0");
  });

  it("o slug sai do nome, sem acento nem espaço", async () => {
    const ap = await entrarComo("cat.slug", "admin");
    const nome = nomeDeTeste("Ação Ímpar");

    const r = await ap.pedir("/api/catalogo", { corpo: { tipo: "rodizio", nome } });
    expect(r.status).toBe(201);

    const slug = sql(`select slug from modelo_rodizio where id = '${r.corpo.id}'`);
    // Acento some, espaço vira hífen, tudo em minúscula.
    expect(slug).toMatch(/^prova-zz-acao-impar-/);
  });

  it("staff não cria, nem com sessão boa", async () => {
    const ap = await entrarComo("cat.staff", "staff");

    const r = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "rodizio", nome: nomeDeTeste("Nao deve existir") },
    });

    expect(r.status).toBe(403);
    expect(r.corpo.codigo).toBe("sem_papel");
  });

  it("cliente não cria", async () => {
    const ap = await entrarComo("cat.cliente", "cliente");
    const r = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "rodizio", nome: nomeDeTeste("Nem esse") },
    });
    expect(r.status).toBe(403);
  });

  it("sem sessão é 401, não redirecionamento para HTML de login", async () => {
    const r = await new Aparelho().pedir("/api/catalogo", {
      corpo: { tipo: "forno", nome: "sem sessao" },
    });
    expect(r.status).toBe(401);
  });

  it("nome curto demais é recusado antes de tocar no banco", async () => {
    const ap = await entrarComo("cat.curto", "gestao");
    const r = await ap.pedir("/api/catalogo", { corpo: { tipo: "rodizio", nome: "x" } });
    expect(r.status).toBe(400);
    expect(r.corpo.codigo).toBe("nome");
  });

  it("tipo inventado é recusado", async () => {
    const ap = await entrarComo("cat.tipo", "gestao");
    const r = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "sobremesa", nome: "Pudim" },
    });
    expect(r.status).toBe(400);
    expect(r.corpo.codigo).toBe("tipo");
  });

  it("nome repetido devolve 409, e não 500 de chave única", async () => {
    const ap = await entrarComo("cat.repetido", "gestao");
    const nome = nomeDeTeste("Rodizio gemeo");

    const primeiro = await ap.pedir("/api/catalogo", { corpo: { tipo: "rodizio", nome } });
    expect(primeiro.status).toBe(201);

    const segundo = await ap.pedir("/api/catalogo", { corpo: { tipo: "rodizio", nome } });
    expect(segundo.status).toBe(409);
    expect(segundo.corpo.codigo).toBe("repetido");
  });
});

describe("ligar e desligar", () => {
  it("gestão desliga e liga de novo", async () => {
    const ap = await entrarComo("cat.liga", "gestao");
    const criado = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "forno", nome: nomeDeTeste("Forno prova") },
    });
    expect(criado.status).toBe(201);
    const id = criado.corpo.id as string;

    const desliga = await ap.pedir("/api/catalogo", {
      metodo: "PATCH",
      corpo: { tipo: "forno", id, ativo: false },
    });
    expect(desliga.status).toBe(200);
    expect(sql(`select ativo from modelo_forno where id = '${id}'`)).toBe("f");

    const liga = await ap.pedir("/api/catalogo", {
      metodo: "PATCH",
      corpo: { tipo: "forno", id, ativo: true },
    });
    expect(liga.status).toBe(200);
    expect(sql(`select ativo from modelo_forno where id = '${id}'`)).toBe("t");
  });

  it("staff não desliga item nenhum", async () => {
    const gestao = await entrarComo("cat.dono", "gestao");
    const criado = await gestao.pedir("/api/catalogo", {
      corpo: { tipo: "forno", nome: nomeDeTeste("Forno do staff") },
    });
    const id = criado.corpo.id as string;

    const staff = await entrarComo("cat.staff2", "staff");
    const r = await staff.pedir("/api/catalogo", {
      metodo: "PATCH",
      corpo: { tipo: "forno", id, ativo: false },
    });

    expect(r.status).toBe(403);
    expect(sql(`select ativo from modelo_forno where id = '${id}'`)).toBe("t");
  });

  it("id que não existe devolve 404, não 200 silencioso", async () => {
    const ap = await entrarComo("cat.fantasma", "gestao");
    const r = await ap.pedir("/api/catalogo", {
      metodo: "PATCH",
      corpo: {
        tipo: "forno",
        id: "00000000-0000-0000-0000-000000000000",
        ativo: false,
      },
    });
    expect(r.status).toBe(404);
  });

  it("PATCH sem nada para mudar é 400", async () => {
    const ap = await entrarComo("cat.vazio", "gestao");
    const r = await ap.pedir("/api/catalogo", {
      metodo: "PATCH",
      corpo: { tipo: "forno", id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(r.status).toBe(400);
    expect(r.corpo.codigo).toBe("vazio");
  });
});

describe("preço", () => {
  it("gestão grava preço e ele passa a valer", async () => {
    const ap = await entrarComo("cat.preco", "gestao");
    const criado = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "rodizio", nome: nomeDeTeste("Rodizio com preco") },
    });
    const id = criado.corpo.id as string;

    const r = await ap.pedir("/api/catalogo/preco", {
      corpo: { modelo: id, preco: 89.9, valida_de: "2026-01-01" },
    });

    expect(r.status).toBe(200);
    expect(
      sql(
        `select preco from preco_vigencia where modelo_rodizio_id = '${id}' and valida_de = '2026-01-01'`,
      ),
    ).toBe("89.90");
  });

  it("regravar o mesmo dia ATUALIZA, não estoura a chave única", async () => {
    const ap = await entrarComo("cat.preco2", "gestao");
    const criado = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "rodizio", nome: nomeDeTeste("Rodizio corrigido") },
    });
    const id = criado.corpo.id as string;

    await ap.pedir("/api/catalogo/preco", {
      corpo: { modelo: id, preco: 8990, valida_de: "2026-02-01" },
    });
    const segundo = await ap.pedir("/api/catalogo/preco", {
      corpo: { modelo: id, preco: 89.9, valida_de: "2026-02-01" },
    });

    expect(segundo.status).toBe(200);
    expect(
      sql(`select count(*) from preco_vigencia where modelo_rodizio_id = '${id}'`),
    ).toBe("1");
    expect(
      sql(`select preco from preco_vigencia where modelo_rodizio_id = '${id}'`),
    ).toBe("89.90");
  });

  it("preço negativo é recusado", async () => {
    const ap = await entrarComo("cat.negativo", "gestao");
    const criado = await ap.pedir("/api/catalogo", {
      corpo: { tipo: "rodizio", nome: nomeDeTeste("Rodizio negativo") },
    });
    const id = criado.corpo.id as string;

    const r = await ap.pedir("/api/catalogo/preco", {
      corpo: { modelo: id, preco: -1 },
    });

    expect(r.status).toBe(400);
    expect(
      sql(`select count(*) from preco_vigencia where modelo_rodizio_id = '${id}'`),
    ).toBe("0");
  });

  it("staff não define preço", async () => {
    const gestao = await entrarComo("cat.preco3", "gestao");
    const criado = await gestao.pedir("/api/catalogo", {
      corpo: { tipo: "rodizio", nome: nomeDeTeste("Rodizio do staff") },
    });
    const id = criado.corpo.id as string;

    const staff = await entrarComo("cat.staff3", "staff");
    const r = await staff.pedir("/api/catalogo/preco", {
      corpo: { modelo: id, preco: 1 },
    });

    expect(r.status).toBe(403);
    expect(
      sql(`select count(*) from preco_vigencia where modelo_rodizio_id = '${id}'`),
    ).toBe("0");
  });
});

/**
 * O BFF fora do caminho.
 *
 * Recusar na rota é conveniência; o que vale é a policy. Se a regra vivesse só
 * no handler, tudo abaixo passaria — e passar significa um pizzaiolo mudando o
 * preço do rodízio com o próprio token, que a chave anon e a URL do Supabase
 * são públicas por desenho.
 */
describe("staff falando direto com o PostgREST", () => {
  async function tokenDe(prefixo: string, papel: string): Promise<string> {
    const email = conta(prefixo);
    const ap = new Aparelho();
    const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    expect(inicio.status).toBe(200);

    const { codigo } = await import("./ajuda").then((m) => m.codigoDeAcesso(email));

    const r = await fetch(`${SUPABASE}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: ANON, "content-type": "application/json" },
      body: JSON.stringify({ email, token: codigo, type: "email" }),
    });
    const sessao = await r.json();

    sql(`update usuario set papel = '${papel}' where email = '${email}'`);
    return sessao.access_token as string;
  }

  async function rest(
    caminho: string,
    token: string,
    init: RequestInit = {},
  ): Promise<{ status: number; dados: any }> {
    const r = await fetch(`${SUPABASE}/rest/v1/${caminho}`, {
      ...init,
      headers: {
        apikey: ANON,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        prefer: "return=representation",
        ...(init.headers as Record<string, string>),
      },
    });
    const texto = await r.text();
    return { status: r.status, dados: texto ? JSON.parse(texto) : null };
  }

  it("lê o catálogo — precisa, para montar o evento", async () => {
    const token = await tokenDe("pg.cat.leitura", "staff");
    const r = await rest("modelo_rodizio?select=id,nome&limit=5", token);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.dados)).toBe(true);
  });

  it("NÃO insere preço", async () => {
    const token = await tokenDe("pg.cat.preco", "staff");
    const org = sql("select id from organizacao limit 1");
    const modelo = sql("select id from modelo_rodizio limit 1");

    const r = await rest("preco_vigencia", token, {
      method: "POST",
      body: JSON.stringify({
        organizacao_id: org,
        modelo_rodizio_id: modelo,
        valida_de: "2030-01-01",
        preco: 1,
      }),
    });

    // 401/403: a policy `with check` recusa. Nunca 201.
    expect(r.status).toBeGreaterThanOrEqual(401);
    expect(
      sql(`select count(*) from preco_vigencia where valida_de = '2030-01-01'`),
    ).toBe("0");
  });

  it("NÃO altera o preço de um rodízio", async () => {
    const token = await tokenDe("pg.cat.update", "staff");
    const r = await rest("modelo_rodizio?nome=neq.zzz", token, {
      method: "PATCH",
      body: JSON.stringify({ nome: "invadido" }),
    });

    // Sem policy que case, o PATCH não encontra linha para alterar.
    expect(r.dados ?? []).toHaveLength(0);
    expect(sql("select count(*) from modelo_rodizio where nome = 'invadido'")).toBe("0");
  });

  it("NÃO chama definir_preco()", async () => {
    const token = await tokenDe("pg.cat.rpc", "staff");
    const modelo = sql("select id from modelo_rodizio limit 1");

    const r = await rest("rpc/definir_preco", token, {
      method: "POST",
      body: JSON.stringify({ p_modelo: modelo, p_preco: 1, p_valida_de: "2031-01-01" }),
    });

    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(
      sql(`select count(*) from preco_vigencia where valida_de = '2031-01-01'`),
    ).toBe("0");
  });

  it("gestão chama definir_preco() e funciona", async () => {
    const token = await tokenDe("pg.cat.ok", "gestao");
    const modelo = sql("select id from modelo_rodizio limit 1");

    const r = await rest("rpc/definir_preco", token, {
      method: "POST",
      body: JSON.stringify({ p_modelo: modelo, p_preco: 12.34, p_valida_de: "2032-01-01" }),
    });

    expect(r.status).toBe(200);
    expect(
      sql(`select preco from preco_vigencia where modelo_rodizio_id = '${modelo}' and valida_de = '2032-01-01'`),
    ).toBe("12.34");

    sql(`delete from preco_vigencia where valida_de = '2032-01-01'`);
  });
});
