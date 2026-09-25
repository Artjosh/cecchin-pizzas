import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const PROVEDORES_SOCIAIS = ["google", "apple"] as const;
export type ProvedorSocial = (typeof PROVEDORES_SOCIAIS)[number];

export function ehProvedorSocial(valor: string | null): valor is ProvedorSocial {
  return PROVEDORES_SOCIAIS.some((provedor) => provedor === valor);
}

/** Mantém a rota coerente com os botões que a configuração expõe. */
export function provedorSocialHabilitado(
  provedor: ProvedorSocial,
  habilitados: Record<ProvedorSocial, boolean>,
): boolean {
  return habilitados[provedor] === true;
}

/** Um verifier PKCE e um state anti-CSRF não dependem de estado em memória. */
export function segredoTemporario(): string {
  return randomBytes(48).toString("base64url");
}

export function desafioPkce(verificador: string): string {
  return createHash("sha256").update(verificador).digest("base64url");
}

export function igualEmTempoConstante(a: string, b: string): boolean {
  const esquerdo = Buffer.from(a);
  const direito = Buffer.from(b);
  return (
    esquerdo.length === direito.length &&
    esquerdo.length > 0 &&
    timingSafeEqual(esquerdo, direito)
  );
}
