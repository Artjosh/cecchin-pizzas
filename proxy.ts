import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_ACESSO, COOKIE_RENOVACAO, ehSessaoGoTrue } from "./src/servidor/sessao";
import { renovarSessao } from "./src/servidor/supabase";

/**
 * Corte grosso, e o único lugar do fluxo de render que pode ESCREVER cookie.
 *
 * Duas responsabilidades:
 *
 *   1. quem não tem sessão nenhuma não chega às telas internas;
 *   2. quem tem o access vencido e o refresh bom recebe um par novo, aqui,
 *      antes de qualquer componente rodar.
 *
 * **A segunda existe por causa de um defeito que travava o app inteiro.**
 * `cookies().set()` lança quando chamado de Server Component, e a renovação
 * morava em `sessaoAtual()`, que o `app/layout.tsx` chama. Bastava o token
 * vencer para toda página virar 500 — inclusive `/entrar`, a única que poderia
 * consertar. A saída era limpar cookie no navegador à mão.
 *
 * O Proxy pode escrever na resposta. É aqui que a rotação mora.
 *
 * **O que este Proxy deliberadamente NÃO faz: checar papel.** Ele roda em
 * toda requisição; saber o papel exigiria uma consulta ao banco por navegação,
 * e papel lido de cookie é papel que o cliente escolhe. Quem decide isso são os
 * layouts, que são Server Components e leem de `usuario` sob RLS — ver
 * `src/servidor/auth/guarda.ts`.
 */

const PUBLICAS = ["/entrar", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publica = PUBLICAS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const acesso = request.cookies.get(COOKIE_ACESSO)?.value;
  const renovacao = request.cookies.get(COOKIE_RENOVACAO)?.value;

  /*
   * Access vencido com refresh em mãos: renova e grava. Uma ida de rede por
   * hora, e só quando o cookie de acesso já expirou — o navegador o descarta
   * sozinho no `maxAge`, então a ausência dele É o sinal.
   *
   * Vale também nas rotas públicas: quem volta ao `/entrar` com sessão válida
   * deve ser mandado para dentro, e para isso a sessão precisa estar renovada.
   */
  if (!acesso && renovacao) {
    const nova = await renovarSessao(renovacao);

    if (nova.ok && ehSessaoGoTrue(nova.dados)) {
      const resposta = NextResponse.next();
      const s = nova.dados;

      resposta.cookies.set(COOKIE_ACESSO, s.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: s.expires_in ?? 3600,
      });
      resposta.cookies.set(COOKIE_RENOVACAO, s.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });

      return resposta;
    }

    /*
     * Refresh morto. Apaga os dois e segue — sem isto a pessoa carregaria o
     * cookie quebrado em toda navegação seguinte, e nenhuma tela conseguiria
     * limpá-lo, porque Server Component não escreve cookie.
     */
    const resposta = publica ? NextResponse.next() : semSessao(request);

    resposta.cookies.delete(COOKIE_ACESSO);
    resposta.cookies.delete(COOKIE_RENOVACAO);
    return resposta;
  }

  if (publica) return NextResponse.next();
  if (acesso || renovacao) return NextResponse.next();

  return semSessao(request);
}

/**
 * Rota de API recebe 401; tela recebe redirecionamento.
 *
 * Um 307 para `/entrar` é seguido pelo `fetch` do navegador, que então entrega
 * o HTML do login como se fosse a resposta da API — status 200, corpo que não é
 * JSON. O código do cliente trata como sucesso e quebra longe daqui, num
 * `corpo.pessoas` indefinido.
 */
function semSessao(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { mensagem: "Sem sessão.", codigo: "sem_sessao" },
      { status: 401 },
    );
  }
  return NextResponse.redirect(destinoDeLogin(request));
}

/**
 * O destino vai junto para a pessoa voltar onde queria estar. Só caminho e
 * query — nunca a URL absoluta vinda do pedido, que permitiria mandar o retorno
 * para outro domínio.
 */
function destinoDeLogin(request: NextRequest): URL {
  const login = new URL("/entrar", request.url);
  const { pathname } = request.nextUrl;

  if (pathname !== "/") {
    login.searchParams.set("para", pathname + request.nextUrl.search);
  }
  return login;
}

export const config = {
  /*
   * Fora do corte: os estáticos do build e o favicon. Sem esta exclusão, cada
   * arquivo de bundle passaria por aqui e um usuário deslogado receberia
   * redirect no lugar do JavaScript da própria tela de login.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
