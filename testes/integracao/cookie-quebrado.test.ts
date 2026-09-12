import { describe, expect, it } from "vitest";

import { Aparelho, BFF } from "./ajuda";

/**
 * Sessão quebrada não pode travar o app.
 *
 * **O defeito que estes testes existem para impedir.** `cookies().set()` e
 * `.delete()` lançam quando chamados de Server Component, e a renovação da
 * sessão morava em `sessaoAtual()` — que o `app/layout.tsx` chama. Bastava o
 * access token vencer com um refresh inválido para TODA página virar 500,
 * inclusive `/entrar`, a única capaz de consertar.
 *
 * Quem usava o app ficava preso: a única saída era limpar cookie no navegador à
 * mão. Aconteceu duas vezes com o usuário deste projeto.
 *
 * Agora quem escreve é o proxy e `/api/auth/encerrar`, e a sessão quebrada
 * se limpa sozinha na primeira navegação.
 */

const QUEBRADOS: Array<[string, Record<string, string>]> = [
  ["só renovação inválida", { cecchin_renovacao: "nao-e-um-token" }],
  ["só acesso inválido", { cecchin_acesso: "nao-e-um-token" }],
  [
    "os dois inválidos",
    { cecchin_acesso: "nao-e-um-token", cecchin_renovacao: "nao-e-um-token" },
  ],
  [
    "acesso vazio com renovação inválida",
    { cecchin_acesso: "", cecchin_renovacao: "nao-e-um-token" },
  ],
];

function comCookies(pares: Record<string, string>): Aparelho {
  const ap = new Aparelho();
  for (const [nome, valor] of Object.entries(pares)) {
    ap.definirCookie(nome, valor);
  }
  return ap;
}

describe("nenhuma tela responde 500 com sessão quebrada", () => {
  for (const [rotulo, cookies] of QUEBRADOS) {
    for (const rota of ["/", "/entrar", "/cliente/contratar", "/operacional/despacho"]) {
      it(`${rota} com ${rotulo}`, async () => {
        const r = await comCookies(cookies).rota(rota);
        expect(r.status, `${rota} devolveu ${r.status}`).toBeLessThan(500);
      });
    }
  }

  it("/entrar continua carregando — é a tela que conserta", async () => {
    for (const [, cookies] of QUEBRADOS) {
      const r = await comCookies(cookies).rota("/entrar");
      expect(r.status).toBe(200);
    }
  });
});

describe("a sessão quebrada se limpa sozinha", () => {
  it("refresh morto: o proxy manda apagar os dois cookies", async () => {
    const r = await fetch(`${BFF}/cliente/contratar`, {
      headers: { cookie: "cecchin_renovacao=nao-e-um-token" },
      redirect: "manual",
    });

    const apagados = ((r.headers as any).getSetCookie?.() ?? []) as string[];
    const nomes = apagados.map((c) => c.split("=")[0]);

    expect(nomes).toContain("cecchin_acesso");
    expect(nomes).toContain("cecchin_renovacao");
    // Apagar é gravar vazio com data no passado.
    for (const c of apagados) {
      expect(c).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/i);
    }
  });

  it("acesso inválido: o guarda passa por /api/auth/encerrar", async () => {
    const r = await fetch(`${BFF}/cliente/contratar`, {
      headers: { cookie: "cecchin_acesso=nao-e-um-token" },
      redirect: "manual",
    });

    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/api/auth/encerrar");
  });

  it("e /api/auth/encerrar apaga e devolve ao login", async () => {
    const r = await fetch(`${BFF}/api/auth/encerrar?para=%2Fcliente%2Feventos`, {
      headers: { cookie: "cecchin_acesso=nao-e-um-token" },
      redirect: "manual",
    });

    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/entrar");
    expect(r.headers.get("location")).toContain("para=");

    const apagados = ((r.headers as any).getSetCookie?.() ?? []) as string[];
    expect(apagados.map((c) => c.split("=")[0])).toContain("cecchin_acesso");
  });

  it("não aceita destino para outro domínio", async () => {
    const r = await fetch(
      `${BFF}/api/auth/encerrar?para=https%3A%2F%2Fevil.com`,
      { redirect: "manual" },
    );

    const destino = r.headers.get("location") ?? "";
    expect(destino).not.toContain("evil.com");
    expect(destino).toContain("/entrar");
  });
});

describe("depois de limpar, dá para entrar de novo", () => {
  it("a tela de login funciona sem nenhum cookie", async () => {
    const r = await new Aparelho().rota("/entrar");
    expect(r.status).toBe(200);
    expect(r.texto).toContain("Receber acesso");
  });
});
