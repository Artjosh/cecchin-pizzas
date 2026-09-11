import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_ACESSO, COOKIE_RENOVACAO } from "./src/servidor/sessao";

/**
 * Corte grosso: quem não tem sessão nenhuma não chega às telas internas.
 *
 * **O que este middleware deliberadamente NÃO faz: checar papel.** Ele roda em
 * toda requisição e só enxerga cookie; saber o papel exigiria uma consulta ao
 * banco por navegação, e um papel lido de cookie seria um papel que o cliente
 * escolhe. O papel é decidido nos layouts, que são Server Components e leem de
 * `usuario` sob RLS — ver `src/servidor/auth/guarda.ts`.
 *
 * Ou seja: aqui mora "tem sessão?", lá mora "pode isto?", e no Postgres mora a
 * regra que vale mesmo que as duas falhem.
 *
 * A presença do cookie não prova nada sobre validade — um token expirado passa
 * por este teste. E está certo que passe: quem valida é a camada de baixo, e
 * fazer a validação aqui pagaria uma ida ao GoTrue em cada arquivo estático.
 */

const PUBLICAS = ["/entrar", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const temSessao =
    request.cookies.has(COOKIE_ACESSO) || request.cookies.has(COOKIE_RENOVACAO);

  if (temSessao) return NextResponse.next();

  /*
   * O destino vai junto para a pessoa voltar onde queria estar depois de
   * entrar. Só o caminho e a query — nunca a URL absoluta vinda do pedido, que
   * permitiria mandar o retorno para outro domínio.
   */
  const login = new URL("/entrar", request.url);
  if (pathname !== "/") {
    login.searchParams.set("para", pathname + request.nextUrl.search);
  }

  return NextResponse.redirect(login);
}

export const config = {
  /*
   * Fora do corte: os estáticos do build e o favicon. Sem esta exclusão, cada
   * arquivo de bundle passaria pelo middleware e um usuário deslogado receberia
   * redirect no lugar do JavaScript da própria tela de login.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
