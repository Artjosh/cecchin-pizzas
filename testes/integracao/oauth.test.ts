import { describe, expect, it } from "vitest";

import { Aparelho } from "./ajuda";

describe("início do OAuth", () => {
  it("não deixa uma chamada direta iniciar Google quando ele está desligado", async () => {
    const navegador = new Aparelho();
    const resposta = await navegador.rota("/api/auth/oauth?provedor=google");

    expect(resposta.status).toBe(307);
    expect(resposta.destino).toContain("/entrar?erro=oauth");
    expect(navegador.temCookie("cecchin_oauth_estado")).toBe(false);
    expect(navegador.temCookie("cecchin_oauth_verificador")).toBe(false);
  });

  it("recusa callback sem state, verifier e código válidos", async () => {
    const navegador = new Aparelho();
    const resposta = await navegador.rota("/api/auth/oauth/retorno?code=falso&state=falso");

    expect(resposta.status).toBe(307);
    expect(resposta.destino).toContain("/entrar?erro=oauth");
    expect(navegador.temCookie("cecchin_acesso")).toBe(false);
    expect(navegador.temCookie("cecchin_renovacao")).toBe(false);
  });
});
