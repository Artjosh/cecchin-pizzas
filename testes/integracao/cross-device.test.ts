import { afterAll, describe, expect, it } from "vitest";

import {
  Aparelho,
  apagarContas,
  emailDeTeste,
  entrar,
  esperarEmail,
  limparEmails,
  sql,
} from "./ajuda";

/**
 * Pedir no computador, confirmar no celular.
 *
 * Dois `Aparelho` com potes de cookies separados. Com um pote só, o teste
 * passaria mesmo se o fluxo dependesse do cookie de quem abriu o link — que é
 * exatamente o que ele NÃO pode depender.
 */

const criados: string[] = [];
function conta(prefixo: string): string {
  const e = emailDeTeste(prefixo);
  criados.push(e);
  return e;
}

afterAll(() => apagarContas(criados));

/** Abre o magic link e devolve a sessão que o GoTrue põe no fragmento. */
async function abrirLink(link: string): Promise<{
  destino: string;
  sessao: { access_token: string; refresh_token: string; expires_in: number };
}> {
  const r = await fetch(link, { redirect: "manual" });
  const destino = r.headers.get("location") ?? "";
  const fragmento = destino.includes("#") ? destino.split("#")[1] : "";
  const campos = new URLSearchParams(fragmento);

  return {
    destino,
    sessao: {
      access_token: campos.get("access_token") ?? "",
      refresh_token: campos.get("refresh_token") ?? "",
      expires_in: Number(campos.get("expires_in") ?? 3600),
    },
  };
}

describe("cross-device", () => {
  it("o computador entra sem nunca tocar no link", async () => {
    const email = conta("cross");
    await limparEmails();

    const computador = new Aparelho();
    const inicio = await computador.pedir("/api/auth/login?passo=iniciar", {
      corpo: { email },
    });
    const selector = inicio.corpo.selector;

    const antes = await computador.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector },
    });
    expect(antes.corpo.status).toBe("pendente");

    const { link } = await esperarEmail(email);
    const { destino, sessao } = await abrirLink(link);

    expect(destino).toContain("/entrar/confirmar");
    expect(destino).toContain(selector);

    // A sessão vem no FRAGMENTO, que não é enviado ao servidor. É exatamente
    // por isso que ele é usado para credencial.
    expect(destino.split("#")[0]).not.toContain("access_token");
    expect(sessao.access_token).not.toBe("");

    // O celular entrega a sessão ao nosso servidor, como a página de
    // confirmação faz.
    const celular = new Aparelho();
    const aprovacao = await celular.pedir("/api/auth/aprovar", {
      corpo: { selector, sessao },
    });
    expect(aprovacao.status).toBe(204);

    // E o computador entra, no ciclo seguinte.
    const depois = await computador.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector },
    });
    expect(depois.corpo.status).toBe("aprovado");
    expect(depois.texto).not.toContain("access_token");
    expect(computador.temCookie("cecchin_acesso")).toBe(true);

    const quem = await computador.pedir("/api/auth/sessao");
    expect(quem.corpo.usuario.email).toBe(email);

    // O celular, que só aprovou, não ganhou sessão no BFF.
    expect(celular.temCookie("cecchin_acesso")).toBe(false);
  });

  it("o pedido é de uso único: o polling seguinte não entra de novo", async () => {
    const email = conta("unico");
    await limparEmails();

    const pc = new Aparelho();
    const inicio = await pc.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    const selector = inicio.corpo.selector;

    const { link } = await esperarEmail(email);
    const { sessao } = await abrirLink(link);
    await new Aparelho().pedir("/api/auth/aprovar", { corpo: { selector, sessao } });

    expect((await pc.pedir("/api/auth/login?passo=consultar", { corpo: { selector } })).corpo.status)
      .toBe("aprovado");

    // Segunda vez: sumiu. É assim que a aba sabe parar de perguntar.
    const denovo = await new Aparelho().pedir("/api/auth/login?passo=consultar", {
      corpo: { selector },
    });
    expect(denovo.status).toBe(404);
  });
});

describe("o selector sozinho não aprova nada", () => {
  it("token inventado é recusado", async () => {
    const email = conta("token-falso");
    const pc = new Aparelho();
    const inicio = await pc.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });

    const r = await new Aparelho().pedir("/api/auth/aprovar", {
      corpo: {
        selector: inicio.corpo.selector,
        sessao: { access_token: "nao-e-um-token", refresh_token: "nem-este" },
      },
    });

    expect(r.status).toBe(401);
    const ainda = await pc.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: inicio.corpo.selector },
    });
    expect(ainda.corpo.status).toBe("pendente");
  });

  it("token VÁLIDO de outra conta não aprova este pedido", async () => {
    // O ataque que a comparação de e-mail existe para impedir: o selector é
    // público, e quem observasse uma requisição de polling teria metade do
    // caminho andado.
    const vitima = conta("vitima");
    const atacante = conta("atacante");

    // O atacante tem uma sessão legítima, da conta DELE.
    await limparEmails();
    const dele = new Aparelho();
    const inicioDele = await dele.pedir("/api/auth/login?passo=iniciar", {
      corpo: { email: atacante },
    });
    const { link } = await esperarEmail(atacante);
    const { sessao: sessaoDoAtacante } = await abrirLink(link);
    await dele.pedir("/api/auth/aprovar", {
      corpo: { selector: inicioDele.corpo.selector, sessao: sessaoDoAtacante },
    });

    // A vítima começa um login.
    const dela = new Aparelho();
    const inicioDela = await dela.pedir("/api/auth/login?passo=iniciar", {
      corpo: { email: vitima },
    });

    // O atacante tenta aprovar o pedido da vítima com o token dele.
    const tentativa = await new Aparelho().pedir("/api/auth/aprovar", {
      corpo: { selector: inicioDela.corpo.selector, sessao: sessaoDoAtacante },
    });

    expect(tentativa.status).toBe(401);

    const aindaPendente = await dela.pedir("/api/auth/login?passo=consultar", {
      corpo: { selector: inicioDela.corpo.selector },
    });
    expect(aindaPendente.corpo.status).toBe("pendente");
  });

  it("sessão malformada é recusada antes de qualquer consulta", async () => {
    const pc = new Aparelho();
    const inicio = await pc.pedir("/api/auth/login?passo=iniciar", {
      corpo: { email: conta("malformada") },
    });

    for (const sessao of [null, "texto", {}, { access_token: "a" }, 42]) {
      const r = await new Aparelho().pedir("/api/auth/aprovar", {
        corpo: { selector: inicio.corpo.selector, sessao },
      });
      expect(r.status, JSON.stringify(sessao)).toBe(401);
    }
  });

  it("pedido expirado não é aprovável nem com token bom", async () => {
    const email = conta("expira-aprova");
    await limparEmails();

    const pc = new Aparelho();
    const inicio = await pc.pedir("/api/auth/login?passo=iniciar", { corpo: { email } });
    const { link } = await esperarEmail(email);
    const { sessao } = await abrirLink(link);

    sql(`update pedido_login set expira_em = now() - interval '1 second'
          where selector = '${inicio.corpo.selector}'`);

    const r = await new Aparelho().pedir("/api/auth/aprovar", {
      corpo: { selector: inicio.corpo.selector, sessao },
    });
    expect(r.status).toBe(401);
  });
});

describe("a sessão sobrevive ao vencimento do access token", () => {
  it("o refresh renova sozinho, sem novo magic link", async () => {
    const email = conta("renova");
    const ap = await entrar(email);

    const antes = ap.valorDoCookie("cecchin_acesso");

    // Simula o access vencido apagando só ele: o servidor tem que usar o
    // refresh e gravar um par novo.
    const apenasRefresh = new Aparelho();
    (apenasRefresh as any).cookies.set(
      "cecchin_renovacao",
      ap.valorDoCookie("cecchin_renovacao"),
    );

    const r = await apenasRefresh.pedir("/api/auth/sessao");

    expect(r.status).toBe(200);
    expect(r.corpo.usuario.email).toBe(email);
    expect(apenasRefresh.temCookie("cecchin_acesso")).toBe(true);
    expect(apenasRefresh.valorDoCookie("cecchin_acesso")).not.toBe(antes);
  });

  it("refresh inválido não vira sessão", async () => {
    const ap = new Aparelho();
    (ap as any).cookies.set("cecchin_renovacao", "isto-nao-e-um-refresh-token");

    const r = await ap.pedir("/api/auth/sessao");
    expect(r.status).toBe(401);
  });
});
