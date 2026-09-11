/**
 * Cookies de sessão do BFF.
 *
 * **O token não vive no browser.** A sessão que o GoTrue emite fica em cookies
 * `httpOnly` gravados pelos route handlers do vinext. O JavaScript da página
 * nunca a enxerga, e por isso um XSS não tem o que roubar: guardar em
 * `localStorage` — o caminho mais comum — deixaria o token a uma linha de
 * distância de qualquer script injetado.
 *
 * São dois cookies porque são duas coisas com vidas diferentes: o `access_token`
 * vence em uma hora e é o que autentica cada consulta; o `refresh_token` vive
 * muito mais e serve só para pedir um access novo.
 */

/** Cookie httpOnly com o access token do GoTrue. */
export const COOKIE_ACESSO = "cecchin_acesso";

/** Cookie httpOnly com o refresh token do GoTrue. */
export const COOKIE_RENOVACAO = "cecchin_renovacao";

const UMA_HORA = 60 * 60;
const TRINTA_DIAS = 60 * 60 * 24 * 30;

const emProducao = process.env.NODE_ENV === "production";

/**
 * Opções do cookie de acesso.
 *
 * `sameSite: "lax"` e não `"strict"`: o retorno do magic link é uma navegação
 * de topo vinda do cliente de e-mail, e `strict` não mandaria o cookie nela —
 * o que quebraria justamente o caminho que o link existe para servir.
 *
 * `secure` só em produção, senão o cookie não seria aceito em `http://localhost`
 * durante o desenvolvimento.
 */
export function opcoesAcesso(maxAge: number = UMA_HORA) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: emProducao,
    path: "/",
    maxAge,
  };
}

export function opcoesRenovacao(maxAge: number = TRINTA_DIAS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: emProducao,
    path: "/",
    maxAge,
  };
}

/** O que o GoTrue devolve quando emite uma sessão. */
export interface SessaoGoTrue {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
}

export function ehSessaoGoTrue(valor: unknown): valor is SessaoGoTrue {
  if (typeof valor !== "object" || valor === null) return false;
  const s = valor as Record<string, unknown>;
  return typeof s.access_token === "string" && typeof s.refresh_token === "string";
}
