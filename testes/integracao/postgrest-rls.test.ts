import { afterAll, describe, expect, it } from "vitest";

import { Aparelho, apagarContas, emailDeTeste, esperarEmail, limparEmails, sql } from "./ajuda";

/**
 * A RLS vista de fora, sem o BFF no caminho.
 *
 * Os testes anteriores medem o que o BFF deixa passar. Estes medem o que sobra
 * quando alguém ignora o BFF e bate direto no PostgREST com o próprio token —
 * o que é trivial de fazer, porque a URL do Supabase e a chave anon são
 * públicas por desenho.
 *
 * Se a autorização vivesse nos handlers, tudo aqui passaria. É a razão de ela
 * viver nas policies.
 */

const SUPABASE = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";

const criados: string[] = [];
function conta(prefixo: string): string {
  const e = emailDeTeste(prefixo);
  criados.push(e);
  return e;
}

afterAll(() => apagarContas(criados));

/**
 * O token do GoTrue, cru — o mesmo que o BFF guarda em cookie httpOnly.
 *
 * Pegá-lo aqui não é furar a segurança do BFF: é reproduzir o que alguém com a
 * própria conta consegue fazer de qualquer jeito.
 */
async function tokenDe(email: string, papel = "cliente"): Promise<string> {
  await limparEmails();

  const ap = new Aparelho();
  const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
  const { codigo } = await esperarEmail(email);

  const r = await fetch(`${SUPABASE}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, token: codigo, type: "email" }),
  });
  const sessao = await r.json();

  if (papel !== "cliente") {
    sql(`update usuario set papel = '${papel}' where email = '${email}'`);
  }

  // O selector fica pendurado; some sozinho no vencimento.
  void inicio;
  return sessao.access_token;
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
      ...(init.headers as Record<string, string>),
    },
  });
  const texto = await r.text();
  return { status: r.status, dados: texto ? JSON.parse(texto) : null };
}

describe("um cliente com o próprio token, batendo direto no PostgREST", () => {
  it("não lê a lista de usuários da organização", async () => {
    const token = await tokenDe(conta("pg-cliente"));
    const r = await rest("usuario?select=id,nome,email,papel", token);

    expect(r.status).toBe(200);
    // Uma linha: a dele. A policy `usuario_leitura` exige staff/gestao/admin.
    expect(r.dados).toHaveLength(1);
    expect(r.dados[0].papel).toBe("cliente");
  });

  it("não lê a agenda", async () => {
    const token = await tokenDe(conta("pg-agenda"));
    const r = await rest("evento?select=id,data_evento&limit=50", token);

    expect(r.status).toBe(200);
    // O banco tem 12.300 eventos; nenhum é dele.
    expect(r.dados).toHaveLength(0);
  });

  it("não lê cadastro de cliente alheio", async () => {
    const token = await tokenDe(conta("pg-clientes"));
    const r = await rest("cliente?select=id,nome,telefone&limit=50", token);

    expect(r.status).toBe(200);
    expect(r.dados).toHaveLength(0);
  });

  it("não lê nada do financeiro", async () => {
    const token = await tokenDe(conta("pg-financeiro"));

    for (const tabela of ["entrada", "despesa", "conta_a_pagar"]) {
      const r = await rest(`${tabela}?select=id&limit=5`, token);
      expect([200, 401, 403], tabela).toContain(r.status);
      if (r.status === 200) expect(r.dados, tabela).toHaveLength(0);
    }
  });

  it("não alcança pedido_login de jeito nenhum", async () => {
    const token = await tokenDe(conta("pg-pedido"));
    const r = await rest("pedido_login?select=*", token);

    // Privilégio revogado: nem chega à policy.
    expect([401, 403, 404]).toContain(r.status);
  });

  it("não se promove escrevendo em usuario", async () => {
    const email = conta("pg-promove");
    const token = await tokenDe(email);
    const id = sql(`select id from usuario where email = '${email}'`);

    const r = await rest(`usuario?id=eq.${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ papel: "admin" }),
    });

    // A policy de escrita exige gestao ou admin; a linha não é alcançada.
    expect(sql(`select papel from usuario where id = '${id}'`)).toBe("cliente");
    expect([200, 204, 401, 403, 404]).toContain(r.status);
  });

  it("nem chamando a função de promoção direto", async () => {
    const email = conta("pg-rpc");
    const token = await tokenDe(email);
    const id = sql(`select id from usuario where email = '${email}'`);

    const r = await rest("rpc/promover_usuario", token, {
      method: "POST",
      body: JSON.stringify({ p_usuario: id, p_papel: "admin" }),
    });

    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(sql(`select papel from usuario where id = '${id}'`)).toBe("cliente");
  });

  it("não decide a própria solicitação pela função", async () => {
    const email = conta("pg-decide");
    const token = await tokenDe(email);

    await rest("solicitacao_staff", token, {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        organizacao_id: sql(`select organizacao_id from usuario where email = '${email}'`),
        usuario_id: sql(`select id from usuario where email = '${email}'`),
        telefone: "51900000000",
        cidade: "Canoas",
      }),
    });

    const id = sql(
      `select s.id from solicitacao_staff s join usuario u on u.id = s.usuario_id
        where u.email = '${email}'`,
    );
    expect(id).not.toBe("");

    const r = await rest("rpc/decidir_solicitacao_staff", token, {
      method: "POST",
      body: JSON.stringify({ p_solicitacao: id, p_aprovar: true }),
    });

    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("cliente");
  });
});

describe("sem token nenhum", () => {
  it("a chave anon sozinha não abre nada", async () => {
    for (const tabela of ["usuario", "evento", "cliente", "solicitacao_staff"]) {
      const r = await fetch(`${SUPABASE}/rest/v1/${tabela}?select=id&limit=5`, {
        headers: { apikey: ANON },
      });
      const dados = await r.json();
      if (r.status === 200) expect(dados, tabela).toHaveLength(0);
      else expect(r.status, tabela).toBeGreaterThanOrEqual(400);
    }
  });
});

describe("staff com o próprio token", () => {
  it("alcança a agenda, mas não o financeiro", async () => {
    const token = await tokenDe(conta("pg-staff"), "staff");

    const agenda = await rest("evento?select=id&limit=5", token);
    expect(agenda.status).toBe(200);
    expect(agenda.dados.length).toBeGreaterThan(0);

    const dinheiro = await rest("entrada?select=id&limit=5", token);
    if (dinheiro.status === 200) expect(dinheiro.dados).toHaveLength(0);
  });
});
