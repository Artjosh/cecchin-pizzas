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

type Ponto = { latitude: number; longitude: number };
type EventoViagem = { id: string; data_evento: string; horario: string; cliente_nome: string };
type CargaViagem = { evento_id: string; pessoas_transportar: number; bebida_comeca_antes: boolean; forno_necessario: string; bebida_necessaria: string };
type CarroViagem = { id: string; lugares: number; limite_eventos_levar: number; proprietario_id: string | null; forno_maximo: string; bebida_maxima: string };

async function prepararViagem(ids: string[], veiculoId: string, token: string) {
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 20 || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== "string" || !uuid.test(id)) || typeof veiculoId !== "string" || !uuid.test(veiculoId)) throw new Error("Escolha de 2 a 20 eventos e um carro.");
  const filtro = `in.(${ids.join(",")})`;
  const [eventosR, cargasR, locaisR, carroR, configR, regraR] = await Promise.all([
    consultar<EventoViagem[]>(`vw_eventos_montagem?select=id,data_evento,horario,cliente_nome&id=${filtro}&limit=20`, token),
    consultar<CargaViagem[]>(`requisito_logistico_evento?select=evento_id,pessoas_transportar,bebida_comeca_antes,forno_necessario,bebida_necessaria&evento_id=${filtro}&limit=20`, token),
    consultar<Array<Ponto & { evento_id: string }>>(`localizacao_evento?select=evento_id,latitude,longitude&evento_id=${filtro}&limit=20`, token),
    consultar<CarroViagem[]>(`veiculo_operacional?select=id,lugares,limite_eventos_levar,proprietario_id,forno_maximo,bebida_maxima&id=eq.${veiculoId}&ativo=is.true&limit=1`, token),
    consultar<Array<{ montagem_padrao_minutos: number; montagem_bebida_antes_minutos: number; fator_pico_percentual: number; custo_frota_centavos_km: number }>>(`configuracao_logistica?select=montagem_padrao_minutos,montagem_bebida_antes_minutos,fator_pico_percentual,custo_frota_centavos_km&limit=1`, token),
    consultar<Array<{ material_centavos_km: number; pessoas_centavos_km: number; minimo_centavos: number; adicional_material_centavos: number }>>(`regra_veiculo_particular?select=material_centavos_km,pessoas_centavos_km,minimo_centavos,adicional_material_centavos&limit=1`, token),
  ]);
  if ([eventosR,cargasR,locaisR,carroR,configR,regraR].some((r) => !r.ok)) throw new Error("Não foi possível consultar eventos, carro e regras da viagem.");
  const carro = carroR.dados?.[0], config = configR.dados?.[0], regra = regraR.dados?.[0];
  if (!carro || !config || !regra || ids.length > carro.limite_eventos_levar) throw new Error("Carro não comporta essa quantidade de paradas.");
  const eventos = ids.map((id) => eventosR.dados?.find((e) => e.id === id));
  const cargas = ids.map((id) => cargasR.dados?.find((e) => e.evento_id === id));
  const locais = ids.map((id) => locaisR.dados?.find((e) => e.evento_id === id));
  if (eventos.some((e) => !e) || cargas.some((e) => !e) || locais.some((e) => !e)) throw new Error("Todos os eventos precisam de carga e localização.");
  if (cargas.reduce((total,carga) => total + Number(carga!.pessoas_transportar), 0) > carro.lugares) throw new Error("As equipes juntas não cabem no carro.");
  if (eventos.some((e) => e!.data_evento !== eventos[0]!.data_evento)) throw new Error("As paradas precisam ser no mesmo dia.");
  const ordemForno: Record<string, number> = { nenhum: 0, mini: 1, mini_medio: 2, medio: 3 };
  const ordemBebida: Record<string, number> = { nenhuma: 0, isopor_pequeno: 1, isopor_grande: 2 };
  if (cargas.some((carga) => ordemForno[carga!.forno_necessario] > ordemForno[carro.forno_maximo] || ordemBebida[carga!.bebida_necessaria] > ordemBebida[carro.bebida_maxima])) throw new Error("A carga de uma parada excede a capacidade do carro.");
  const pontos = locais as Ponto[];
  const qg = { latitude: QG_CECCHIN.coordenada.lat, longitude: QG_CECCHIN.coordenada.lng };
  const coordenadas = [qg, ...pontos, qg].map((p) => `${p.longitude},${p.latitude}`).join(";");
  const resposta = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordenadas}?overview=false&steps=false`, { signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (!resposta.ok) throw new Error("Serviço de rotas indisponível.");
  const pernasOrigem = ((await resposta.json()) as { routes?: Array<{ legs?: Array<{ distance: number; duration: number }> }> }).routes?.[0]?.legs;
  if (!pernasOrigem || pernasOrigem.length !== ids.length + 1 || pernasOrigem.some((p) => !Number.isFinite(p.distance) || !Number.isFinite(p.duration) || p.distance <= 0 || p.duration <= 0)) throw new Error("Rota com paradas não encontrada.");
  const pernas = pernasOrigem.map((p) => ({ km: Math.max(0.01,Math.round(p.distance / 10) / 100), minutos: Math.max(1,Math.ceil(p.duration / 60)) }));
  const prazos = ids.map((_, indice) => {
    const evento = eventos[indice]!, carga = cargas[indice]!;
    const inicio = Date.parse(`${evento.data_evento}T${evento.horario.slice(0,5)}:00-03:00`);
    return inicio - Number(carga.bebida_comeca_antes ? config.montagem_bebida_antes_minutos : config.montagem_padrao_minutos) * 60_000;
  });
  if (prazos.some((p) => !Number.isFinite(p))) throw new Error("Horário de evento inválido.");
  const calcularSaida = (fator: number) => {
    let acumulado = 0;
    return Math.min(...prazos.map((prazo,indice) => { acumulado += Math.ceil(pernas[indice].minutos * fator / 100) * 60_000; return prazo - acumulado; }));
  };
  const fatorNoHorario = (saida: number) => {
    const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(new Date(saida)));
    return (hora >= 7 && hora < 9) || (hora >= 17 && hora < 20) ? Number(config.fator_pico_percentual) : 100;
  };
  const candidatos = [...new Set([100, Number(config.fator_pico_percentual)])].map(calcularSaida).sort((a,b) => b-a);
  const saida = candidatos.find((instante) => instante <= calcularSaida(fatorNoHorario(instante))) ?? candidatos[candidatos.length-1];
  const fator = fatorNoHorario(saida);
  let acumulado = 0;
  const paradas = ids.map((id, indice) => { acumulado += Math.ceil(pernas[indice].minutos * fator / 100) * 60_000; return { eventoId: id, nome: eventos[indice]!.cliente_nome, chegadaPrevista: new Date(saida + acumulado).toISOString(), prazo: new Date(prazos[indice]).toISOString() }; });
  if (paradas.some((p) => Date.parse(p.chegadaPrevista) > Date.parse(p.prazo))) throw new Error("Essa ordem não chega a tempo a todos os eventos. Altere a sequência.");
  const retorno = saida + acumulado + Math.ceil(pernas[ids.length].minutos * fator / 100) * 60_000;
  const distanciaKm = Math.round(pernas.reduce((total, perna) => total + perna.km, 0) * 100) / 100;
  const material = cargas.some((c) => c!.forno_necessario !== "nenhum" || c!.bebida_necessaria !== "nenhuma");
  const custoCentavos = carro.proprietario_id ? Math.max(Number(regra.minimo_centavos), Math.round(distanciaKm * Number(material ? regra.material_centavos_km : regra.pessoas_centavos_km))) + (material ? Number(regra.adicional_material_centavos) : 0) : Math.round(distanciaKm * Number(config.custo_frota_centavos_km));
  return { eventos: ids, veiculo_id: veiculoId, pontos: pontos.map(({ latitude, longitude }) => ({ latitude, longitude })), pernas, saida_prevista: new Date(saida).toISOString(), retorno_previsto: new Date(retorno).toISOString(), distancia_km: distanciaKm, custo_estimado: custoCentavos / 100, paradas };
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
  const [eventos, veiculos, configuracao, capacidade, regra, pessoas] = await Promise.all([
    consultar<Array<{ id: string; cliente_nome: string; data_evento: string; horario: string; inteiros: number; meios: number }>>(`vw_eventos_montagem?select=id,cliente_nome,data_evento,horario,inteiros,meios&data_evento=eq.${dia}&order=horario.asc,id.asc&limit=100`, token),
    consultar("veiculo_operacional?select=id,placa,modelo,forno_maximo,bebida_maxima,lugares,limite_eventos_levar,proprietario_id,ativo&ativo=is.true&order=modelo.asc&limit=200", token),
    consultar<Array<Record<string, unknown>>>("configuracao_logistica?select=*&limit=1", token),
    consultar<Array<{ duracao_minutos: number }>>("configuracao_capacidade?select=duracao_minutos&limit=1", token),
    consultar<Array<Record<string, unknown>>>("regra_veiculo_particular?select=*&limit=1", token),
    consultar<Array<{ id: string; nome: string }>>("usuario?select=id,nome&ativo=is.true&papel=in.(staff,gestao,admin)&order=nome.asc&limit=300", token),
  ]);
  if ([eventos, veiculos, configuracao, capacidade, regra, pessoas].some((r) => !r.ok)) return NextResponse.json({ mensagem: "Não foi possível carregar a logística. Confira as migrações e o acesso ao banco." }, { status: 503 });
  const ids = (eventos.dados ?? []).map((e) => e.id);
  const semana = new Date(`${dia}T12:00:00Z`);
  semana.setUTCDate(semana.getUTCDate() - ((semana.getUTCDay() + 6) % 7));
  const inicioSemana = semana.toISOString().slice(0, 10);
  const semanaAnterior = new Date(semana); semanaAnterior.setUTCDate(semanaAnterior.getUTCDate() - 7);
  const semanaSeguinte = new Date(semana); semanaSeguinte.setUTCDate(semanaSeguinte.getUTCDate() + 7);
  const semanas = [semanaAnterior.toISOString().slice(0, 10), inicioSemana, semanaSeguinte.toISOString().slice(0, 10)].join(",");
  const donos = [...new Set(((veiculos.dados ?? []) as Array<{ proprietario_id: string | null }>).flatMap((carro) => carro.proprietario_id ? [carro.proprietario_id] : []))];
  const filtroDonos = donos.length ? donos.join(",") : "00000000-0000-0000-0000-000000000000";
  const idsFiltro = ids.length ? `&evento_id=in.(${ids.join(",")})` : "&evento_id=eq.00000000-0000-0000-0000-000000000000";
  const amanha = new Date(`${dia}T12:00:00Z`);
  amanha.setUTCDate(amanha.getUTCDate() + 1);
  const fimDia = amanha.toISOString().slice(0, 10);
  const [requisitos, rotas, locais, planos, duplos, disponibilidades, disponibilidadesPessoas] = await Promise.all([
    consultar<Array<Record<string, unknown>>>(`requisito_logistico_evento?select=*${idsFiltro}&limit=100`, token),
    consultar<Array<Record<string, unknown>>>(`trajeto_logistico_evento?select=*${idsFiltro}&limit=100`, token),
    consultar<Array<Record<string, unknown>>>(`localizacao_evento?select=evento_id,latitude,longitude${idsFiltro}&limit=100`, token),
    consultar(`plano_logistico?select=*&saida_prevista=lt.${fimDia}T00:00:00-03:00&retorno_previsto=gt.${dia}T00:00:00-03:00&situacao=neq.cancelado&limit=200`, token),
    consultar(`evento_duplo?select=*&or=(primeiro_evento_id.in.(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"}),segundo_evento_id.in.(${ids.length ? ids.join(",") : "00000000-0000-0000-0000-000000000000"}))&limit=100`, token),
    consultar(`disponibilidade_veiculo?select=veiculo_id,semana,dias&semana=in.(${semanas})&limit=600`, token),
    consultar(`disponibilidade_semanal?select=usuario_id,semana,dias&usuario_id=in.(${filtroDonos})&semana=in.(${semanas})&limit=600`, token),
  ]);
  if ([requisitos, rotas, locais, planos, duplos, disponibilidades, disponibilidadesPessoas].some((r) => !r.ok)) return NextResponse.json({ mensagem: "Não foi possível carregar os planos e a disponibilidade." }, { status: 503 });
  const idsDuplos = ((duplos.dados ?? []) as Array<{ id: string }>).map((item) => item.id);
  const segundosForaDoDia = [...new Set(((duplos.dados ?? []) as Array<{ segundo_evento_id: string }>).map((item) => item.segundo_evento_id).filter((id) => !ids.includes(id)))];
  const filtroSegundos = segundosForaDoDia.join(",");
  const [eventosVinculados, requisitosVinculados, rotasVinculadas, locaisVinculados] = segundosForaDoDia.length ? await Promise.all([
    consultar<Array<Record<string, unknown>>>(`vw_eventos_montagem?select=id,cliente_nome,data_evento,horario,inteiros,meios&id=in.(${filtroSegundos})&limit=100`, token),
    consultar<Array<Record<string, unknown>>>(`requisito_logistico_evento?select=*&evento_id=in.(${filtroSegundos})&limit=100`, token),
    consultar<Array<Record<string, unknown>>>(`trajeto_logistico_evento?select=*&evento_id=in.(${filtroSegundos})&limit=100`, token),
    consultar<Array<Record<string, unknown>>>(`localizacao_evento?select=evento_id,latitude,longitude&evento_id=in.(${filtroSegundos})&limit=100`, token),
  ]) : [{ ok: true, dados: [] }, { ok: true, dados: [] }, { ok: true, dados: [] }, { ok: true, dados: [] }];
  if ([eventosVinculados, requisitosVinculados, rotasVinculadas, locaisVinculados].some((r) => !r.ok)) return NextResponse.json({ mensagem: "Não foi possível carregar o segundo evento das duplas." }, { status: 503 });
  const trechosDuplos = idsDuplos.length ? await consultar(`trajeto_logistico_duplo?select=*&evento_duplo_id=in.(${idsDuplos.join(",")})&limit=100`, token) : { ok: true, dados: [] };
  if (!trechosDuplos.ok) return NextResponse.json({ mensagem: "Não foi possível carregar os trajetos entre eventos." }, { status: 503 });
  const idsPlanos = ((planos.dados ?? []) as Array<{ id: string }>).map((plano) => plano.id);
  const paradas = idsPlanos.length ? await consultar(`parada_viagem_levar?select=plano_id,evento_id,ordem,chegada_prevista&plano_id=in.(${idsPlanos.join(",")})&order=ordem.asc&limit=200`, token) : { ok: true, dados: [] };
  if (!paradas.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as paradas das viagens." }, { status: 503 });
  return NextResponse.json({ eventos: eventos.dados ?? [], eventosVinculados: eventosVinculados.dados ?? [], veiculos: veiculos.dados ?? [], pessoas: pessoas.dados ?? [], configuracao: configuracao.dados?.[0] ?? null, capacidade: capacidade.dados?.[0] ?? null, regra: regra.dados?.[0] ?? null, requisitos: [...(requisitos.dados ?? []), ...(requisitosVinculados.dados ?? [])], rotas: [...(rotas.dados ?? []), ...(rotasVinculadas.dados ?? [])], locais: [...(locais.dados ?? []), ...(locaisVinculados.dados ?? [])], planos: planos.dados ?? [], paradas: paradas.dados ?? [], duplos: duplos.dados ?? [], trechosDuplos: trechosDuplos.dados ?? [], disponibilidades: disponibilidades.dados ?? [], disponibilidadesPessoas: disponibilidadesPessoas.dados ?? [], inicioSemana }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida" }, { status: 403 });
  const sessao = await gestao();
  if (!sessao) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const corpo = await request.json().catch(() => null);
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return NextResponse.json({ mensagem: "Dados inválidos" }, { status: 400 });
  const acao = corpo.acao;
  if (acao === "prever_viagem" || acao === "viagem") {
    try {
      const viagem = await prepararViagem(corpo.eventos, corpo.veiculo_id, sessao.accessToken);
      if (acao === "prever_viagem") return NextResponse.json(viagem, { headers: { "Cache-Control": "no-store" } });
      const motorista = typeof corpo.motorista_id === "string" ? corpo.motorista_id : "";
      const justificativa = typeof corpo.justificativa === "string" ? corpo.justificativa.trim() : "";
      if (!uuid.test(motorista) || justificativa.length < 10 || justificativa.length > 500) return NextResponse.json({ mensagem: "Informe motorista e como as equipes serão buscadas." }, { status: 400 });
      const resultado = await chamarFuncao("salvar_viagem_levar", { p_dados: { eventos: viagem.eventos, pontos: viagem.pontos, pernas: viagem.pernas, veiculo_id: viagem.veiculo_id, saida_prevista: viagem.saida_prevista, motorista_id: motorista, justificativa } }, sessao.accessToken);
      if (!resultado.ok) {
        let mensagem = "Não foi possível aprovar a viagem. Confira capacidade, horários e disponibilidade do carro.";
        try { const erro = JSON.parse(resultado.erro ?? "{}"); if (typeof erro.message === "string") mensagem = erro.message; } catch { /* erro externo */ }
        return NextResponse.json({ mensagem }, { status: resultado.status >= 500 || resultado.status === 0 ? 503 : 400 });
      }
      return NextResponse.json({ ok: true, id: resultado.dados }, { headers: { "Cache-Control": "no-store" } });
    } catch (falha) { return NextResponse.json({ mensagem: falha instanceof Error ? falha.message : "Rota indisponível" }, { status: 400 }); }
  }
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
