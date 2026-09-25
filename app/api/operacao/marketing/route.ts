import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";
import { horarioSaoPauloParaIso } from "@/src/lib/agenda-marketing-data";

const permitidos = new Set(["admin", "gestao", "staff"]);
const erro = (mensagem: string, status: number) => NextResponse.json({ mensagem }, { status });
const tamanhoPaginaAgenda = 200;

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !permitidos.has(sessao.usuario.papel)) return erro("Sem permissão", 403);
  if (request.nextUrl.searchParams.get("somenteAlertas") === "1") {
    const alertas = await consultar("alerta_marketing?select=agenda_id,criado_em,lido_em,agenda_marketing(agendado_para,titulo)&lido_em=is.null&order=criado_em.desc&limit=100", sessao.accessToken);
    if (!alertas.ok) return erro("Não foi possível carregar os alertas", 503);
    return NextResponse.json({ alertas: alertas.dados ?? [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const inicio = request.nextUrl.searchParams.get("inicio");
  const fim = request.nextUrl.searchParams.get("fim");
  const paginaTexto = request.nextUrl.searchParams.get("pagina") ?? "0";
  if (!inicio || !fim || !/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || fim < inicio) return erro("Período inválido", 400);
  if (!/^\d+$/.test(paginaTexto) || Number(paginaTexto) > 1000) return erro("Página inválida", 400);
  const pagina = Number(paginaTexto);
  let inicioIso: string;
  let fimIso: string;
  try {
    inicioIso = horarioSaoPauloParaIso(`${inicio}T00:00`);
    fimIso = horarioSaoPauloParaIso(`${fim}T00:00`);
  } catch {
    return erro("Período inválido", 400);
  }
  const consultaAgenda = `agenda_marketing?select=id,responsavel_id,solicitacao_id,categoria,titulo,descricao_conteudo,midia_caminho,agendado_para,situacao,confirmado_em,publicado_em&agendado_para=gte.${inicioIso}&agendado_para=lt.${fimIso}&order=agendado_para.asc,id.asc&limit=${tamanhoPaginaAgenda + 1}&offset=${pagina * tamanhoPaginaAgenda}`;
  if (pagina > 0) {
    const agenda = await consultar<unknown[]>(consultaAgenda, sessao.accessToken);
    if (!agenda.ok || !Array.isArray(agenda.dados)) return erro("Não foi possível carregar a agenda", 503);
    return NextResponse.json({ agenda: agenda.dados.slice(0, tamanhoPaginaAgenda), maisAgenda: agenda.dados.length > tamanhoPaginaAgenda }, { headers: { "Cache-Control": "no-store" } });
  }
  const [agenda, solicitacoes, perfis, alertas, concorrentes] = await Promise.all([
    consultar<unknown[]>(consultaAgenda, sessao.accessToken),
    consultar("solicitacao_marketing?select=id,solicitante_id,responsavel_id,titulo,descricao,categoria,situacao,prazo,criado_em&order=criado_em.desc&limit=100", sessao.accessToken),
    consultar("perfil_marketing?select=usuario_id,ativo&ativo=eq.true&limit=100", sessao.accessToken),
    consultar("alerta_marketing?select=agenda_id,criado_em,lido_em,agenda_marketing(agendado_para,titulo)&lido_em=is.null&order=criado_em.desc&limit=100", sessao.accessToken),
    consultar("concorrente_marketing?select=id,nome,instagram_usuario,google_place_id,seguidores_instagram,publicacoes_instagram,nota_google,avaliacoes_google,instagram_atualizado_em,google_atualizado_em,consulta_erro,ativo&ativo=is.true&order=nome.asc&limit=100", sessao.accessToken),
  ]);
  if (!agenda.ok || !Array.isArray(agenda.dados) || !solicitacoes.ok || !perfis.ok || !alertas.ok || !concorrentes.ok) return erro("Não foi possível carregar o marketing", 503);
  return NextResponse.json({ agenda: agenda.dados.slice(0, tamanhoPaginaAgenda), maisAgenda: agenda.dados.length > tamanhoPaginaAgenda, solicitacoes: solicitacoes.dados ?? [], perfis: perfis.dados ?? [], alertas: alertas.dados ?? [], concorrentes: concorrentes.dados ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return erro("Origem inválida", 403);
  const sessao = await sessaoAtual();
  if (!sessao || !permitidos.has(sessao.usuario.papel)) return erro("Sem permissão", 403);
  const dados = await request.json().catch(() => null);
  if (!dados || typeof dados !== "object") return erro("Dados inválidos", 400);
  const acao = dados.acao;
  if (acao === "solicitar") {
    if (typeof dados.titulo !== "string" || !dados.titulo.trim() || dados.titulo.length > 150 || typeof dados.descricao !== "string" || !dados.descricao.trim() || dados.descricao.length > 4000 || !["arte", "conteudo", "gravacao", "outro"].includes(dados.categoria)) return erro("Confira a solicitação", 400);
    const r = await chamarFuncao("criar_solicitacao_marketing", { p_titulo: dados.titulo, p_descricao: dados.descricao, p_categoria: dados.categoria, p_responsavel: dados.responsavel_id ?? null }, sessao.accessToken);
    return r.ok ? NextResponse.json({ id: r.dados }) : erro("Não foi possível criar a solicitação", r.status >= 500 ? 503 : 400);
  }
  if (acao === "receber") {
    if (typeof dados.id !== "string" || typeof dados.prazo !== "string" || !Number.isFinite(Date.parse(dados.prazo))) return erro("Informe o prazo", 400);
    const r = await chamarFuncao("receber_solicitacao_marketing", { p_id: dados.id, p_prazo: dados.prazo }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true }) : erro("Solicitação indisponível", r.status >= 500 ? 503 : 400);
  }
  if (acao === "agenda") {
    if (typeof dados.titulo !== "string" || !dados.titulo.trim() || dados.titulo.length > 150 || typeof dados.agendado_para !== "string" || !Number.isFinite(Date.parse(dados.agendado_para)) || !["story", "feed", "gravacao"].includes(dados.categoria) || (dados.descricao_conteudo?.length ?? 0) > 4000) return erro("Confira o compromisso", 400);
    const r = await chamarFuncao("salvar_agenda_marketing", { p_dados: dados }, sessao.accessToken);
    return r.ok ? NextResponse.json({ id: r.dados }) : erro("Não foi possível salvar o compromisso", r.status >= 500 ? 503 : 400);
  }
  if (acao === "confirmar" || acao === "publicar") {
    if (typeof dados.id !== "string") return erro("Compromisso inválido", 400);
    const r = await chamarFuncao("confirmar_agenda_marketing", { p_id: dados.id, p_publicado: acao === "publicar" }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true }) : erro("Compromisso indisponível", r.status >= 500 ? 503 : 400);
  }
  if (acao === "atribuir") {
    if (typeof dados.usuario_id !== "string" || typeof dados.ativo !== "boolean") return erro("Integrante inválido", 400);
    const r = await chamarFuncao("atribuir_marketing", { p_usuario: dados.usuario_id, p_ativo: dados.ativo }, sessao.accessToken);
    return r.ok ? NextResponse.json({ ok: true }) : erro("Não foi possível atribuir o marketing", r.status >= 500 ? 503 : 400);
  }
  if (acao === "concorrente") {
    if (!(["admin", "gestao"].includes(sessao.usuario.papel)) || typeof dados.nome !== "string" || !dados.nome.trim() || dados.nome.length > 150 ||
      (typeof dados.instagram_usuario !== "string" && typeof dados.google_place_id !== "string")) return erro("Confira o cadastro do concorrente", 400);
    const r = await chamarFuncao("salvar_concorrente_marketing", { p_dados: dados }, sessao.accessToken);
    return r.ok ? NextResponse.json({ id: r.dados }) : erro("Não foi possível salvar o concorrente. Confira usuário e Place ID.", r.status >= 500 ? 503 : 400);
  }
  return erro("Ação inválida", 400);
}
