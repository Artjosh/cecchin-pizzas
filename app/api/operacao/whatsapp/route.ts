import { NextResponse, type NextRequest } from "next/server";

import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";
import { podeAcessar } from "@/src/servidor/auth/sessao-atual";
import { telefoneDoAtendimento } from "@/src/servidor/whatsapp";
import { linkWhatsApp } from "@/src/lib/formato";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Histórico paginado de uma conversa, sempre sob a sessão e RLS da gestão. */
export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (request.nextUrl.searchParams.get("contato") === "1") {
    const destino = linkWhatsApp(await telefoneDoAtendimento());
    const resposta = NextResponse.redirect(destino ?? new URL("/cliente/suporte", request.url), 307);
    resposta.headers.set("Cache-Control", "no-store");
    return resposta;
  }
  if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso à Central." }, { status: 403 });
  if (request.nextUrl.searchParams.get("avisos") === "atendimento") {
    const resultado = await consultar<Array<{ telefone: string }>>("vw_conversa_central?removida_em=is.null&select=telefone&modo=eq.atendimento_humano&atendente_id=is.null&limit=101", sessao.accessToken);
    if (!resultado.ok) return NextResponse.json({ mensagem: "Não foi possível consultar os atendimentos." }, { status: 502 });
    return NextResponse.json({ telefones: (resultado.dados ?? []).map(item => item.telefone), quantidade: Math.min(resultado.dados?.length ?? 0, 100), mais: (resultado.dados?.length ?? 0) > 100 }, { headers: { "Cache-Control": "no-store" } });
  }
  if (request.nextUrl.searchParams.get("avisos") === "mensagens") {
    const resultado = await consultar<Array<{ id: string }>>("mensagem_whatsapp?select=id&direcao=eq.entrada&order=criado_em.desc,id.desc&limit=100", sessao.accessToken);
    if (!resultado.ok) return NextResponse.json({ mensagem: "Falha ao consultar novas mensagens." }, { status: 502 });
    return NextResponse.json({ ids: (resultado.dados ?? []).map(item => item.id) }, { headers: { "Cache-Control": "no-store" } });
  }
  const midia = request.nextUrl.searchParams.get("midia");
  if (midia) {
    if (!/^[a-f0-9-]{36}$/i.test(midia)) return NextResponse.json({ mensagem: "Mídia inválida." }, { status: 400 });
    const registro = await consultar<Array<{ conteudo: { media?: { arquivo?: string; mime?: string; disponivel?: boolean } } }>>(`mensagem_whatsapp?select=conteudo&id=eq.${midia}&limit=1`, sessao.accessToken);
    if (!registro.ok) return NextResponse.json({ mensagem: "Não foi possível consultar a mídia." }, { status: 502 });
    const arquivo = registro.dados?.[0]?.conteudo.media;
    if (!arquivo?.disponivel || !arquivo.arquivo || !/^[a-f0-9]{1,240}$/i.test(arquivo.arquivo)) return NextResponse.json({ mensagem: "Arquivo indisponível." }, { status: 404 });
    const token = process.env.WHATSAPP_RUST_INTERNAL_TOKEN;
    const base = process.env.WHATSAPP_RUST_URL;
    if (!token || !base) return NextResponse.json({ mensagem: "Acesso aos arquivos não configurado." }, { status: 503 });
    try {
      const resposta = await fetch(`${base.replace(/\/$/, "")}/media/${arquivo.arquivo}`, { headers: { "x-cecchin-internal-token": token }, signal: AbortSignal.timeout(30000), cache: "no-store" });
      if (!resposta.ok) return NextResponse.json({ mensagem: "Arquivo indisponível na ponte." }, { status: resposta.status === 404 ? 404 : 502 });
      const tipo = arquivo.mime?.split(";")[0] ?? "application/octet-stream";
      const visualizavel = /^(image\/(jpeg|png|webp|gif)|audio\/(ogg|mpeg|mp4|wav|aac)|video\/(mp4|webm))$/.test(tipo);
      return new Response(resposta.body, { headers: { "Content-Type": visualizavel ? arquivo.mime! : "application/octet-stream", "Content-Disposition": `${visualizavel ? "inline" : "attachment"}; filename="arquivo-whatsapp"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
    } catch { return NextResponse.json({ mensagem: "Não foi possível obter o arquivo." }, { status: 502 }); }
  }
  const telefone = request.nextUrl.searchParams.get("telefone") ?? "";
  const pagina = Number(request.nextUrl.searchParams.get("pagina") ?? "0");
  if (!telefone && Number.isSafeInteger(pagina) && pagina >= 0 && pagina <= 10000) {
    const aguardando = request.nextUrl.searchParams.get("aguardando") === "1";
    const filtro = aguardando ? "&modo=eq.atendimento_humano&atendente_id=is.null" : "";
    const resultado = await consultar<Array<{ telefone: string; modo: string; atendente_id: string | null }>>(`vw_conversa_central?removida_em=is.null&select=telefone,modo,atendente_id${filtro}&order=atualizado_em.desc,telefone.asc&limit=51&offset=${pagina * 50}`, sessao.accessToken, { headers: { Prefer: "count=exact" } });
    if (!resultado.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as conversas." }, { status: 502 });
    return NextResponse.json({ total: resultado.total ?? 0, conversas: (resultado.dados ?? []).slice(0, 50), telefones: (resultado.dados ?? []).slice(0, 50).map((item) => item.telefone), temMais: (resultado.dados?.length ?? 0) > 50 }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!/^\d{10,15}$/.test(telefone) || !Number.isSafeInteger(pagina) || pagina < 0 || pagina > 10000) {
    return NextResponse.json({ mensagem: "Conversa ou página inválida." }, { status: 400 });
  }
  const conversa = await consultar<Array<{ modo: string; atendente_id: string | null; historico_desde: string | null }>>(`vw_conversa_central?select=modo,atendente_id,historico_desde&telefone=eq.${telefone}&limit=1`, sessao.accessToken);
  if (!conversa.ok) return NextResponse.json({ mensagem: "Falha ao consultar conversa." }, { status: 502 });
  if (!conversa.dados?.[0]) return NextResponse.json({ mensagem: "Conversa indisponível. Abra novamente pela lista." }, { status: 404 });
  const corte = conversa.dados?.[0]?.historico_desde;
  const filtroHistorico = corte && request.nextUrl.searchParams.get("antigas") !== "1" ? `&criado_em=gte.${encodeURIComponent(corte)}` : "";
  const [historico, fila] = await Promise.all([
    consultar<unknown[]>(`mensagem_whatsapp?select=id,telefone,direcao,tipo,conteudo,status,criado_em&telefone=eq.${telefone}${filtroHistorico}&order=criado_em.desc,id.desc&limit=51&offset=${pagina * 50}`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    consultar<unknown[]>(`notificacao?select=id,status,conteudo,criado_em,tentativas&canal=eq.whatsapp&destinatario=eq.${telefone}&status=in.(pendente,enviando,falha)&order=criado_em.desc&limit=50`, sessao.accessToken),
  ]);
  if (!historico.ok || !fila.ok) return NextResponse.json({ mensagem: "Falha ao carregar conversa." }, { status: 502 });
  return NextResponse.json({ total: historico.total ?? 0, historicoOculto: !!filtroHistorico, mensagens: (historico.dados ?? []).slice(0, 50), temMais: (historico.dados?.length ?? 0) > 50, modo: conversa.dados[0].modo, assumida: !!conversa.dados?.[0]?.atendente_id, fila: fila.dados ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

function mensagemDoBanco(erro: string | null): string {
  try { return (JSON.parse(erro ?? "{}") as { message?: string }).message ?? "Não foi possível enviar a mensagem."; } catch { return "Não foi possível enviar a mensagem."; }
}

/** Enfileira texto livre; o worker aplica a regra do provedor ativo. */
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

/** Alterna entre robô e atendimento humano sem expor o banco ao navegador. */
export async function PATCH(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  let corpo: Record<string, unknown>;
  try { corpo = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }
  const telefone = typeof corpo.telefone === "string" ? corpo.telefone : "";
  if (corpo.acao === "remover" || corpo.acao === "abrir") {
    const r = await chamarFuncao("organizar_conversa_central", { p_telefone: telefone, p_remover: corpo.acao === "remover" }, sessao.accessToken);
    if (!r.ok) return NextResponse.json({ mensagem: mensagemDoBanco(r.erro) }, { status: r.status === 0 ? 502 : 403 });
    return NextResponse.json({ ok: true });
  }
  const modo = corpo.modo === "automatico" || corpo.modo === "atendimento_humano" ? corpo.modo : null;
  if (!modo) return NextResponse.json({ mensagem: "Modo inválido." }, { status: 400 });
  const r = await chamarFuncao("definir_modo_conversa_whatsapp", { p_telefone: telefone, p_modo: modo }, sessao.accessToken);
  if (!r.ok) return NextResponse.json({ mensagem: mensagemDoBanco(r.erro) }, { status: r.status === 0 ? 502 : 403 });
  return NextResponse.json({ ok: true });
}
