import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";

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

  if (!corpo || typeof corpo !== "object") return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 });
  if (corpo.escopo === "preferencias_lote") {
    const r = await chamarFuncao<number>("salvar_preferencias_notificacao_lote", { p_usuarios: corpo.usuarios, p_alteracoes: corpo.alteracoes }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true, atualizados: r.dados }) : erro(r.erro, r.status);
  }
  if (corpo.escopo === "permissao_atencao") {
    const r = await chamarFuncao("salvar_permissao_atencao", { p_papeis: corpo.papeis }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true }) : erro(r.erro, r.status);
  }
  if (corpo.escopo === "atencao_evento") {
    if (typeof corpo.evento !== "string" || !/^[a-f0-9-]{36}$/i.test(corpo.evento) || typeof corpo.atencao !== "boolean") return NextResponse.json({ mensagem: "Evento ou marcação inválida." }, { status: 400 });
    const r = await chamarFuncao<boolean>("definir_atencao_evento", { p_evento: corpo.evento, p_atencao: corpo.atencao }, sessao.accessToken);
    return r.ok ? NextResponse.json({ atencao: r.dados }) : erro(r.erro, r.status);
  }
  if (corpo.escopo === "meu_whatsapp") {
    const preferencias = await consultar<Array<{ receber_email: boolean; avisar_evento_novo: boolean; avisar_escala: boolean; avisar_disciplina: boolean }>>(`preferencia_notificacao?select=receber_email,avisar_evento_novo,avisar_escala,avisar_disciplina&usuario_id=eq.${sessao.usuario.id}&limit=1`, sessao.accessToken);
    if (!preferencias.ok || !preferencias.dados?.[0]) return NextResponse.json({ mensagem: "Não foi possível consultar suas preferências." }, { status: 502 });
    const atual = preferencias.dados[0];
    const resultado = await chamarFuncao("salvar_preferencia_notificacao", {
      p_usuario: sessao.usuario.id, p_telefone: typeof corpo.telefone === "string" ? corpo.telefone : "",
      p_receber_whatsapp: corpo.receber_whatsapp === true, p_receber_email: atual.receber_email,
      p_avisar_evento_novo: atual.avisar_evento_novo, p_avisar_escala: atual.avisar_escala, p_avisar_disciplina: atual.avisar_disciplina,
    }, sessao.accessToken);
    return resultado.ok ? NextResponse.json({ ok: true }) : erro(resultado.erro, resultado.status);
  }

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

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (!["admin", "gestao"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem acesso." }, { status: 403 });
  const params = request.nextUrl.searchParams;
  const pagina = Number(params.get("pagina") ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000) return NextResponse.json({ mensagem: "Página inválida." }, { status: 400 });
  const papel = params.get("papel");
  const termo = (params.get("busca") ?? "").slice(0,80).replace(/[^\p{L}\p{N} @+_-]/gu, "").trim();
  const filtro = termo ? `&or=(nome.ilike.*${encodeURIComponent(termo)}*,email.ilike.*${encodeURIComponent(termo)}*,telefone.ilike.*${encodeURIComponent(termo)}*)` : "";
  if (params.get("selecao") === "1") {
    const r = await consultar<Array<{id:string;nome:string}>>(`usuario?select=id,nome&ativo=is.true&papel=${papel && ["admin","gestao","staff"].includes(papel) ? `eq.${papel}` : "in.(admin,gestao,staff)"}${filtro}&order=nome.asc,id.asc&limit=1000`, sessao.accessToken, { headers: { Prefer: "count=exact" } });
    if (!r.ok) return NextResponse.json({ mensagem: "Falha ao consultar seleção." }, { status: 502 });
    if ((r.total ?? 0) > 1000) return NextResponse.json({ mensagem: "Refine os filtros para selecionar até 1000 pessoas por lote." }, { status: 400 });
    return NextResponse.json({ pessoas: r.dados ?? [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const r = await consultar<Array<Record<string, unknown> & { preferencia_notificacao: Record<string, unknown> | null }>>(
    `usuario?select=id,nome,email,telefone,papel,preferencia_notificacao(receber_email,receber_whatsapp,avisar_evento_novo,avisar_escala,avisar_disciplina)&ativo=is.true&papel=${papel && ["admin","gestao","staff"].includes(papel) ? `eq.${papel}` : "in.(admin,gestao,staff)"}${filtro}&order=nome.asc,id.asc&limit=12&offset=${(pagina-1)*12}`,
    sessao.accessToken, { headers: { Prefer: "count=exact" } });
  if (!r.ok) return NextResponse.json({ mensagem: "Não foi possível carregar destinatários." }, { status: 502 });
  return NextResponse.json({ total: r.total ?? 0, pessoas: (r.dados ?? []).map(({ preferencia_notificacao, ...pessoa }) => ({ ...pessoa, ...(preferencia_notificacao ?? { receber_email: true, receber_whatsapp: false, avisar_evento_novo: true, avisar_escala: true, avisar_disciplina: true }) })) }, { headers: { "Cache-Control": "no-store" } });
}
