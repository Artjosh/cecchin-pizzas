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
    const pedido = request.nextUrl.searchParams.get("pedido");
    const comReferencia = destino && pedido && /^[a-f0-9-]{36}$/i.test(pedido) ? `${destino}?text=${encodeURIComponent(`Olá! Gostaria de conversar sobre meu pedido de análise ${pedido}.`)}` : destino;
    const resposta = NextResponse.redirect(comReferencia ?? new URL("/cliente/suporte", request.url), 307);
    resposta.headers.set("Cache-Control", "no-store");
    return resposta;
  }
  if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso à Central." }, { status: 403 });
  const conta = request.nextUrl.searchParams.get("conta") ?? "principal";
  if (conta !== "principal" && !/^[a-f0-9-]{36}$/.test(conta)) return NextResponse.json({ mensagem: "Conta inválida." }, { status: 400 });
  const filtroConta = `&conta_id=eq.${conta}`;
  const foto = request.nextUrl.searchParams.get("foto");
  if (foto) {
    if (!/^\d{10,15}$/.test(foto)) return NextResponse.json({ mensagem: "Contato inválido." }, { status: 400 });
    const conversa = await consultar<Array<{ telefone: string }>>(`vw_conversa_central?select=telefone&telefone=eq.${foto}${filtroConta}&removida_em=is.null&limit=1`, sessao.accessToken);
    if (!conversa.ok) return new Response(null, { status: 502 });
    if (!conversa.dados?.length) return new Response(null, { status: 404 });
    const base = process.env.WHATSAPP_RUST_URL?.replace(/\/$/, "");
    const token = process.env.WHATSAPP_RUST_INTERNAL_TOKEN;
    if (!base || !token) return new Response(null, { status: 503 });
    try {
      const perfil = await fetch(`${base}/accounts/${conta}/profile/${foto}`, { headers: { "x-cecchin-internal-token": token }, signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (!perfil.ok) return new Response(null, { status: perfil.status === 404 ? 404 : 502, headers: { "Cache-Control": "private, max-age=120" } });
      const { url } = await perfil.json() as { url?: string };
      const origem = new URL(url ?? "");
      if (origem.protocol !== "https:" || !/(^|\.)(whatsapp\.net|fbcdn\.net)$/.test(origem.hostname)) return new Response(null, { status: 502 });
      const imagem = await fetch(origem, { signal: AbortSignal.timeout(7000), cache: "no-store" });
      const tipo = imagem.headers.get("content-type")?.split(";")[0];
      const tamanho = Number(imagem.headers.get("content-length") ?? "0");
      if (!imagem.ok || !["image/jpeg", "image/png", "image/webp"].includes(tipo ?? "") || tamanho > 2_000_000) return new Response(null, { status: 502 });
      const bytes = await imagem.arrayBuffer();
      if (bytes.byteLength > 2_000_000) return new Response(null, { status: 502 });
      return new Response(bytes, { headers: { "Content-Type": tipo!, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
    } catch { return new Response(null, { status: 502 }); }
  }
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
    const registro = await consultar<Array<{ conta_id: string; conteudo: { media?: { arquivo?: string; mime?: string; disponivel?: boolean } } }>>(`mensagem_whatsapp?select=conta_id,conteudo&id=eq.${midia}&limit=1`, sessao.accessToken);
    if (!registro.ok) return NextResponse.json({ mensagem: "Não foi possível consultar a mídia." }, { status: 502 });
    const arquivo = registro.dados?.[0]?.conteudo.media;
    if (!arquivo?.disponivel || !arquivo.arquivo || !/^[a-f0-9]{1,240}$/i.test(arquivo.arquivo)) return NextResponse.json({ mensagem: "Arquivo indisponível." }, { status: 404 });
    const token = process.env.WHATSAPP_RUST_INTERNAL_TOKEN;
    const base = process.env.WHATSAPP_RUST_URL;
    if (!token || !base) return NextResponse.json({ mensagem: "Acesso aos arquivos não configurado." }, { status: 503 });
    try {
      const resposta = await fetch(`${base.replace(/\/$/, "")}${registro.dados![0].conta_id === "principal" ? "" : `/accounts/${registro.dados![0].conta_id}`}/media/${arquivo.arquivo}`, { headers: { "x-cecchin-internal-token": token, "x-cecchin-organizacao": sessao.usuario.organizacaoId }, signal: AbortSignal.timeout(30000), cache: "no-store" });
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
    const busca = (request.nextUrl.searchParams.get("busca") ?? "").trim().slice(0,80);
    const filtroBusca = /[A-Za-zÀ-ÿ]/.test(busca) ? `&nome_contato=ilike.*${encodeURIComponent(busca.replace(/[^A-Za-zÀ-ÿ0-9 ]/g,""))}*` : busca.replace(/\D/g, "") ? `&telefone=like.*${busca.replace(/\D/g, "").slice(0,15)}*` : "";
    const filtro = aguardando ? "&modo=eq.atendimento_humano&atendente_id=is.null" : "";
    const etiqueta = request.nextUrl.searchParams.get("etiqueta");
    if (etiqueta && !/^[a-f0-9-]{36}$/i.test(etiqueta)) return NextResponse.json({ mensagem: "Etiqueta inválida." }, { status: 400 });
    const filtroEtiqueta = etiqueta ? `&etiqueta_ids=cs.{${etiqueta}}` : "";
    const resultado = await consultar<Array<{ telefone: string; modo: string; atendente_id: string | null }>>(`vw_conversa_central?removida_em=is.null&select=telefone,nome_contato,etiquetas,modo,atendente_id,atualizado_em,ultima_mensagem,ultima_em,ultima_direcao${filtroConta}${filtroBusca}${filtroEtiqueta}${filtro}&order=atualizado_em.desc,telefone.asc&limit=51&offset=${pagina * 50}`, sessao.accessToken, { headers: { Prefer: "count=exact" } });
    if (!resultado.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as conversas." }, { status: 502 });
    return NextResponse.json({ total: resultado.total ?? 0, conversas: (resultado.dados ?? []).slice(0, 50), telefones: (resultado.dados ?? []).slice(0, 50).map((item) => item.telefone), temMais: (resultado.dados?.length ?? 0) > 50 }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!/^\d{10,15}$/.test(telefone) || !Number.isSafeInteger(pagina) || pagina < 0 || pagina > 10000) {
    return NextResponse.json({ mensagem: "Conversa ou página inválida." }, { status: 400 });
  }
  const conversa = await consultar<Array<{ modo: string; atendente_id: string | null; historico_desde: string | null; nome_contato: string | null; etiquetas: Array<{ id: string; nome: string; cor: string }> }>>(`vw_conversa_central?select=modo,atendente_id,historico_desde,nome_contato,etiquetas&telefone=eq.${telefone}${filtroConta}&limit=1`, sessao.accessToken);
  if (!conversa.ok) return NextResponse.json({ mensagem: "Falha ao consultar conversa." }, { status: 502 });
  if (!conversa.dados?.[0]) return NextResponse.json({ mensagem: "Conversa indisponível. Abra novamente pela lista." }, { status: 404 });
  const corte = conversa.dados?.[0]?.historico_desde;
  const filtroHistorico = corte && request.nextUrl.searchParams.get("antigas") !== "1" ? `&criado_em=gte.${encodeURIComponent(corte)}` : "";
  const tamanho = request.nextUrl.searchParams.has("limite") ? Number(request.nextUrl.searchParams.get("limite")) : 50;
  if(!Number.isInteger(tamanho)||tamanho<20||tamanho>200)return NextResponse.json({mensagem:"Limite invalido."},{status:400});
  const antes=request.nextUrl.searchParams.get("antes"),depois=request.nextUrl.searchParams.get("depois");
  let filtroCursor="";
  if(antes||depois){
    const [data,id,...resto]=(antes??depois??"").split("|");
    if((antes&&depois)||resto.length||!/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(data)||!Number.isFinite(Date.parse(data))||!/^[-a-f0-9]{36}$/i.test(id??""))return NextResponse.json({mensagem:"Cursor invalido."},{status:400});
    const op=antes?"lt":"gt",quando=encodeURIComponent(data);
    filtroCursor=`&or=(criado_em.${op}.${quando},and(criado_em.eq.${quando},id.${op}.${id}))`;
  }
  const [historico, fila] = await Promise.all([
    consultar<Array<{ id: string; notificacao_id?: string }>>(`mensagem_whatsapp?select=id,notificacao_id,telefone,direcao,tipo,conteudo,status,criado_em&telefone=eq.${telefone}${filtroConta}${filtroHistorico}${filtroCursor}&order=criado_em.${depois?"asc":"desc"},id.${depois?"asc":"desc"}&limit=${tamanho+1}${antes||depois?"":`&offset=${pagina*tamanho}`}`, sessao.accessToken, request.nextUrl.searchParams.has("limite")?undefined:{ headers: { Prefer: "count=exact" } }),
    consultar<Array<{ id: string; status: string; conteudo: Record<string, unknown> }>>(`notificacao?select=id,status,conteudo,criado_em,tentativas&canal=eq.whatsapp&destinatario=eq.${telefone}${filtroConta}&status=in.(pendente,enviando,falha)&order=criado_em.desc&limit=50`, sessao.accessToken),
  ]);
  if (!historico.ok || !fila.ok) return NextResponse.json({ mensagem: "Falha ao carregar conversa." }, { status: 502 });
  const mensagens=(historico.dados??[]).slice(0,tamanho);
  const confirmadas = new Set(mensagens.map(m => m.notificacao_id).filter(Boolean));
  return NextResponse.json({ total: historico.total ?? 0, historicoOculto: !!filtroHistorico, mensagens: depois?mensagens.reverse():mensagens, temMais: (historico.dados?.length ?? 0) > tamanho, modo: conversa.dados[0].modo, assumida: !!conversa.dados?.[0]?.atendente_id, nomeContato: conversa.dados[0].nome_contato, etiquetas: conversa.dados[0].etiquetas ?? [], fila: (fila.dados ?? []).filter(item => !confirmadas.has(item.id)) }, { headers: { "Cache-Control": "no-store" } });
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
  const telefone = typeof corpo.telefone === "string" ? corpo.telefone.replace(/\D/g, "") : "";
  const texto = typeof corpo.texto === "string" ? corpo.texto : "";
  const r = await chamarFuncao<string>("enfileirar_mensagem_whatsapp_manual", {
    p_conta: typeof corpo.conta === "string" ? corpo.conta : "principal",
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
  const telefone = typeof corpo.telefone === "string" ? corpo.telefone.replace(/\D/g, "") : "";
  if (corpo.acao === "nome") {
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida." }, { status: 403 });
    if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso." }, { status: 403 });
    if (!/^\d{10,15}$/.test(telefone) || typeof corpo.nome !== "string" || corpo.nome.trim().length > 80 || (corpo.conta != null && (typeof corpo.conta !== "string" || !/^(principal|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/.test(corpo.conta)))) return NextResponse.json({ mensagem: "Nome ou conversa inválida." }, { status: 400 });
    const r = await chamarFuncao<string | null>("salvar_nome_conversa_whatsapp", { p_conta: typeof corpo.conta === "string" ? corpo.conta : "principal", p_telefone: telefone, p_nome: corpo.nome }, sessao.accessToken);
    if (!r.ok) return NextResponse.json({ mensagem: mensagemDoBanco(r.erro) }, { status: r.status === 0 ? 502 : 403 });
    return NextResponse.json({ nome: r.dados }, { headers: { "Cache-Control": "no-store" } });
  }
  if (corpo.acao === "remover" || corpo.acao === "abrir") {
    const r = await chamarFuncao("organizar_conversa_central", { p_conta: typeof corpo.conta === "string" ? corpo.conta : "principal", p_telefone: telefone, p_remover: corpo.acao === "remover" }, sessao.accessToken);
    if (!r.ok) return NextResponse.json({ mensagem: mensagemDoBanco(r.erro) }, { status: r.status === 0 ? 502 : 403 });
    return NextResponse.json({ ok: true });
  }
  const modo = corpo.modo === "automatico" || corpo.modo === "atendimento_humano" ? corpo.modo : null;
  if (!modo) return NextResponse.json({ mensagem: "Modo inválido." }, { status: 400 });
  const r = await chamarFuncao("definir_modo_conversa_whatsapp", { p_conta: typeof corpo.conta === "string" ? corpo.conta : "principal", p_telefone: telefone, p_modo: modo }, sessao.accessToken);
  if (!r.ok) return NextResponse.json({ mensagem: mensagemDoBanco(r.erro) }, { status: r.status === 0 ? 502 : 403 });
  return NextResponse.json({ ok: true });
}
