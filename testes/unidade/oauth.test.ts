import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  desafioPkce,
  ehProvedorSocial,
  igualEmTempoConstante,
  provedorSocialHabilitado,
  segredoTemporario,
} from "@/src/servidor/auth/oauth";

describe("OAuth do BFF", () => {
  it("aceita somente os provedores que a rota sabe iniciar", () => {
    expect(ehProvedorSocial("google")).toBe(true);
    expect(ehProvedorSocial("apple")).toBe(true);
    expect(ehProvedorSocial("github")).toBe(false);
    expect(ehProvedorSocial(null)).toBe(false);
  });

  it("não inicia um provedor conhecido que a configuração desligou", () => {
    const configuracao = { google: true, apple: false };
    expect(provedorSocialHabilitado("google", configuracao)).toBe(true);
    expect(provedorSocialHabilitado("apple", configuracao)).toBe(false);
  });

  it("gera um desafio PKCE S256 compatível", () => {
    const verifier = "verificador-de-teste";
    const esperado = createHash("sha256").update(verifier).digest("base64url");
    expect(desafioPkce(verifier)).toBe(esperado);
  });

  it("não reutiliza o segredo que protege state e verifier", () => {
    expect(segredoTemporario()).not.toBe(segredoTemporario());
  });

  it("não confunde state vazio, diferente ou com tamanhos distintos", () => {
    expect(igualEmTempoConstante("mesmo", "mesmo")).toBe(true);
    expect(igualEmTempoConstante("mesmo", "outro")).toBe(false);
    expect(igualEmTempoConstante("a", "ab")).toBe(false);
    expect(igualEmTempoConstante("", "")).toBe(false);
  });
});
