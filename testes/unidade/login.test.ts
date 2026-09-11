import { describe, expect, it } from "vitest";

import { emailPlausivel, gerarSelector } from "@/src/servidor/auth/pedido";
import { podeReceber } from "@/src/servidor/auth/enderecos";

describe("emailPlausivel", () => {
  it.each([
    "arthur@exemplo.com",
    "a.b+tag@sub.exemplo.com.br",
    "MAIUSCULA@Exemplo.COM",
    "x@y.zz",
  ])("aceita %s", (valor) => {
    expect(emailPlausivel(valor)).toBe(true);
  });

  it.each([
    ["sem arroba", "arthur.exemplo.com"],
    ["arroba no começo", "@exemplo.com"],
    ["arroba no fim", "arthur@"],
    ["duas arrobas", "a@b@c.com"],
    ["sem ponto no domínio", "arthur@exemplo"],
    ["ponto colado na arroba", "arthur@.com"],
    ["ponto antes da arroba só", "a.b@c"],
    ["com espaço", "arthur @exemplo.com"],
    ["vazio", ""],
  ])("recusa %s", (_rotulo, valor) => {
    expect(emailPlausivel(valor)).toBe(false);
  });

  /*
   * A checagem é deliberadamente frouxa: validar e-mail por regex é um beco sem
   * saída conhecido, e a verificação de verdade é a entrega — só entra quem abre
   * a mensagem. Este teste registra a escolha para que ninguém a "corrija"
   * apertando a regra e recusando endereço válido de gente real.
   */
  it("não tenta ser RFC 5322", () => {
    expect(emailPlausivel("nome.sobrenome+rotulo@dominio-com-hifen.com.br")).toBe(true);
  });
});

describe("gerarSelector", () => {
  it("é url-safe: nada que precise de escape em query string", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(gerarSelector()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("tem entropia suficiente para não ser adivinhado", () => {
    // 24 bytes em base64url = 32 caracteres. O selector é público e viaja em
    // cada polling; o que o protege de ser sondado é o tamanho do espaço.
    expect(gerarSelector().length).toBe(32);
  });

  it("não repete", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 2000; i += 1) vistos.add(gerarSelector());
    expect(vistos.size).toBe(2000);
  });

  it("os bits variam em toda posição", () => {
    // Um gerador quebrado que fixasse um prefixo passaria nos testes acima.
    const amostras = Array.from({ length: 200 }, () => gerarSelector());
    for (let pos = 0; pos < 32; pos += 1) {
      const distintos = new Set(amostras.map((s) => s[pos]));
      expect(distintos.size).toBeGreaterThan(1);
    }
  });
});

describe("podeReceber", () => {
  it.each([
    "arthur@gmail.com",
    "contato@cecchinpizzas.com.br",
    "a@b.co",
  ])("aceita %s", (email) => {
    expect(podeReceber(email)).toBe(true);
  });

  it.each([
    ["TLD .test", "x@cecchin.test"],
    ["TLD .example", "x@algo.example"],
    ["TLD .invalid", "x@algo.invalid"],
    ["TLD .localhost", "x@algo.localhost"],
    ["example.com", "x@example.com"],
    ["example.net", "x@example.net"],
    ["example.org", "x@example.org"],
    ["sem domínio", "x@"],
    ["sem arroba", "x"],
  ])("suprime %s", (_r, email) => {
    expect(podeReceber(email)).toBe(false);
  });

  it("não confunde subdomínio com TLD reservada", () => {
    // `example.com.br` é domínio de verdade; `test.com` também. A reserva é
    // sobre a TLD, não sobre a palavra aparecer no meio.
    expect(podeReceber("x@example.com.br")).toBe(true);
    expect(podeReceber("x@test.com")).toBe(true);
    expect(podeReceber("x@meuexample.com")).toBe(true);
  });

  it("é insensível a maiúscula", () => {
    expect(podeReceber("X@CECCHIN.TEST")).toBe(false);
    expect(podeReceber("X@GMAIL.COM")).toBe(true);
  });
});
