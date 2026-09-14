import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  Aparelho,
  apagarContas,
  codigoDeAcesso,
  emailDeTeste,
  entrar,
  esperarEmail,
  limparEmails,
  sql,
} from "./ajuda";

/**
 * O fluxo de acesso, contra os serviços de verdade.
 *
 * Tudo aqui fala HTTP com o BFF, que fala com o GoTrue e o PostgREST. As
 * afirmações centrais — que o corpo nunca traz token, que o cookie sai
 * `HttpOnly`, que o selector sozinho não aprova — só valem se ninguém no meio
 * for um mock.
 */

const criados: string[] = [];
function conta(prefixo: string): string {
  const e = emailDeTeste(prefixo);
  criados.push(e);
  return e;
}

afterAll(() => apagarContas(criados));

describe("pedir acesso", () => {
  it("devolve selector e não devolve token nenhum", async () => {
    const email = conta("pede");
    const ap = new Aparelho();

    const r = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    expect(r.status).toBe(200);
    expect(r.corpo.selector).toMatch(/^[A-Za-z0-9_-]{32}$/);

    // `false` porque o endereço está em TLD reservada: o envio é suprimido de
    // propósito. O que importa aqui é que o PEDIDO nasce mesmo assim — quem
    // pede já recebeu o selector e já começou a pollar.
    expect(r.corpo.email_enviado).toBe(false);

    expect(r.texto).not.toContain("access_token");
    expect(r.texto).not.toContain("refresh_token");
  });

  it("não grava cookie antes de alguém confirmar", async () => {
    const ap = new Aparelho();
    await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email: conta("semcookie") } });
    expect(ap.temCookie("cecchin_acesso")).toBe(false);
  });

  it.each([
    ["e-mail sem arroba", "invalido.exemplo.com"],
    ["vazio", ""],
    ["número", 42],
    ["nulo", null],
  ])("recusa %s com 400", async (_r, email) => {
    const ap = new Aparelho();
    const r = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    expect(r.status).toBe(400);
    expect(r.corpo.codigo).toBe("email_invalido");
  });

  it("recusa JSON malformado sem quebrar", async () => {
    const r = await fetch(`${process.env.ALVO_BFF ?? "http://localhost:3000"}/api/auth/login?passo=iniciar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{isto nao e json",
    });
    expect(r.status).toBe(400);
  });

  it("o segundo pedido antes do prazo é recusado, e o primeiro continua valendo", async () => {
    const email = conta("reenvio");
    const ap = new Aparelho();

    const primeiro = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    const segundo = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    expect(segundo.status).toBe(200);
    expect(segundo.corpo.selector).toBe(primeiro.corpo.selector);
    expect(segundo.corpo.reenviar_em).toBeTruthy();

    // O ponto: o pedido anterior NÃO foi invalidado. Quem pede de novo cedo
    // demais fica com o que já tem — invalidar e recusar deixaria a pessoa sem
    // nenhum caminho de entrada.
    const consulta = await ap.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: primeiro.corpo.selector },
    });
    expect(consulta.corpo.status).toBe("pendente");
  });

  it("um pedido novo para o mesmo e-mail invalida o anterior", async () => {
    const email = conta("invalida");
    const ap = new Aparelho();

    const primeiro = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    // Fura a espera de reenvio pelo banco, para exercer o caminho de
    // invalidação sem esperar um minuto de relógio.
    sql(`update pedido_login set criado_em = now() - interval '2 hours'
          where email = '${email}'`);

    const segundo = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    expect(segundo.status).toBe(200);

    const antigo = await ap.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: primeiro.corpo.selector },
    });
    expect(antigo.status).toBe(404);
  });
});

describe("o e-mail", () => {
  /*
   * Só roda com o SMTP LOCAL ligado (Mailpit). Com a Brevo configurada a
   * mensagem sai para o mundo e não há caixa para ler — o resto da suíte não
   * depende disto porque pega o código por `admin/generate_link`.
   *
   * O endereço aqui precisa ser enviável: os demais testes usam TLD reservada,
   * para a qual o BFF suprime o envio de propósito.
   */
  it("chega com o nosso template, com link E código", async () => {
    /*
     * Registrado em `criados` e NÃO apagado no fim do teste: os `return`
     * antecipados abaixo pulariam a limpeza, e cada execução com SMTP externo
     * deixava uma conta órfã no banco. Aconteceu: seis delas.
     */
    const email = `prova.template.${Date.now().toString(36)}@mailpit.local`;
    criados.push(email);
    await limparEmails();

    const ap = new Aparelho();
    const r = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    if (!r.corpo.email_enviado) {
      // SMTP externo ligado: a mensagem saiu para a Brevo, não para o Mailpit.
      return;
    }

    let entregue;
    try {
      entregue = await esperarEmail(email);
    } catch {
      return; // sem Mailpit, nada a afirmar aqui
    }

    expect(entregue.assunto).toBe("Seu acesso ao Cecchin Pizzas");
    expect(entregue.codigo).toMatch(/^\d{6}$/);
    expect(entregue.link).toContain("/entrar/confirmar");
    expect(entregue.link).toContain("#token_hash=");
    expect(entregue.link).toContain("type=magiclink");

    // O selector viaja no `redirect_to`: é o fio que liga o clique no celular
    // ao pedido pollado no computador.
    expect(decodeURIComponent(entregue.link)).toContain(r.corpo.selector);
    expect(decodeURIComponent(entregue.link)).toContain("/entrar/confirmar");
  });

  it("domínio reservado por RFC não recebe envio, e o pedido continua válido", async () => {
    /*
     * Hard bounce corrói a entregabilidade de TODO o resto — inclusive do
     * e-mail de acesso de um cliente real. Domínio que não existe é suprimido
     * antes de chegar ao provedor.
     */
    const ap = new Aparelho();
    const r = await ap.pedir("/api/auth/login?passo=iniciar", {
      corpo: { email: conta("reservado") },
    });

    expect(r.status).toBe(200);
    expect(r.corpo.email_enviado).toBe(false);
    expect(r.corpo.selector).toBeTruthy();

    // O pedido existe: o que falta é canal de entrega, não o pedido.
    const consulta = await ap.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: r.corpo.selector },
    });
    expect(consulta.corpo.status).toBe("pendente");
  });
});

describe("entrar pelo código", () => {
  it("grava a sessão em cookie e não devolve token no corpo", async () => {
    const email = conta("codigo");

    const ap = new Aparelho();
    const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    const { codigo } = await codigoDeAcesso(email);

    const r = await ap.pedir("/api/auth/login?passo=codigo", {
      corpo: { selector: inicio.corpo.selector, codigo },
    });

    expect(r.status).toBe(200);
    expect(r.corpo).toEqual({ status: "aprovado" });
    expect(r.texto).not.toContain("access_token");

    expect(ap.temCookie("cecchin_acesso")).toBe(true);
    expect(ap.temCookie("cecchin_renovacao")).toBe(true);
  });

  it("o cookie sai HttpOnly, SameSite=Lax e com Path=/", async () => {
    // As três coisas que decidem quem consegue ler a sessão. Nenhuma quebra
    // funcionalidade quando está errada — só aparece se alguém afirmar.
    const ap = await entrar(conta("atributos"));

    for (const nome of ["cecchin_acesso", "cecchin_renovacao"]) {
      const attrs = ap.atributos.get(nome) ?? "";
      expect(attrs, `${nome} precisa ser httponly`).toContain("httponly");
      expect(attrs, `${nome} precisa ser samesite=lax`).toContain("samesite=lax");
      expect(attrs, `${nome} precisa valer no site inteiro`).toContain("path=/");
    }
  });

  it("código errado devolve 401 e não entra", async () => {
    const email = conta("errado");
    const ap = new Aparelho();
    const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    const r = await ap.pedir("/api/auth/login?passo=codigo", {
      corpo: { selector: inicio.corpo.selector, codigo: "000000" },
    });

    expect(r.status).toBe(401);
    expect(r.corpo.codigo).toBe("codigo_invalido");
    expect(ap.temCookie("cecchin_acesso")).toBe(false);
  });

  it("cada erro conta uma tentativa, e o pedido morre no limite", async () => {
    const email = conta("tentativas");
    const ap = new Aparelho();
    const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    const selector = inicio.corpo.selector;

    for (let i = 0; i < 5; i += 1) {
      await ap.pedir("/api/auth/login?passo=codigo", { corpo: { selector, codigo: "000000" } });
    }

    const r = await ap.pedir("/api/auth/login?passo=codigo", {
      corpo: { selector, codigo: "000000" },
    });
    expect(r.status).toBe(429);
    expect(r.corpo.codigo).toBe("tentativas_demais");

    // Destruído: nem o código certo serve mais.
    const depois = await ap.pedir("/api/auth/login?passo=consultar", { corpo: { selector } });
    expect(depois.status).toBe(404);
  });

  it("pedido expirado não vira sessão", async () => {
    const email = conta("expirado");
    const ap = new Aparelho();
    const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    /*
     * Uma hora para trás, e não um segundo.
     *
     * O `now()` é o relógio do Postgres, dentro do Docker; a comparação de
     * vencimento acontece no Node, no relógio do host. Os dois derivam — a VM
     * do Docker Desktop já apareceu dois segundos à frente aqui — e com margem
     * de um segundo o teste passa a depender de qual relógio está na frente no
     * momento. Uma hora é maior do que qualquer deriva plausível e não muda o
     * que se está medindo: o pedido está vencido.
     */
    sql(`update pedido_login set expira_em = now() - interval '1 hour'
          where selector = '${inicio.corpo.selector}'`);

    const r = await ap.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: inicio.corpo.selector },
    });
    expect(r.status).toBe(404);
  });

  it("selector inventado não encontra nada", async () => {
    const ap = new Aparelho();
    const r = await ap.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: "selector-que-nunca-existiu-0000000" },
    });
    expect(r.status).toBe(404);
  });

  it("passo desconhecido é recusado", async () => {
    const ap = new Aparelho();
    const r = await ap.pedir("/api/auth/login?passo=inventado", { corpo: {} });
    expect(r.status).toBe(400);
    expect(r.corpo.codigo).toBe("passo_invalido");
  });
});

describe("a conta que nasce", () => {
  it("o primeiro acesso cria perfil de cliente, sem tela de cadastro", async () => {
    const email = conta("nasce");
    await entrar(email);

    expect(sql(`select papel from usuario where email = '${email}'`)).toBe("cliente");
    expect(sql(`select ativo from usuario where email = '${email}'`)).toBe("t");
  });

  it("a sessão diz quem é, e nunca o token", async () => {
    const email = conta("sessao");
    const ap = await entrar(email);

    const r = await ap.pedir("/api/auth/sessao");

    expect(r.status).toBe(200);
    expect(r.corpo.usuario.email).toBe(email);
    expect(r.corpo.usuario.papel).toBe("cliente");
    expect(r.texto).not.toContain("access_token");
    expect(r.texto).not.toContain("eyJ"); // nenhum JWT no corpo
  });

  it("sem cookie não há sessão", async () => {
    const ap = new Aparelho();
    const r = await ap.pedir("/api/auth/sessao");
    expect(r.status).toBe(401);
    expect(r.corpo.codigo).toBe("sem_sessao");
  });
});

describe("sair", () => {
  it("apaga os cookies e revoga no provedor", async () => {
    const email = conta("sair");
    const ap = await entrar(email);
    const tokenAntigo = ap.valorDoCookie("cecchin_acesso");

    const saida = await ap.pedir("/api/auth/sessao", { metodo: "DELETE" });
    expect(saida.status).toBe(200);
    expect(ap.temCookie("cecchin_acesso")).toBe(false);
    expect(ap.temCookie("cecchin_renovacao")).toBe(false);

    const depois = await ap.pedir("/api/auth/sessao");
    expect(depois.status).toBe(401);

    // O que importa: o token não vale mais NO GOTRUE. Apagar só o cookie
    // deixaria o refresh válido por trinta dias — e "sair" não teria surtido
    // efeito onde importa.
    const noProvedor = await fetch("http://127.0.0.1:54321/auth/v1/user", {
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY ?? "",
        authorization: `Bearer ${tokenAntigo}`,
      },
    });
    expect(noProvedor.ok).toBe(false);
  });
});

describe("a varredura de pedidos vencidos", () => {
  it("cada pedido de acesso leva junto os vencidos de todo mundo", async () => {
    /*
     * `pedido_login.sessao` é credencial em repouso — a sessão que atravessa do
     * celular para o computador. "Vive minutos" só é verdade se alguém apagar,
     * e sem cron quem apaga é o próprio fluxo de login.
     */
    // Idempotente: uma execução interrompida no meio não pode impedir a
    // próxima de rodar.
    sql(`delete from pedido_login where selector = 'selector-vencido-de-teste'`);
    sql(`insert into pedido_login (email, selector, expira_em)
         values ('lixo-de-teste@exemplo.com', 'selector-vencido-de-teste',
                 now() - interval '1 hour')`);

    expect(
      sql(`select count(*) from pedido_login
            where selector = 'selector-vencido-de-teste'`),
    ).toBe("1");

    await new Aparelho().pedir("/api/auth/login?passo=iniciar", {
      corpo: { email: conta("varredura") },
    });

    expect(
      sql(`select count(*) from pedido_login
            where selector = 'selector-vencido-de-teste'`),
    ).toBe("0");
  });

  it("mas não leva os que ainda valem", async () => {
    const email = conta("nao-varre");
    const ap = new Aparelho();
    const inicio = await ap.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    await new Aparelho().pedir("/api/auth/login?passo=iniciar", {
      corpo: { email: conta("outro-login") },
    });

    const ainda = await ap.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: inicio.corpo.selector },
    });
    expect(ainda.corpo.status).toBe("pendente");
  });
});
