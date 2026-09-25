import { afterAll, describe, expect, it } from "vitest";

import {
  Aparelho,
  apagarContas,
  codigoDeAcesso,
  emailDeTeste,
  entrar,
  sql,
} from "./ajuda";

/**
 * O elo entre responsável e conta, por HTTP.
 *
 * É o que faz "Minha rota" existir: a tela mostra os eventos cujo responsável é
 * a conta de quem está olhando. Sem o elo, quem trabalha em campo entra no
 * sistema e não encontra o próprio trabalho.
 *
 * A metade que mais importa é a de baixo: `staff` tem escrita na tabela
 * `responsavel`, e sem a trava no banco poderia apontar o próprio id para
 * qualquer responsável com um PATCH direto no PostgREST — passando a ver a
 * rota de outra pessoa sem abrir tela nenhuma.
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
 * Limpeza por PREFIXO de slug, não por lista de ids colhida na execução: uma
 * rodada interrompida no meio deixa a lista pela metade e as linhas ficam no
 * banco de dev para sempre.
 */
const MARCA = "prova-elo";

afterAll(() => {
  sql(`delete from responsavel where slug like '${MARCA}-%'`);
  apagarContas(criados);
});

/**
 * Um responsável de teste, sem conta ligada.
 *
 * O INSERT vai dentro de uma CTE com um SELECT por fora, e não `insert ...
 * returning` direto: `psql -tAc` imprime o id E a etiqueta do comando
 * (`INSERT 0 1`) na linha seguinte, e o id chegava aqui com lixo colado. O
 * PATCH então recusava com "responsável não encontrado" — um 403 que parecia
 * problema de permissão e era string malformada.
 */
function criarResponsavel(apelido: string): string {
  const marca = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  return sql(
    `with novo as (
       insert into responsavel (organizacao_id, slug, nome)
       values (app.org_padrao(), '${MARCA}-${apelido}-${marca}',
               'Prova Elo ${apelido} ${marca}')
       returning id
     ) select id from novo`,
  );
}

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

describe("ligar conta a responsável", () => {
  it("gestão liga, e o elo aparece no banco", async () => {
    const gestao = await entrarComo("elo.gestao", "gestao");
    const emailStaff = conta("elo.staff");
    await entrar(emailStaff);
    sql(`update usuario set papel = 'staff' where email = '${emailStaff}'`);

    const resp = criarResponsavel("a");

    const r = await gestao.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: resp, usuario: idDe(emailStaff) },
    });

    expect(r.status).toBe(200);
    expect(r.corpo.ligado).toBe(true);
    expect(sql(`select usuario_id from responsavel where id = '${resp}'`)).toBe(
      idDe(emailStaff),
    );
  });

  it("desligar devolve o responsável ao estado sem conta", async () => {
    const gestao = await entrarComo("elo.desliga", "gestao");
    const emailStaff = conta("elo.staff2");
    await entrar(emailStaff);
    sql(`update usuario set papel = 'staff' where email = '${emailStaff}'`);

    const resp = criarResponsavel("b");
    await gestao.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: resp, usuario: idDe(emailStaff) },
    });

    const r = await gestao.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: resp, usuario: "" },
    });

    expect(r.status).toBe(200);
    expect(r.corpo.ligado).toBe(false);
    expect(sql(`select usuario_id from responsavel where id = '${resp}'`)).toBe("");
  });

  it("a mesma conta não liga a dois responsáveis", async () => {
    const gestao = await entrarComo("elo.duplo", "gestao");
    const emailStaff = conta("elo.staff3");
    await entrar(emailStaff);
    sql(`update usuario set papel = 'staff' where email = '${emailStaff}'`);
    const id = idDe(emailStaff);

    const primeiro = criarResponsavel("c");
    const segundo = criarResponsavel("d");

    const um = await gestao.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: primeiro, usuario: id },
    });
    expect(um.status).toBe(200);

    const dois = await gestao.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: segundo, usuario: id },
    });

    expect(dois.status).toBe(403);
    // A mensagem diz A QUEM já está ligada, não "duplicate key value".
    expect(dois.corpo.mensagem).toContain("já está ligada");
    expect(sql(`select usuario_id from responsavel where id = '${segundo}'`)).toBe("");
  });

  it("conta de cliente é recusada com instrução", async () => {
    const gestao = await entrarComo("elo.cli", "gestao");
    const emailCliente = conta("elo.cliente");
    await entrar(emailCliente);

    const resp = criarResponsavel("e");

    const r = await gestao.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: resp, usuario: idDe(emailCliente) },
    });

    expect(r.status).toBe(403);
    expect(r.corpo.mensagem).toContain("promova a staff");
  });

  it("staff não liga pela rota", async () => {
    const staff = await entrarComo("elo.staffrota", "staff");
    const resp = criarResponsavel("f");

    const r = await staff.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: resp, usuario: idDe(conta("nao.existe")) || null },
    });

    expect(r.status).toBe(403);
    expect(r.corpo.codigo).toBe("sem_papel");
  });

  it("sem sessão é 401, não HTML de login", async () => {
    const r = await new Aparelho().pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: { responsavel: criarResponsavel("g"), usuario: "" },
    });
    expect(r.status).toBe(401);
  });

  it("responsável que não existe é recusado", async () => {
    const gestao = await entrarComo("elo.fantasma", "gestao");
    const r = await gestao.pedir("/api/operacao/responsavel", {
      metodo: "PATCH",
      corpo: {
        responsavel: "00000000-0000-0000-0000-000000000000",
        usuario: "",
      },
    });
    expect(r.status).toBe(403);
  });
});

/**
 * O BFF fora do caminho.
 *
 * Recusar na rota é conveniência. Se a regra vivesse só no handler, tudo aqui
 * passaria — e passar significa um pizzaiolo vendo a rota de outra pessoa com
 * um PATCH no PostgREST, que a URL do Supabase e a chave anon são públicas por
 * desenho.
 */
describe("staff falando direto com o PostgREST", () => {
  async function tokenDe(prefixo: string, papel: string): Promise<string> {
    const email = conta(prefixo);
    const ap = new Aparelho();
    const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    expect(inicio.status).toBe(200);

    const { codigo } = await codigoDeAcesso(email);

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

  it("NÃO aponta a própria conta para um responsável", async () => {
    const email = conta("pg.elo.staff");
    const token = await tokenDe2(email, "staff");
    const resp = criarResponsavel("h");

    const r = await rest(`responsavel?id=eq.${resp}`, token, {
      method: "PATCH",
      body: JSON.stringify({ usuario_id: idDe(email) }),
    });

    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(sql(`select usuario_id from responsavel where id = '${resp}'`)).toBe("");
  });

  it("mas continua corrigindo o nome — a trava é da coluna, não da linha", async () => {
    const token = await tokenDe("pg.elo.nome", "staff");
    const resp = criarResponsavel("i");

    const r = await rest(`responsavel?id=eq.${resp}`, token, {
      method: "PATCH",
      body: JSON.stringify({ nome: "Prova Elo corrigido pelo staff" }),
    });

    expect(r.status).toBe(200);
    expect(sql(`select nome from responsavel where id = '${resp}'`)).toBe(
      "Prova Elo corrigido pelo staff",
    );
  });

  it("gestão liga pela função e funciona", async () => {
    const emailStaff = conta("pg.elo.alvo");
    await entrar(emailStaff);
    sql(`update usuario set papel = 'staff' where email = '${emailStaff}'`);

    const token = await tokenDe("pg.elo.gestao", "gestao");
    const resp = criarResponsavel("j");

    const r = await rest("rpc/ligar_responsavel", token, {
      method: "POST",
      body: JSON.stringify({ p_responsavel: resp, p_usuario: idDe(emailStaff) }),
    });

    expect(r.status).toBeLessThan(300);
    expect(sql(`select usuario_id from responsavel where id = '${resp}'`)).toBe(
      idDe(emailStaff),
    );
  });

  /** Como `tokenDe`, mas com e-mail já escolhido por quem chama. */
  async function tokenDe2(email: string, papel: string): Promise<string> {
    const ap = new Aparelho();
    await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    const { codigo } = await codigoDeAcesso(email);

    const r = await fetch(`${SUPABASE}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: ANON, "content-type": "application/json" },
      body: JSON.stringify({ email, token: codigo, type: "email" }),
    });
    const sessao = await r.json();

    sql(`update usuario set papel = '${papel}' where email = '${email}'`);
    return sessao.access_token as string;
  }
});
