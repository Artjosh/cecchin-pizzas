import { describe, expect, it } from "vitest";

import { statusDaFalha, type FalhaLogin } from "@/src/servidor/auth/pedido";

/**
 * O status HTTP de cada falha de login.
 *
 * Parece detalhe e não é: a tela decide o que dizer a partir do status, e
 * confundir dois deles manda a pessoa fazer a coisa errada. Dizer "código
 * incorreto" quando o GoTrue está fora do ar faz alguém tentar de novo até
 * gastar as tentativas por uma falha que não é dela.
 */
describe("statusDaFalha", () => {
  it.each([
    ["nao_encontrado", 404],
    ["codigo_invalido", 401],
    ["tentativas_demais", 429],
    ["email_invalido", 400],
    ["provedor_indisponivel", 503],
  ] as const)("%s vira %i", (falha, status) => {
    expect(statusDaFalha(falha)).toBe(status);
  });

  it("provedor fora do ar é 503, nunca 401", () => {
    // 401 diria ao cliente que ele errou a credencial. Ele não errou nada.
    expect(statusDaFalha("provedor_indisponivel")).not.toBe(401);
    expect(statusDaFalha("provedor_indisponivel")).toBeGreaterThanOrEqual(500);
  });


  it("toda falha declarada tem status", () => {
    const todas: FalhaLogin[] = [
      "nao_encontrado",
      "codigo_invalido",
      "tentativas_demais",
      "email_invalido",
      "provedor_indisponivel",
    ];
    for (const f of todas) {
      expect(typeof statusDaFalha(f)).toBe("number");
    }
  });
});
