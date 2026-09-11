import { describe, expect, it } from "vitest";

import {
  COOKIE_ACESSO,
  COOKIE_RENOVACAO,
  ehSessaoGoTrue,
  opcoesAcesso,
  opcoesRenovacao,
} from "@/src/servidor/sessao";

/**
 * As opções do cookie são segurança, não configuração.
 *
 * `httpOnly: false` ou um `sameSite` errado não quebram nenhum teste de
 * comportamento — a tela continua funcionando. O que muda é quem consegue ler
 * a sessão, e isso só aparece quando alguém procura. Por isso estão aqui,
 * afirmadas uma a uma.
 */
describe("cookies da sessão", () => {
  it("os dois cookies são httpOnly", () => {
    expect(opcoesAcesso().httpOnly).toBe(true);
    expect(opcoesRenovacao().httpOnly).toBe(true);
  });

  it("sameSite é lax, e não strict", () => {
    // `strict` não mandaria o cookie na navegação de topo vinda do cliente de
    // e-mail — quebrando justamente o caminho que o magic link existe para
    // servir.
    expect(opcoesAcesso().sameSite).toBe("lax");
    expect(opcoesRenovacao().sameSite).toBe("lax");
  });

  it("valem para o site inteiro", () => {
    expect(opcoesAcesso().path).toBe("/");
    expect(opcoesRenovacao().path).toBe("/");
  });

  it("o de renovação vive muito mais que o de acesso", () => {
    // É o que evita pedir um magic link novo a cada hora.
    expect(opcoesRenovacao().maxAge).toBeGreaterThan(opcoesAcesso().maxAge * 24);
  });

  it("respeita o tempo de vida que o provedor informou", () => {
    expect(opcoesAcesso(120).maxAge).toBe(120);
  });

  it("os nomes não colidem entre si", () => {
    expect(COOKIE_ACESSO).not.toBe(COOKIE_RENOVACAO);
  });
});

describe("ehSessaoGoTrue", () => {
  it("aceita o que tem os dois tokens", () => {
    expect(ehSessaoGoTrue({ access_token: "a", refresh_token: "b" })).toBe(true);
  });

  it.each([
    ["sem refresh", { access_token: "a" }],
    ["sem access", { refresh_token: "b" }],
    ["tokens não-texto", { access_token: 1, refresh_token: 2 }],
    ["nulo", null],
    ["indefinido", undefined],
    ["texto", "access_token=a"],
    ["vetor", []],
  ])("recusa %s", (_rotulo, valor) => {
    expect(ehSessaoGoTrue(valor)).toBe(false);
  });

  it("recusa a resposta de erro do GoTrue, que é objeto e não sessão", () => {
    // O caso que importa: uma falha do provedor não pode virar sessão vazia
    // gravada em cookie.
    expect(
      ehSessaoGoTrue({ error: "invalid_grant", error_description: "..." }),
    ).toBe(false);
  });
});
