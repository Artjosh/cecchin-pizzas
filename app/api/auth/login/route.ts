import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import {
  consultarPedido,
  iniciarLogin,
  statusDaFalha,
  verificarOtp,
} from "@/src/servidor/auth/pedido";
import { gravarSessao } from "@/src/servidor/auth/sessao-atual";

/**
 * Conclusão do login — onde a sessão vira cookie e some do alcance do browser.
 *
 * Três passos, todos no servidor:
 *
 *   * `?passo=iniciar` — dispara o e-mail e devolve o `selector` do polling.
 *   * `?passo=consultar` — o polling. Pendente enquanto ninguém confirmou;
 *     quando confirmado, GRAVA O COOKIE e devolve só o usuário.
 *   * `?passo=codigo` — valida os seis dígitos, com o mesmo desfecho.
 *
 * **O detalhe que define a segurança deste arquivo.** O GoTrue devolve
 * `access_token` e `refresh_token` no corpo. Este handler os intercepta, grava
 * em cookie `httpOnly` e os REMOVE da resposta que segue para o browser. O
 * cliente recebe `{ status }` e nada mais. Repassar o corpo do provedor direto,
 * mesmo que a tela não use o campo, deixaria a sessão no `response.json()` ao
 * alcance de qualquer script.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const passo = request.nextUrl.searchParams.get("passo") ?? "consultar";

  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { mensagem: "JSON inválido.", codigo: "json_invalido" },
      { status: 400 },
    );
  }

  if (passo === "iniciar") {
    const r = await iniciarLogin(corpo.email, request.nextUrl.origin);
    return r.ok
      ? NextResponse.json(r.valor, { status: 200 })
      : NextResponse.json(
          { mensagem: r.mensagem, codigo: r.falha, reenviar_em: r.reenviar_em },
          { status: statusDaFalha(r.falha) },
        );
  }

  if (passo === "consultar") {
    const r = await consultarPedido(corpo.selector);

    if (!r.ok) {
      return NextResponse.json(
        { mensagem: r.mensagem, codigo: r.falha },
        { status: statusDaFalha(r.falha) },
      );
    }

    if (r.valor.status === "pendente") {
      return NextResponse.json({ status: "pendente" }, { status: 200 });
    }

    const jar = await cookies();
    gravarSessao(jar, r.valor.sessao);

    // A sessão fica de fora do corpo, deliberadamente.
    return NextResponse.json({ status: "aprovado" }, { status: 200 });
  }

  if (passo === "codigo") {
    const r = await verificarOtp(corpo.selector, corpo.codigo);

    if (!r.ok) {
      return NextResponse.json(
        { mensagem: r.mensagem, codigo: r.falha },
        { status: statusDaFalha(r.falha) },
      );
    }

    const jar = await cookies();
    gravarSessao(jar, r.valor);

    return NextResponse.json({ status: "aprovado" }, { status: 200 });
  }

  return NextResponse.json(
    { mensagem: "Passo inválido.", codigo: "passo_invalido" },
    { status: 400 },
  );
}
