import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function erro(erroBanco: string | null, status: number) {
  let mensagem = "Não foi possível salvar as notificações.";
  try { mensagem = (JSON.parse(erroBanco ?? "{}") as { message?: string }).message ?? mensagem; } catch { /* genérica */ }
  return NextResponse.json({ mensagem, codigo: "recusado" }, { status: status === 0 ? 502 : 403 });
}

export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  let corpo: Record<string, unknown>;
  try { corpo = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }

  if (corpo.escopo === "organizacao") {
    const r = await chamarFuncao("salvar_configuracao_notificacao", {
      p_email_habilitado: corpo.email_habilitado === true,
      p_whatsapp_habilitado: corpo.whatsapp_habilitado === true,
    }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true }) : erro(r.erro, r.status);
  }

  if (corpo.escopo === "regra_disciplina") {
    const faltas = typeof corpo.faltas_a_partir === "number" ? corpo.faltas_a_partir : 0;
    const dias = typeof corpo.bloqueio_dias === "number" ? corpo.bloqueio_dias : 0;
    const r = await chamarFuncao("salvar_regra_disciplina", {
      p_faltas_a_partir: faltas,
      p_bloqueio_dias: dias,
      p_reuniao_obrigatoria: corpo.reuniao_obrigatoria === true,
      p_ativa: corpo.ativa === true,
    }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true }) : erro(r.erro, r.status);
  }

  if (corpo.escopo === "reenviar" && typeof corpo.notificacao === "string") {
    const r = await chamarFuncao("reenfileirar_notificacao", { p_notificacao: corpo.notificacao }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true }) : erro(r.erro, r.status);
  }

  const usuario = typeof corpo.usuario === "string" ? corpo.usuario : sessao.usuario.id;
  const r = await chamarFuncao("salvar_preferencia_notificacao", {
    p_usuario: usuario,
    p_telefone: typeof corpo.telefone === "string" ? corpo.telefone : "",
    p_receber_email: corpo.receber_email === true,
    p_receber_whatsapp: corpo.receber_whatsapp === true,
    p_avisar_evento_novo: corpo.avisar_evento_novo === true,
    p_avisar_escala: corpo.avisar_escala === true,
    p_avisar_disciplina: corpo.avisar_disciplina === true,
  }, sessao.accessToken);
  return r.ok ? NextResponse.json({ ok: true }) : erro(r.erro, r.status);
}
