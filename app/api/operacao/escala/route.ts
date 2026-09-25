import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function falha(mensagem: string, status = 400) {
  return NextResponse.json({ mensagem, codigo: "recusado" }, { status });
}

function mensagemDoBanco(erro: string | null, padrao: string): string {
  try {
    return (JSON.parse(erro ?? "{}") as { message?: string }).message ?? padrao;
  } catch {
    return padrao;
  }
}

export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return falha("Sem sessão.", 401);
  let corpo: Record<string, unknown>;
  try { corpo = (await request.json()) as Record<string, unknown>; } catch { return falha("JSON inválido."); }

  if (!corpo || typeof corpo !== "object") return falha("JSON inválido.");
  const acao = typeof corpo.acao === "string" ? corpo.acao : "";
  const escala = typeof corpo.escala === "string" ? corpo.escala : "";
  let r;
  if (acao === "responder" && escala && typeof corpo.aceitar === "boolean") {
    r = await chamarFuncao<string>("responder_escala", { p_escala: escala, p_aceitar: corpo.aceitar }, sessao.accessToken);
  } else {
    return falha("Ação de escala inválida.");
  }

  if (!r.ok) return falha(mensagemDoBanco(r.erro, "Não foi possível concluir a ação."), r.status === 0 ? 502 : 403);
  return NextResponse.json({ ok: true, resultado: r.dados }, { status: 200 });
}
