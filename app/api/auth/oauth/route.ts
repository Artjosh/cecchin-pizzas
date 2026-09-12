import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { config } from "@/src/servidor/config";
import {
  desafioPkce,
  ehProvedorSocial,
  provedorSocialHabilitado,
  segredoTemporario,
} from "@/src/servidor/auth/oauth";
import { destinoSeguro } from "@/src/servidor/auth/destino";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIDA_OAUTH_S = 10 * 60;
const COOKIE_ESTADO = "cecchin_oauth_estado";
const COOKIE_VERIFICADOR = "cecchin_oauth_verificador";
const COOKIE_DESTINO = "cecchin_oauth_destino";

/** Inicia Google ou Apple sem expor verifier, token ou segredo ao browser. */
export async function GET(request: NextRequest) {
  const provedor = request.nextUrl.searchParams.get("provedor");
  if (
    !ehProvedorSocial(provedor) ||
    !provedorSocialHabilitado(provedor, {
      google: config.auth.googleHabilitado,
      apple: config.auth.appleHabilitado,
    })
  ) {
    return NextResponse.redirect(new URL("/entrar?erro=oauth", request.url));
  }

  const destino =
    destinoSeguro(request.nextUrl.searchParams.get("para")) ?? "/cliente/contratar";
  const estado = segredoTemporario();
  const verificador = segredoTemporario();
  const retorno = `${config.auth.urlPublica.replace(/\/$/, "")}/api/auth/oauth/retorno`;
  const autorizar = new URL("/auth/v1/authorize", config.supabase.url);

  autorizar.searchParams.set("provider", provedor);
  autorizar.searchParams.set("redirect_to", retorno);
  autorizar.searchParams.set("flow_type", "pkce");
  autorizar.searchParams.set("code_challenge", desafioPkce(verificador));
  autorizar.searchParams.set("code_challenge_method", "s256");
  autorizar.searchParams.set("state", estado);

  const resposta = NextResponse.redirect(autorizar);
  const opcoes = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/oauth",
    maxAge: VIDA_OAUTH_S,
  };
  resposta.cookies.set(COOKIE_ESTADO, estado, opcoes);
  resposta.cookies.set(COOKIE_VERIFICADOR, verificador, opcoes);
  resposta.cookies.set(COOKIE_DESTINO, destino, opcoes);
  return resposta;
}
