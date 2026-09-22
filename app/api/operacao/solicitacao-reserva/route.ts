import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  let corpo: Record<string, unknown>;
  try { corpo = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }
  const solicitacao = typeof corpo.solicitacao === "string" ? corpo.solicitacao : "";
  const status = corpo.status === "em_analise" || corpo.status === "recusada" || corpo.status === "cancelada" ? corpo.status : "";
  if (!solicitacao || !status) return NextResponse.json({ mensagem: "Solicitação ou estado inválido." }, { status: 400 });
  const r = await chamarFuncao("atualizar_solicitacao_reserva", { p_solicitacao: solicitacao, p_status: status }, sessao.accessToken);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ mensagem: "Não foi possível atualizar a solicitação." }, { status: r.status === 0 ? 502 : 403 });
}
