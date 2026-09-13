import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mensagemDoBanco(erro: string | null): string {
  try { return (JSON.parse(erro ?? "{}") as { message?: string }).message ?? "Não foi possível enviar a mensagem."; } catch { return "Não foi possível enviar a mensagem."; }
}

/** Enfileira texto livre; o banco exige gestão e uma entrada do contato nas últimas 24h. */
export async function POST(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  let corpo: Record<string, unknown>;
  try { corpo = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }
  const telefone = typeof corpo.telefone === "string" ? corpo.telefone : "";
  const texto = typeof corpo.texto === "string" ? corpo.texto : "";
  const r = await chamarFuncao<string>("enfileirar_mensagem_whatsapp_manual", {
    p_telefone: telefone,
    p_texto: texto,
  }, sessao.accessToken);
  if (!r.ok) return NextResponse.json({ mensagem: mensagemDoBanco(r.erro) }, { status: r.status === 0 ? 502 : 403 });
  return NextResponse.json({ ok: true, notificacao: r.dados }, { status: 201 });
}
