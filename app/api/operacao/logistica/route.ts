import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";
import { QG_CECCHIN } from "@/src/lib/operacao";

export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const data = /^\d{4}-\d{2}-\d{2}$/;

async function medirTrecho(origem: { latitude: number; longitude: number }, destino: { latitude: number; longitude: number }) {
  const coordenadas = [origem.latitude, origem.longitude, destino.latitude, destino.longitude];
  if (coordenadas.some((n) => !Number.isFinite(n)) || Math.abs(origem.latitude) > 90 || Math.abs(destino.latitude) > 90 || Math.abs(origem.longitude) > 180 || Math.abs(destino.longitude) > 180) throw new Error("Coordenadas inválidas");
  const resposta = await fetch(`https://router.project-osrm.org/route/v1/driving/${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}?overview=false`, { signal: AbortSignal.timeout(8000) });
  if (!resposta.ok) throw new Error("Serviço de rotas indisponível");
  const rota = ((await resposta.json()) as { routes?: Array<{ distance?: number; duration?: number }> }).routes?.[0];
  if (!rota || !Number.isFinite(rota.distance) || !Number.isFinite(rota.duration) || (rota.distance ?? 0) <= 0 || (rota.duration ?? 0) <= 0) throw new Error("Nenhuma rota rodoviária encontrada");
  return { km: Math.round(rota.distance! / 10) / 100, minutos: Math.ceil(rota.duration! / 60) };
}

async function gestao() {
  const sessao = await sessaoAtual();
  return sessao && ["admin", "gestao"].includes(sessao.usuario.papel) ? sessao : null;
}

export async function GET(request: NextRequest) {
  const sessao = await gestao();
  if (!sessao) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const dia = request.nextUrl.searchParams.get("data") ?? "";
  if (!data.test(dia) || Number.isNaN(Date.parse(`${dia}T12:00:00Z`))) return NextResponse.json({ mensagem: "Data inválida" }, { status: 400 });
  const token = sessao.accessToken;
  const [eventos, veiculos, configuracao, regra, pessoas] = await Promise.all([
    consultar<Array<{ id: string; cliente_nome: string; data_evento: string; horario: string; inteiros: number; meios: number }>>(`vw_eventos_montagem?select=id,cliente_nome,data_evento,horario,inteiros,meios&data_evento=eq.${dia}&order=horario.asc,id.asc&limit=100`, token),
    consultar("veiculo_operacional?select=id,placa,modelo,forno_maximo,bebida_maxima,lugares,limite_eventos_levar,proprietario_id,ativo&ativo=is.true&order=modelo.asc&limit=200", token),
    consultar<Array<Record<string, unknown>>>("configuracao_logistica?select=*&limit=1", token),
    consultar<Array<Record<string, unknown>>>("regra_veiculo_particular?select=*&limit=1", token),
    consultar<Array<{ id: string; nome: string }>>("usuario?select=id,nome&ativo=is.true&papel=in.(staff,gestao,admin)&order=nome.asc&limit=300", token),
  ]);
  if ([eventos, veiculos, configuracao, regra, pessoas].some((r) => !r.ok)) return NextResponse.json({ mensagem: "Não foi possível carregar a logística. Confira as migrações e o acesso ao banco." }, { status: 503 });
  const ids = (eventos.dados ?? []).map((e) => e.id);
  const semana = new Date(`${dia}T12:00:00Z`);
  semana.setUTCDate(semana.getUTCDate() - ((semana.getUTCDay() + 6) % 7));
  const inicioSemana = semana.toISOString().slice(0, 10);
  const idsFiltro = ids.length ? `&evento_id=in.(${ids.join(",")})` : "&evento_id=eq.00000000-0000-0000-0000-000000000000";
  const [requisitos, rotas, locais, planos, duplos, disponibilidades] = await Promise.all([
    consultar(`requisito_logistico_evento?select=*${idsFiltro}&limit=100`, token),
    consultar(`trajeto_logistico_evento?select=*${idsFiltro}&limit=100`, token),
    consultar(`localizacao_evento?select=evento_id,latitude,longitude${idsFiltro}&limit=100`, token),
    consultar(`plano_logistico?select=*${idsFiltro}&situacao=neq.cancelado&limit=200`, token),
    consultar(`evento_duplo?select=*&or=(primeiro_evento_id.in.(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"}),segundo_evento_id.in.(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"}))&limit=100`, token),
    consultar(`disponibilidade_veiculo?select=veiculo_id,dias&semana=eq.${inicioSemana}&limit=200`, token),
  ]);
  if ([requisitos, rotas, locais, planos, duplos, disponibilidades].some((r) => !r.ok)) return NextResponse.json({ mensagem: "Não foi possível carregar os planos e a disponibilidade." }, { status: 503 });
  const idsDuplos = ((duplos.dados ?? []) as Array<{ id: string }>).map((item) => item.id);
  const trechosDuplos = idsDuplos.length ? await consultar(`trajeto_logistico_duplo?select=*&evento_duplo_id=in.(${idsDuplos.join(",")})&limit=100`, token) : { ok: true, dados: [] };
  if (!trechosDuplos.ok) return NextResponse.json({ mensagem: "Não foi possível carregar os trajetos entre eventos." }, { status: 503 });
  return NextResponse.json({ eventos: eventos.dados ?? [], veiculos: veiculos.dados ?? [], pessoas: pessoas.dados ?? [], configuracao: configuracao.dados?.[0] ?? null, regra: regra.dados?.[0] ?? null, requisitos: requisitos.dados ?? [], rotas: rotas.dados ?? [], locais: locais.dados ?? [], planos: planos.dados ?? [], duplos: duplos.dados ?? [], trechosDuplos: trechosDuplos.dados ?? [], disponibilidades: disponibilidades.dados ?? [], inicioSemana }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida" }, { status: 403 });
  const sessao = await gestao();
  if (!sessao) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const corpo = await request.json().catch(() => null);
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return NextResponse.json({ mensagem: "Dados inválidos" }, { status: 400 });
  const acao = corpo.acao;
  let resultado;
  if (acao === "requisito" && uuid.test(corpo.evento) && corpo.dados && typeof corpo.dados === "object") {
    resultado = await chamarFuncao("salvar_requisito_logistico", { p_evento: corpo.evento, p_dados: corpo.dados }, sessao.accessToken);
  } else if (acao === "vincular" && uuid.test(corpo.primeiro) && uuid.test(corpo.segundo) && corpo.primeiro !== corpo.segundo) {
    resultado = await chamarFuncao("vincular_evento_duplo", { p_primeiro: corpo.primeiro, p_segundo: corpo.segundo, p_observacao: typeof corpo.observacao === "string" ? corpo.observacao.slice(0, 500) : null }, sessao.accessToken);
  } else if (acao === "rota" && uuid.test(corpo.evento)) {
    const ponto = await consultar<Array<{ latitude: number; longitude: number }>>(`localizacao_evento?select=latitude,longitude&evento_id=eq.${corpo.evento}&limit=1`, sessao.accessToken);
    if (!ponto.ok || !ponto.dados?.[0]) return NextResponse.json({ mensagem: "Localize o evento no mapa antes de calcular a rota." }, { status: 400 });
    const { latitude, longitude } = ponto.dados[0];
    let rota;
    try { rota = await medirTrecho({ latitude: QG_CECCHIN.coordenada.lat, longitude: QG_CECCHIN.coordenada.lng }, { latitude, longitude }); }
    catch (falha) { return NextResponse.json({ mensagem: falha instanceof Error ? falha.message : "Rota indisponível" }, { status: 502 }); }
    resultado = await chamarFuncao("salvar_trajeto_logistico", { p_evento: corpo.evento, p_latitude: latitude, p_longitude: longitude, p_km: rota.km, p_minutos: rota.minutos }, sessao.accessToken);
  } else if (acao === "rota_dupla" && uuid.test(corpo.duplo)) {
    const dupla = await consultar<Array<{ primeiro_evento_id: string; segundo_evento_id: string }>>(`evento_duplo?select=primeiro_evento_id,segundo_evento_id&id=eq.${corpo.duplo}&limit=1`, sessao.accessToken);
    if (!dupla.ok || !dupla.dados?.[0]) return NextResponse.json({ mensagem: "Dupla não encontrada" }, { status: 404 });
    const [primeiro, segundo] = await Promise.all([dupla.dados[0].primeiro_evento_id, dupla.dados[0].segundo_evento_id].map((id) => consultar<Array<{ latitude: number; longitude: number }>>(`localizacao_evento?select=latitude,longitude&evento_id=eq.${id}&limit=1`, sessao.accessToken)));
    if (!primeiro.ok || !segundo.ok || !primeiro.dados?.[0] || !segundo.dados?.[0]) return NextResponse.json({ mensagem: "Localize os dois eventos no mapa antes de calcular o trajeto." }, { status: 400 });
    let rota;
    try { rota = await medirTrecho(primeiro.dados[0], segundo.dados[0]); }
    catch (falha) { return NextResponse.json({ mensagem: falha instanceof Error ? falha.message : "Rota indisponível" }, { status: 502 }); }
    resultado = await chamarFuncao("salvar_trajeto_duplo", { p_duplo: corpo.duplo, p_primeira_lat: primeiro.dados[0].latitude, p_primeira_lng: primeiro.dados[0].longitude, p_segunda_lat: segundo.dados[0].latitude, p_segunda_lng: segundo.dados[0].longitude, p_km: rota.km, p_minutos: rota.minutos }, sessao.accessToken);
  } else if (acao === "plano" && corpo.dados && typeof corpo.dados === "object" && uuid.test(corpo.dados.evento_id) && uuid.test(corpo.dados.veiculo_id)) {
    resultado = await chamarFuncao("salvar_plano_logistico", { p_dados: corpo.dados }, sessao.accessToken);
  } else return NextResponse.json({ mensagem: "Ação inválida" }, { status: 400 });
  if (!resultado.ok) {
    let mensagem = "Não foi possível salvar. Confira horário, capacidade, equipe e disponibilidade.";
    try { const erro = JSON.parse(resultado.erro ?? "{}"); if (typeof erro.message === "string") mensagem = erro.message; } catch { /* erro externo sem JSON */ }
    return NextResponse.json({ mensagem }, { status: resultado.status >= 500 || resultado.status === 0 ? 503 : 400 });
  }
  return NextResponse.json({ ok: true, id: resultado.dados }, { headers: { "Cache-Control": "no-store" } });
}
