import { afterAll, describe, expect, it } from "vitest";

import { apagarContas, Aparelho, emailDeTeste, entrar } from "./ajuda";

const contas: string[] = [];

afterAll(() => apagarContas(contas));

describe("perfil", () => {
  it("mostra a identidade da sessão e não um formulário de dados inexistentes", async () => {
    const email = emailDeTeste("perfil");
    contas.push(email);
    const aparelho: Aparelho = await entrar(email);

    const resposta = await aparelho.pedir("/cliente/perfil");

    expect(resposta.status).toBe(200);
    expect(resposta.texto).toContain(email);
    expect(resposta.texto).toContain("Cliente");
    expect(resposta.texto).not.toContain("000.000.000-00");
  });
});
