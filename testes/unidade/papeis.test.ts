import { describe, expect, it } from "vitest";

import {
  PAPEIS,
  podeAcessar,
  type Papel,
} from "@/src/servidor/auth/sessao-atual";
import { rotaInicial } from "@/src/servidor/auth/guarda";

/**
 * A hierarquia de papéis, exaustiva.
 *
 * Quatro papéis por quatro exigências são dezesseis combinações. Testar todas
 * custa nada e é a única forma de garantir que uma tabela escrita à mão não tem
 * uma célula errada — que é exatamente o tipo de erro que ninguém encontra
 * lendo.
 */

const ESPERADO: Record<Papel, Record<Papel, boolean>> = {
  //            cliente  staff  gestao  admin   <- o que a rota exige
  cliente: { cliente: true, staff: false, gestao: false, admin: false },
  staff: { cliente: true, staff: true, gestao: false, admin: false },
  gestao: { cliente: true, staff: true, gestao: true, admin: false },
  admin: { cliente: true, staff: true, gestao: true, admin: true },
};

describe("podeAcessar", () => {
  for (const quem of PAPEIS) {
    for (const exigido of PAPEIS) {
      const permite = ESPERADO[quem][exigido];
      it(`${quem} ${permite ? "alcança" : "NÃO alcança"} rota de ${exigido}`, () => {
        expect(podeAcessar(quem, [exigido])).toBe(permite);
      });
    }
  }

  it("uma lista de exigências basta satisfazer uma", () => {
    expect(podeAcessar("staff", ["gestao", "staff"])).toBe(true);
  });

  it("lista vazia não libera nada", () => {
    // Uma rota que esquecesse de declarar o papel exigido não pode virar rota
    // pública por omissão.
    expect(podeAcessar("admin", [])).toBe(false);
  });

  it("cliente não alcança nada da operação, em nenhuma combinação", () => {
    expect(podeAcessar("cliente", ["staff", "gestao", "admin"])).toBe(false);
  });
});

describe("rotaInicial", () => {
  it.each([
    ["cliente", "/cliente/contratar"],
    ["staff", "/operacional/minha-rota"],
    ["gestao", "/operacional/despacho"],
    ["admin", "/operacional/despacho"],
  ] as const)("%s começa em %s", (papel, rota) => {
    expect(rotaInicial(papel)).toBe(rota);
  });

  it("todo papel cai numa rota que o próprio papel alcança", () => {
    // Um destino que o papel não pudesse abrir produziria um laço de
    // redirecionamento entre o guarda e a rota inicial.
    for (const papel of PAPEIS) {
      const destino = rotaInicial(papel);
      const exige: Papel = destino.startsWith("/operacional")
        ? "staff"
        : "cliente";
      expect(podeAcessar(papel, [exige])).toBe(true);
    }
  });
});
