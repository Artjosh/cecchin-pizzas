import { NextResponse, type NextRequest } from "next/server";

import { aprovarComToken } from "@/src/servidor/auth/pedido";

/**
 * Aprova um pedido de acesso com a sessão que o GoTrue entregou no fragmento
 * da URL.
 *
 * Chamado pela página `/entrar/confirmar`, do aparelho que abriu o e-mail — que
 * pode não ser o que começou o login. A aba de origem descobre no ciclo de
 * polling seguinte.
 *
 * Devolve 401 para tudo que não passa, sem distinguir "selector inexistente" de
 * "token inválido" ou "e-mail divergente". Essa granularidade só ajudaria quem
 * está sondando.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let corpo: Record<string, unknown>;
  try {
    corpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { mensagem: "JSON inválido.", codigo: "json_invalido" },
      { status: 400 },
    );
  }

  const aprovado = await aprovarComToken(corpo.selector, corpo.sessao);

  return aprovado
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(
        { mensagem: "Não foi possível confirmar este acesso.", codigo: "recusado" },
        { status: 401 },
      );
}
