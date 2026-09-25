import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { limparSessao } from "@/src/servidor/auth/sessao-atual";
import { destinoSeguro } from "@/src/servidor/auth/destino";

/**
 * Apaga a sessão quebrada e devolve a pessoa ao login.
 *
 * Existe porque Server Component NÃO pode escrever cookie — `cookies().delete()`
 * lança lá. Quando `lerSessao()` encontra cookie que não presta, o guarda manda
 * para cá: route handler pode limpar, e a navegação seguinte já chega limpa.
 *
 * Sem este caminho, a pessoa ficava presa: cookie inválido derrubava toda
 * página, inclusive `/entrar`, e a única saída era limpar cookie no navegador à
 * mão. Aconteceu duas vezes com o usuário deste projeto.
 *
 * `GET` porque é destino de redirecionamento, não ação do usuário. Não é
 * logout: não revoga nada no GoTrue, porque o token já não vale — revogar um
 * token morto seria uma ida de rede para nada.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const jar = await cookies();
  limparSessao(jar);

  const para = destinoSeguro(request.nextUrl.searchParams.get("para"));
  const destino = new URL("/entrar", request.url);
  if (para) destino.searchParams.set("para", para);

  return NextResponse.redirect(destino);
}
