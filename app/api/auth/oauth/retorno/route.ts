import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { igualEmTempoConstante } from "@/src/servidor/auth/oauth";
import { destinoSeguro } from "@/src/servidor/auth/destino";
import { gravarSessao } from "@/src/servidor/auth/sessao-atual";
import { config } from "@/src/servidor/config";
import { ehSessaoGoTrue } from "@/src/servidor/sessao";
import { trocarCodigoOauth } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOKIE_ESTADO = "cecchin_oauth_estado";
const COOKIE_VERIFICADOR = "cecchin_oauth_verificador";
const COOKIE_DESTINO = "cecchin_oauth_destino";

function falha(request: NextRequest): NextResponse {
  const resposta = NextResponse.redirect(new URL("/entrar?erro=oauth", request.url));
  for (const nome of [COOKIE_ESTADO, COOKIE_VERIFICADOR, COOKIE_DESTINO]) {
    resposta.cookies.delete({ name: nome, path: "/api/auth/oauth" });
  }
  return resposta;
}

/** Termina o PKCE e converte a sessão do GoTrue nos cookies do BFF. */
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");
  const estado = request.nextUrl.searchParams.get("state");
  const jar = await cookies();
  const estadoEsperado = jar.get(COOKIE_ESTADO)?.value ?? "";
  const verificador = jar.get(COOKIE_VERIFICADOR)?.value ?? "";
  const destino = destinoSeguro(jar.get(COOKIE_DESTINO)?.value) ?? "/cliente/contratar";

  if (!codigo || !estado || !verificador || !igualEmTempoConstante(estado, estadoEsperado)) {
    return falha(request);
  }

  const sessao = await trocarCodigoOauth(codigo, verificador);
  if (!sessao.ok || !ehSessaoGoTrue(sessao.dados)) {
    return falha(request);
  }

  gravarSessao(jar, sessao.dados);
  const resposta = NextResponse.redirect(new URL(destino, config.auth.urlPublica));
  for (const nome of [COOKIE_ESTADO, COOKIE_VERIFICADOR, COOKIE_DESTINO]) {
    resposta.cookies.delete({ name: nome, path: "/api/auth/oauth" });
  }
  return resposta;
}
