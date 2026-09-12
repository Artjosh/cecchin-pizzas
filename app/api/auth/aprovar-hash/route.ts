import { NextResponse, type NextRequest } from "next/server";

import { aprovarComToken } from "@/src/servidor/auth/pedido";
import { verificarMagicLink } from "@/src/servidor/supabase";

/** Aprova um pedido sem expor uma sessão do Supabase ao navegador. */
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

  const selector = typeof corpo.selector === "string" ? corpo.selector : "";
  const tokenHash = typeof corpo.tokenHash === "string" ? corpo.tokenHash : "";
  if (!selector || !tokenHash) {
    return NextResponse.json(
      { mensagem: "Link incompleto.", codigo: "link_incompleto" },
      { status: 400 },
    );
  }

  const sessao = await verificarMagicLink(tokenHash);
  const aprovado = sessao.ok && sessao.dados
    ? await aprovarComToken(selector, sessao.dados)
    : false;

  return aprovado
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(
        { mensagem: "Não foi possível confirmar este acesso.", codigo: "recusado" },
        { status: 401 },
      );
}
