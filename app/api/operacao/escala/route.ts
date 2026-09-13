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

export async function POST(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return falha("Sem sessão.", 401);
  let corpo: Record<string, unknown>;
  try { corpo = (await request.json()) as Record<string, unknown>; } catch { return falha("JSON inválido."); }

  const evento = typeof corpo.evento === "string" ? corpo.evento : "";
  const usuario = typeof corpo.usuario === "string" ? corpo.usuario : "";
  if (!evento || !usuario) return falha("Evento e pessoa são obrigatórios.");

  const r = await chamarFuncao<string>("escalar_usuario", {
    p_evento: evento,
    p_usuario: usuario,
    p_funcao: typeof corpo.funcao === "string" ? corpo.funcao : null,
    p_observacao: typeof corpo.observacao === "string" ? corpo.observacao : null,
  }, sessao.accessToken);
  if (!r.ok) return falha(mensagemDoBanco(r.erro, "Não foi possível montar a escala."), r.status === 0 ? 502 : 403);
  return NextResponse.json({ ok: true, escala: r.dados }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return falha("Sem sessão.", 401);
  let corpo: Record<string, unknown>;
  try { corpo = (await request.json()) as Record<string, unknown>; } catch { return falha("JSON inválido."); }

  const acao = typeof corpo.acao === "string" ? corpo.acao : "";
  const escala = typeof corpo.escala === "string" ? corpo.escala : "";
  let r;
  if (acao === "responder" && escala && typeof corpo.aceitar === "boolean") {
    r = await chamarFuncao<string>("responder_escala", { p_escala: escala, p_aceitar: corpo.aceitar }, sessao.accessToken);
  } else if (acao === "falta" && escala) {
    r = await chamarFuncao<string>("registrar_falta", { p_escala: escala, p_motivo: typeof corpo.motivo === "string" ? corpo.motivo : null }, sessao.accessToken);
  } else if (acao === "avaliar_pessoa" && escala) {
    const nota = typeof corpo.nota === "number" ? corpo.nota : 0;
    r = await chamarFuncao("registrar_avaliacao_escala", { p_escala: escala, p_nota: nota, p_observacao: typeof corpo.observacao === "string" ? corpo.observacao : null }, sessao.accessToken);
  } else if (acao === "avaliar_equipe" && typeof corpo.evento === "string") {
    const nota = typeof corpo.nota === "number" ? corpo.nota : 0;
    r = await chamarFuncao("registrar_avaliacao_evento_equipe", { p_evento: corpo.evento, p_nota: nota, p_observacao: typeof corpo.observacao === "string" ? corpo.observacao : null }, sessao.accessToken);
  } else if (acao === "encerrar_bloqueio" && typeof corpo.bloqueio === "string") {
    r = await chamarFuncao("encerrar_bloqueio_equipe", { p_bloqueio: corpo.bloqueio, p_observacao: typeof corpo.observacao === "string" ? corpo.observacao : null }, sessao.accessToken);
  } else {
    return falha("Ação de escala inválida.");
  }

  if (!r.ok) return falha(mensagemDoBanco(r.erro, "Não foi possível concluir a ação."), r.status === 0 ? 502 : 403);
  return NextResponse.json({ ok: true, resultado: r.dados }, { status: 200 });
}
