"use client";

import { useEffect, useMemo, useState } from "react";
import { planejarLogistica, type PropostaLogistica, type ResultadoPlanejador, type TipoBebida, type TipoForno, type VeiculoPlanejavel } from "@/src/lib/logistica/planejador";
import { carroEMotoristaCoincidemNoDia, janelasCarro, janelasPessoa, type DiaPessoa } from "@/src/lib/logistica/janelasDisponibilidade";
import { sugerirParadas } from "@/src/lib/logistica/sugerirParadas";

type Evento = { id: string; cliente_nome: string; data_evento: string; horario: string; inteiros: number; meios: number };
type Requisito = { evento_id: string; forno_necessario: string; bebida_necessaria: string; bebida_comeca_antes: boolean; pessoas_transportar: number };
type Rota = { evento_id: string; distancia_km: number; duracao_minutos: number; medido_em: string; latitude: number; longitude: number };
type Duplo = { id: string; codigo: string; primeiro_evento_id: string; segundo_evento_id: string };
type TrechoDuplo = { evento_duplo_id: string; primeira_latitude: number; primeira_longitude: number; segunda_latitude: number; segunda_longitude: number; distancia_km: number; duracao_minutos: number; medido_em: string };
type Plano = { id: string; evento_id: string; evento_duplo_id: string | null; situacao: string; veiculo_id: string; motorista_id: string | null; modo: string; saida_prevista: string; retorno_previsto: string; ajuda_solicitada: string | null; distancia_km: number | null; custo_estimado: number | null };
type Parada = { plano_id: string; evento_id: string; ordem: number; chegada_prevista: string };
type ViagemPrevista = { eventos: string[]; veiculo_id: string; saida_prevista: string; retorno_previsto: string; distancia_km: number; custo_estimado: number; paradas: Array<{ eventoId: string; nome: string; chegadaPrevista: string; prazo: string }> };
type Veiculo = { id: string; modelo: string; placa: string; forno_maximo: TipoForno; bebida_maxima: TipoBebida; lugares: number; limite_eventos_levar: number; proprietario_id: string | null };
type Dados = { eventos: Evento[]; eventosVinculados: Evento[]; requisitos: Requisito[]; rotas: Rota[]; locais: Array<{ evento_id: string; latitude: number; longitude: number }>; duplos: Duplo[]; trechosDuplos: TrechoDuplo[]; planos: Plano[]; paradas: Parada[]; veiculos: Veiculo[]; pessoas: Array<{ id: string; nome: string; papel: string }>; disponibilidades: Array<{ veiculo_id: string; semana: string; dias: boolean[] }>; disponibilidadesPessoas: Array<{ usuario_id: string; semana: string; dias: DiaPessoa[] }>; configuracao: Record<string, number> | null; capacidade: { duracao_minutos: number } | null; regra: Record<string, number> | null };
const campo = "min-w-0 rounded-xl bg-surface-container px-3 py-2 text-sm text-on-surface";

function dataLocal() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

function rotaAtual(dados: Dados, eventoId: string): Rota | undefined {
  const rota = dados.rotas.find((item) => item.evento_id === eventoId);
  const local = dados.locais.find((item) => item.evento_id === eventoId);
  if (!rota || !local || rota.latitude !== local.latitude || rota.longitude !== local.longitude || Date.now() - Date.parse(rota.medido_em) > 7 * 86_400_000) return undefined;
  return rota;
}

function trechoAtual(dados: Dados, dupla: Duplo): TrechoDuplo | undefined {
  const trecho = dados.trechosDuplos.find((item) => item.evento_duplo_id === dupla.id);
  const a = dados.locais.find((item) => item.evento_id === dupla.primeiro_evento_id);
  const b = dados.locais.find((item) => item.evento_id === dupla.segundo_evento_id);
  if (!trecho || !a || !b || trecho.primeira_latitude !== a.latitude || trecho.primeira_longitude !== a.longitude || trecho.segunda_latitude !== b.latitude || trecho.segunda_longitude !== b.longitude || Date.now() - Date.parse(trecho.medido_em) > 7 * 86_400_000) return undefined;
  return trecho;
}

const ordemForno: TipoForno[] = ["nenhum", "mini", "mini_medio", "medio"];
const ordemBebida: TipoBebida[] = ["nenhuma", "isopor_pequeno", "isopor_grande"];

function motoristaDisponivel(dados: Dados, id: string, saidaIso: string, retornoIso: string, exigirDeclaracao = false) {
  const pessoa = dados.pessoas.find((item) => item.id === id);
  const saida = Date.parse(saidaIso), retorno = Date.parse(retornoIso);
  if (!pessoa || !Number.isFinite(saida) || !Number.isFinite(retorno) || retorno <= saida) return false;
  if (dados.planos.some((plano) => plano.situacao === "aprovado" && plano.motorista_id === id &&
    saida < Date.parse(plano.retorno_previsto) && retorno > Date.parse(plano.saida_prevista))) return false;
  if (pessoa.papel !== "staff" && !exigirDeclaracao) return true;
  const janelas = dados.disponibilidadesPessoas.filter((item) => item.usuario_id === id)
    .flatMap((item) => janelasPessoa(item.semana, item.dias)).sort((a, b) => a.inicioMs - b.inicioMs);
  let cobertoAte = saida;
  for (const janela of janelas) {
    if (janela.inicioMs > cobertoAte) break;
    cobertoAte = Math.max(cobertoAte, janela.fimMs);
    if (cobertoAte >= retorno) return true;
  }
  return false;
}

function veiculosDoDia(dados: Dados, dia: string): VeiculoPlanejavel[] {
  const carrosPorId = new Map<string, ReturnType<typeof janelasCarro>>();
  for (const item of dados.disponibilidades) carrosPorId.set(item.veiculo_id, [...(carrosPorId.get(item.veiculo_id) ?? []), ...janelasCarro(item.semana, item.dias)]);
  const pessoasPorId = new Map<string, ReturnType<typeof janelasPessoa>>();
  for (const item of dados.disponibilidadesPessoas) pessoasPorId.set(item.usuario_id, [...(pessoasPorId.get(item.usuario_id) ?? []), ...janelasPessoa(item.semana, item.dias)]);
  return dados.veiculos.map((carro) => {
    const janelasDoCarro = carro.proprietario_id ? (carrosPorId.get(carro.id) ?? []).sort((a, b) => a.inicioMs - b.inicioMs) : undefined;
    const janelasDoMotorista = carro.proprietario_id ? (pessoasPorId.get(carro.proprietario_id) ?? []).sort((a, b) => a.inicioMs - b.inicioMs) : undefined;
    return { id: carro.id, modelo: carro.modelo, placa: carro.placa, proprietarioId: carro.proprietario_id, forno: carro.forno_maximo, bebida: carro.bebida_maxima, lugares: carro.lugares, limiteLevar: carro.limite_eventos_levar, disponivel: !carro.proprietario_id || carroEMotoristaCoincidemNoDia(dia, janelasDoCarro ?? [], janelasDoMotorista ?? []), janelasCarro: janelasDoCarro, janelasMotorista: janelasDoMotorista };
  });
}

function eventoCabeNaViagem(dados: Dados, carro: Veiculo, evento: Evento) {
  const carga = dados.requisitos.find((item) => item.evento_id === evento.id);
  return Boolean(carga && rotaAtual(dados, evento.id)
    && carga.pessoas_transportar > 0
    && ordemForno.includes(carga.forno_necessario as TipoForno)
    && ordemBebida.includes(carga.bebida_necessaria as TipoBebida)
    && ordemForno.indexOf(carga.forno_necessario as TipoForno) <= ordemForno.indexOf(carro.forno_maximo)
    && ordemBebida.indexOf(carga.bebida_necessaria as TipoBebida) <= ordemBebida.indexOf(carro.bebida_maxima));
}

function sugerirGrupoViagem(dados: Dados, carro: Veiculo, eventos: Evento[]) {
  return sugerirParadas(eventos.filter((evento) => eventoCabeNaViagem(dados, carro, evento)).map((evento) => ({
    id: evento.id,
    horario: evento.horario,
    pessoas: dados.requisitos.find((item) => item.evento_id === evento.id)!.pessoas_transportar,
    rotaMinutos: rotaAtual(dados, evento.id)!.duracao_minutos,
  })), carro.lugares, carro.limite_eventos_levar);
}

function propostasDoDia(dados: Dados, veiculos: VeiculoPlanejavel[]): ResultadoPlanejador {
  const pendenciasPreparacao: ResultadoPlanejador["pendencias"] = [];
  const eventos = dados.eventos.flatMap((evento) => {
    const requisito = dados.requisitos.find((item) => item.evento_id === evento.id);
    const rota = rotaAtual(dados, evento.id);
    const dupla = dados.duplos.find((item) => item.primeiro_evento_id === evento.id || item.segundo_evento_id === evento.id);
    if (dupla?.segundo_evento_id === evento.id || dados.planos.some((plano) => plano.evento_id === evento.id && plano.situacao === "aprovado") || dados.paradas.some((parada) => parada.evento_id === evento.id && dados.planos.some((plano) => plano.id === parada.plano_id && plano.situacao === "aprovado"))) return [];
    if (!requisito || !rota) {
      pendenciasPreparacao.push({ eventoId: evento.id, motivo: !requisito ? "Informe a carga do evento para receber sugestões de carro." : "Calcule a rota do evento para receber sugestões de saída." });
      return [];
    }
    const base = { id: evento.id, inicioMs: Date.parse(`${evento.data_evento}T${evento.horario}-03:00`), convidados: (evento.inteiros ?? 0) + (evento.meios ?? 0), forno: requisito.forno_necessario as TipoForno, bebida: requisito.bebida_necessaria as TipoBebida, bebidaAntes: requisito.bebida_comeca_antes, pessoas: requisito.pessoas_transportar, rotaMinutos: rota.duracao_minutos, rotaKm: rota.distancia_km };
    if (!dupla) return [base];
    const segundo = [...dados.eventos, ...dados.eventosVinculados].find((item) => item.id === dupla.segundo_evento_id);
    const requisitoSegundo = dados.requisitos.find((item) => item.evento_id === dupla.segundo_evento_id);
    const rotaSegundo = rotaAtual(dados, dupla.segundo_evento_id);
    const trecho = trechoAtual(dados, dupla);
    if (!segundo || !requisitoSegundo || !rotaSegundo || !trecho) {
      pendenciasPreparacao.push({ eventoId: evento.id, motivo: "Complete a carga e as rotas dos dois eventos da dupla, incluindo o trecho entre eles." });
      return [];
    }
    return [{ ...base, forno: ordemForno[Math.max(ordemForno.indexOf(base.forno), ordemForno.indexOf(requisitoSegundo.forno_necessario as TipoForno))], bebida: ordemBebida[Math.max(ordemBebida.indexOf(base.bebida), ordemBebida.indexOf(requisitoSegundo.bebida_necessaria as TipoBebida))], pessoas: Math.max(base.pessoas, requisitoSegundo.pessoas_transportar), segundoEventoId: segundo.id, segundoInicioMs: Date.parse(`${segundo.data_evento}T${segundo.horario}-03:00`), segundoBebidaAntes: requisitoSegundo.bebida_comeca_antes, trechoSegundoMinutos: trecho.duracao_minutos, trechoSegundoKm: trecho.distancia_km, segundaRotaKm: rotaSegundo.distancia_km, segundaRotaMinutos: rotaSegundo.duracao_minutos }];
  });
  if (!dados.configuracao || !dados.capacidade || !dados.regra) return { propostas: [], alternativas: {}, pendencias: dados.eventos.map((evento) => ({ eventoId: evento.id, motivo: "Configure a capacidade, a logística e o veículo particular antes de gerar sugestões." })), eventos: dados.eventos.length, carrosDisponiveis: veiculos.filter((carro) => carro.disponivel).length };
  const c = dados.configuracao, r = dados.regra;
  const aprovadas = dados.planos.filter((plano) => plano.situacao === "aprovado").map((plano) => ({ veiculoId: plano.veiculo_id, saidaMs: Date.parse(plano.saida_prevista), retornoMs: Date.parse(plano.retorno_previsto) }));
  const resultado = planejarLogistica(eventos, veiculos, { minutosCarregar: c.minutos_carregar, flexSaidaMinutos: c.flex_saida_minutos, montagemPadraoMinutos: c.montagem_padrao_minutos, montagemBebidaAntesMinutos: c.montagem_bebida_antes_minutos, fatorPicoPercentual: c.fator_pico_percentual, custoFrotaCentavosKm: c.custo_frota_centavos_km, materialCentavosKm: r.material_centavos_km, pessoasCentavosKm: r.pessoas_centavos_km, minimoCentavos: r.minimo_centavos, adicionalMaterialCentavos: r.adicional_material_centavos, duracaoEventoMinutos: dados.capacidade.duracao_minutos }, aprovadas);
  return { ...resultado, pendencias: [...pendenciasPreparacao, ...resultado.pendencias] };
}

export function LogisticaPainel({ diaInicial }: { diaInicial?: string } = {}) {
  const [dia, setDia] = useState(diaInicial ?? dataLocal);
  useEffect(() => { if (diaInicial) setDia(diaInicial); }, [diaInicial]);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [primeiro, setPrimeiro] = useState("");
  const [segundo, setSegundo] = useState("");
  const [confirmarDesvinculo, setConfirmarDesvinculo] = useState<string | null>(null);
  const [cancelarPlanoId, setCancelarPlanoId] = useState<string | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [selecionados, setSelecionados] = useState<Set<string> | null>(null);
  const [opcaoPorEvento, setOpcaoPorEvento] = useState<Record<string, string>>({});
  const [eventosViagem, setEventosViagem] = useState<string[]>([]);
  const [carroViagem, setCarroViagem] = useState("");
  const [motoristaViagem, setMotoristaViagem] = useState("");
  const [justificativaViagem, setJustificativaViagem] = useState("");
  const [previsaoViagem, setPrevisaoViagem] = useState<ViagemPrevista | null>(null);
  useEffect(() => { setPrevisaoViagem(null); }, [dia, eventosViagem, carroViagem, revisao]);
  useEffect(() => {
    const controller = new AbortController();
    setDados(null); setErro("");
    fetch(`/api/operacao/logistica?data=${dia}`, { signal: controller.signal }).then(async (resposta) => {
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.mensagem ?? "Falha ao carregar");
      setDados(corpo);
    }).catch((falha) => { if (!controller.signal.aborted) setErro(falha instanceof Error ? falha.message : "Falha ao carregar"); });
    return () => controller.abort();
  }, [dia, revisao]);

  async function acao(nome: string, corpo: Record<string, unknown>) {
    setOcupado(nome); setErro("");
    try {
      const resposta = await fetch("/api/operacao/logistica", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: nome, ...corpo }) });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.mensagem ?? "Não foi possível salvar");
      setRevisao((valor) => valor + 1);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar"); }
    finally { setOcupado(""); }
  }

  async function preverViagem() {
    setOcupado("prever_viagem"); setErro(""); setPrevisaoViagem(null);
    try {
      const resposta = await fetch("/api/operacao/logistica", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "prever_viagem", eventos: eventosViagem, veiculo_id: carroViagem }) });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.mensagem ?? "Rota indisponível");
      setPrevisaoViagem(resultado as ViagemPrevista);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível calcular a viagem"); }
    finally { setOcupado(""); }
  }

  const veiculosPlanejaveis = useMemo(() => dados ? veiculosDoDia(dados, dia) : [], [dados, dia]);
  const carrosDisponiveisNoDia = veiculosPlanejaveis.filter((carro) => carro.disponivel).length;
  const veiculosSelecionados = useMemo(() => veiculosPlanejaveis.map((carro) => ({ ...carro, disponivel: carro.disponivel && (selecionados === null || selecionados.has(carro.id)) })), [veiculosPlanejaveis, selecionados]);
  const planejamento = useMemo(() => dados ? propostasDoDia(dados, veiculosSelecionados) : { propostas: [], alternativas: {}, pendencias: [], eventos: 0, carrosDisponiveis: 0 }, [dados, veiculosSelecionados]);
  const propostas = new Map<string, PropostaLogistica>(planejamento.propostas.map((proposta) => [proposta.eventoId, proposta]));
  const carroEscolhido = dados?.veiculos.find((carro) => carro.id === carroViagem);
  const carroViagemDisponivel = veiculosSelecionados.some((carro) => carro.id === carroViagem && carro.disponivel);
  const custosLevarSeparado = previsaoViagem?.eventos.map((id) =>
    [propostas.get(id), ...(planejamento.alternativas[id] ?? [])]
      .filter((proposta): proposta is PropostaLogistica => proposta?.modo === "levar")
      .sort((a, b) => a.custoCentavos - b.custoCentavos)[0]?.custoCentavos);
  const custoSeparadoCentavos = custosLevarSeparado?.every((valor) => valor != null)
    ? custosLevarSeparado.reduce((total, valor) => total + valor!, 0)
    : null;
  const motoristaViagemPronto = Boolean(dados && previsaoViagem && motoristaDisponivel(dados, motoristaViagem, previsaoViagem.saida_prevista, previsaoViagem.retorno_previsto, Boolean(carroEscolhido?.proprietario_id)));
  const eventosParaViagem = dados?.eventos.filter((evento) => dados.requisitos.some((requisito) => requisito.evento_id === evento.id) && dados.locais.some((local) => local.evento_id === evento.id) && !dados.duplos.some((dupla) => dupla.primeiro_evento_id === evento.id || dupla.segundo_evento_id === evento.id) && !dados.planos.some((plano) => plano.evento_id === evento.id && plano.situacao === "aprovado") && !dados.paradas.some((parada) => parada.evento_id === evento.id && dados.planos.some((plano) => plano.id === parada.plano_id && plano.situacao === "aprovado"))) ?? [];
  const lugaresUsados = eventosViagem.reduce((total, id) => total + (dados?.requisitos.find((item) => item.evento_id === id)?.pessoas_transportar ?? 0), 0);

  return <section className="space-y-4 rounded-2xl bg-surface-container-low p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-headline-sm text-headline-sm">Planejar saídas</h2><p className="text-sm text-on-surface-variant">Confira carga, trajeto e carro antes de aprovar a logística.</p></div><label className="grid gap-1 text-xs">Dia dos eventos<input className={campo} type="date" value={dia} onChange={(evento) => { setDia(evento.target.value); setSelecionados(null); setOpcaoPorEvento({}); }} /></label></div>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm text-on-error-container">{erro}</p>}
    {!dados && !erro && <p role="status" className="text-sm text-on-surface-variant">Carregando eventos e veículos…</p>}
    {dados && <>
      <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-surface-container px-3 py-1">{dados.eventos.length} eventos</span><span className="rounded-full bg-surface-container px-3 py-1">{carrosDisponiveisNoDia} carros disponíveis no dia · {planejamento.carrosDisponiveis} selecionados</span><span className="rounded-full bg-surface-container px-3 py-1">{dados.planos.filter((plano) => plano.situacao === "aprovado").length} planos aprovados</span></div>
      {planejamento.pendencias.length > 0 && <div role="status" className="space-y-2 rounded-xl bg-primary/10 p-3 text-sm"><strong>Ajuda necessária em {planejamento.pendencias.length} {planejamento.pendencias.length === 1 ? "evento" : "eventos"}</strong><ul className="space-y-1">{planejamento.pendencias.map((pendencia) => <li key={pendencia.eventoId}><span className="font-semibold">{dados.eventos.find((evento) => evento.id === pendencia.eventoId)?.cliente_nome ?? "Evento"}:</span> {pendencia.motivo}</li>)}</ul></div>}
      <div className="space-y-2 rounded-xl bg-surface-container p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><strong>Carros usados nas sugestões</strong><div className="flex gap-2"><button type="button" onClick={() => setSelecionados(null)} className="rounded-lg bg-surface-container-high px-2 py-1">Todos</button><button type="button" onClick={() => setSelecionados(new Set())} className="rounded-lg bg-surface-container-high px-2 py-1">Limpar</button></div></div><div className="flex flex-wrap gap-x-4 gap-y-2">{dados.veiculos.map((carro) => <label key={carro.id} className="flex items-center gap-1"><input type="checkbox" checked={selecionados === null || selecionados.has(carro.id)} onChange={(ev) => { const proximo = new Set(selecionados ?? dados.veiculos.map((item) => item.id)); if (ev.target.checked) proximo.add(carro.id); else proximo.delete(carro.id); setSelecionados(proximo); }} /><span>{carro.modelo} · {carro.placa} · {carro.proprietario_id ? "particular" : "empresa"}</span></label>)}</div></div>
      {eventosParaViagem.length >= 2 && <section className="space-y-3 rounded-2xl bg-surface-container p-4" aria-label="Viagem com várias paradas">
        <div><h3 className="font-semibold">Levar vários eventos em uma saída</h3><p className="text-xs text-on-surface-variant">Escolha o carro e as paradas na ordem da entrega. A rota vai do QG aos eventos e volta ao QG; o custo do carro é calculado uma vez.</p></div>
        <div className="flex flex-wrap gap-2"><select aria-label="Carro da viagem" className={campo} value={carroViagem} onChange={(ev) => { const carro = dados.veiculos.find((item) => item.id === ev.target.value); setCarroViagem(ev.target.value); setMotoristaViagem(carro?.proprietario_id ?? ""); setEventosViagem([]); }}><option value="">Selecione o carro</option>{veiculosSelecionados.filter((carro) => carro.disponivel && carro.limiteLevar >= 2).map((carro) => <option key={carro.id} value={carro.id}>{carro.modelo} · {carro.placa} · até {carro.limiteLevar} paradas</option>)}</select><button type="button" disabled={!carroEscolhido || !carroViagemDisponivel} onClick={() => setEventosViagem(sugerirGrupoViagem(dados, carroEscolhido!, eventosParaViagem))} className="rounded-xl bg-surface-container-high px-3 py-2 text-xs disabled:opacity-50">Sugerir grupo por horário e capacidade</button></div>
        {carroEscolhido && <><p className="text-xs text-on-surface-variant">{eventosViagem.length}/{carroEscolhido.limite_eventos_levar} paradas · {lugaresUsados}/{carroEscolhido.lugares} lugares</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{eventosParaViagem.map((evento) => { const ordem = eventosViagem.indexOf(evento.id); return <div key={evento.id} className="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-2 text-xs"><label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" checked={ordem >= 0} disabled={ordem < 0 && (!carroViagemDisponivel || !eventoCabeNaViagem(dados, carroEscolhido, evento) || eventosViagem.length >= carroEscolhido.limite_eventos_levar || lugaresUsados + (dados.requisitos.find((item) => item.evento_id === evento.id)?.pessoas_transportar ?? 0) > carroEscolhido.lugares)} onChange={(ev) => setEventosViagem((atual) => ev.target.checked ? [...atual,evento.id] : atual.filter((id) => id !== evento.id))} /><span className="truncate">{ordem >= 0 ? `${ordem+1}. ` : ""}{evento.horario?.slice(0,5)} · {evento.cliente_nome}</span></label>{ordem > 0 && <button type="button" aria-label={`Antecipar ${evento.cliente_nome}`} onClick={() => setEventosViagem((atual) => { const proximo=[...atual]; [proximo[ordem-1],proximo[ordem]]=[proximo[ordem],proximo[ordem-1]]; return proximo; })}>↑</button>}</div>; })}</div>
          <button type="button" disabled={Boolean(ocupado) || !carroViagemDisponivel || eventosViagem.length < 2} onClick={() => void preverViagem()} className="rounded-xl bg-surface-container-high px-4 py-2 text-sm font-semibold disabled:opacity-50">{ocupado === "prever_viagem" ? "Calculando rota…" : "Calcular viagem"}</button></>}
        {previsaoViagem && <div className="space-y-3 rounded-xl bg-surface-container-lowest p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{previsaoViagem.distancia_km} km · custo estimado R$ {previsaoViagem.custo_estimado.toFixed(2).replace(".",",")}</strong><span>Saída {new Date(previsaoViagem.saida_prevista).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",dateStyle:"short",timeStyle:"short"})} · volta {new Date(previsaoViagem.retorno_previsto).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",timeStyle:"short"})}</span></div>
          {custoSeparadoCentavos != null && <p className="text-xs text-on-surface-variant">Referência com viagens de ida separadas: R$ {(custoSeparadoCentavos / 100).toFixed(2).replace(".", ",")} · {Math.round(previsaoViagem.custo_estimado * 100) < custoSeparadoCentavos ? "viagem conjunta mais barata" : Math.round(previsaoViagem.custo_estimado * 100) > custoSeparadoCentavos ? "viagens separadas mais baratas" : "mesmo custo estimado"}. A busca das equipes ainda precisa ser planejada.</p>}
          <ol className="grid gap-1">{previsaoViagem.paradas.map((parada,indice) => <li key={parada.eventoId}>{indice+1}. {parada.nome} · chegada {new Date(parada.chegadaPrevista).toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"})}</li>)}</ol>
          <div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs">Motorista<select className={campo} value={motoristaViagem} disabled={Boolean(carroEscolhido?.proprietario_id)} onChange={(ev) => setMotoristaViagem(ev.target.value)}><option value="">Selecione</option>{dados.pessoas.map((pessoa) => <option key={pessoa.id} value={pessoa.id} disabled={!motoristaDisponivel(dados, pessoa.id, previsaoViagem.saida_prevista, previsaoViagem.retorno_previsto, Boolean(carroEscolhido?.proprietario_id))}>{pessoa.nome}</option>)}</select></label><label className="grid gap-1 text-xs">Observações para a busca (opcional)<input className={campo} maxLength={500} value={justificativaViagem} onChange={(ev) => setJustificativaViagem(ev.target.value)} placeholder="Instruções especiais para o recolhimento" /></label></div>
          {motoristaViagem && !motoristaViagemPronto && <p className="text-sm text-on-surface-variant">O motorista precisa declarar disponibilidade e não pode ter outra viagem nesse horário.</p>}
          <button type="button" disabled={Boolean(ocupado) || !carroViagemDisponivel || !motoristaViagemPronto} onClick={() => void acao("viagem",{ eventos: eventosViagem, veiculo_id: carroViagem, motorista_id: motoristaViagem, justificativa: justificativaViagem })} className="rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-50">Aprovar viagem com {previsaoViagem.paradas.length} paradas</button></div>}
      </section>}
      {dados.eventos.length === 0 ? <p className="rounded-xl bg-surface-container p-5 text-sm text-on-surface-variant">Nenhum evento confirmado para este dia.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dados.eventos.map((evento) => {
        const requisito = dados.requisitos.find((item) => item.evento_id === evento.id);
        const rota = rotaAtual(dados, evento.id);
        const dupla = dados.duplos.find((item) => item.primeiro_evento_id === evento.id || item.segundo_evento_id === evento.id);
        const trecho = dupla ? trechoAtual(dados, dupla) : undefined;
        const paradaDaViagem = dados.paradas.find((parada) => parada.evento_id === evento.id);
        const planos = dados.planos.filter((item) => item.evento_id === evento.id || item.id === paradaDaViagem?.plano_id);
        const buscaAprovada = planos.some((item) => item.modo === "buscar" && item.situacao === "aprovado");
        const levarAprovado = planos.some((item) => item.modo === "levar" && item.situacao === "aprovado");
        const proposta = propostas.get(evento.id);
        const opcoes = proposta ? [proposta, ...(planejamento.alternativas[evento.id] ?? [])] : [];
        const chave = (item: PropostaLogistica) => `${item.veiculoId}:${item.modo}`;
        const propostaSelecionada = opcoes.find((item) => chave(item) === opcaoPorEvento[evento.id]) ?? proposta;
        return <article key={evento.id} className="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/30">
          <div><h3 className="font-semibold">{evento.horario?.slice(0, 5)} · {evento.cliente_nome || "Evento"}</h3><p className="text-xs text-on-surface-variant">{(evento.inteiros ?? 0) + (evento.meios ?? 0)} convidados{dupla ? ` · Dupla ${dupla.codigo} · ${dupla.primeiro_evento_id === evento.id ? "1º evento" : "2º evento"}` : ""}</p></div>
          <div className="space-y-1 text-sm"><p>{requisito ? `${requisito.pessoas_transportar} pessoas · forno ${requisito.forno_necessario} · bebida ${requisito.bebida_necessaria}` : "Carga ainda não informada"}</p><p>{rota ? `${rota.distancia_km} km · ${rota.duracao_minutos} min desde o QG` : "Rota rodoviária ainda não calculada"}</p><p>{planos.length ? planos.map((plano) => `${plano.modo === "buscar" ? "Busca" : "Ida"} · ${dados.veiculos.find((v) => v.id === plano.veiculo_id)?.modelo ?? "Carro"}: ${plano.situacao}${paradaDaViagem?.plano_id === plano.id ? ` · parada ${paradaDaViagem.ordem}` : ""}`).join(" · ") : "Nenhum carro planejado"}</p>{paradaDaViagem && <p className="text-xs text-on-surface-variant">Chegada prevista {new Date(paradaDaViagem.chegada_prevista).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })} · custo compartilhado entre as paradas</p>}</div>
          <RequisitoForm evento={evento} atual={requisito} bloqueado={Boolean(ocupado)} salvar={(valores) => acao("requisito", { evento: evento.id, dados: valores })} />
          {planos.filter((plano) => plano.situacao === "aprovado").map((plano) => <div key={plano.id} className="rounded-xl bg-surface-container p-3 text-xs">
            <p>{plano.modo === "buscar" ? "Busca" : "Ida"} aprovada para {dados.veiculos.find((carro) => carro.id === plano.veiculo_id)?.modelo ?? "o carro"}. Saída {new Date(plano.saida_prevista).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}{plano.custo_estimado != null ? ` · custo estimado R$ ${Number(plano.custo_estimado).toFixed(2).replace(".", ",")}` : ""}. O cancelamento preserva o registro e libera o carro para novo planejamento.</p>
            {plano.modo === "levar" && !buscaAprovada && <div className="mt-2 rounded-lg bg-primary/10 p-2"><strong>Busca da equipe a organizar</strong><p className="mt-1">{plano.ajuda_solicitada || "Defina quem buscará a equipe e o material após o evento."}</p><p className="mt-1 text-on-surface-variant">Esta aprovação reserva somente a viagem de ida e o retorno do carro ao QG. A busca, seu motorista, horário e custo precisam de planejamento separado.</p></div>}
            {new Date(plano.saida_prevista).getTime() <= Date.now() ? <p className="mt-2 text-on-surface-variant">A saída prevista já passou. Confira a viagem com a operação.</p> : cancelarPlanoId === plano.id ? <div className="mt-2 space-y-2">
              <label className="grid gap-1">Motivo do cancelamento<textarea value={motivoCancelamento} onChange={(ev) => setMotivoCancelamento(ev.target.value)} maxLength={500} className={campo} rows={2} placeholder="Explique por que o carro precisa ser replanejado" /></label>
              <div className="flex flex-wrap gap-2"><button disabled={Boolean(ocupado) || motivoCancelamento.trim().length < 10} onClick={() => { setCancelarPlanoId(null); void acao("cancelar_plano", { plano: plano.id, motivo: motivoCancelamento.trim() }); }} className="rounded-lg bg-primary px-3 py-2 text-on-primary disabled:opacity-50">Confirmar cancelamento</button><button onClick={() => setCancelarPlanoId(null)} className="rounded-lg px-3 py-2">Manter plano</button></div>
            </div> : <button disabled={Boolean(ocupado)} onClick={() => { setMotivoCancelamento(""); setCancelarPlanoId(plano.id); }} className="mt-2 rounded-lg bg-surface-container-high px-3 py-2 disabled:opacity-50">Cancelar plano aprovado</button>}
          </div>)}
          {levarAprovado && !buscaAprovada && requisito && rota && dados.capacidade && dados.configuracao && <BuscaEquipeForm key={evento.id} evento={evento} requisito={requisito} rota={rota} dados={dados} ocupado={Boolean(ocupado)} salvar={(veiculo, motorista, saida) => void acao("busca", { evento: evento.id, veiculo_id: veiculo, motorista_id: motorista, saida_prevista: saida })} />}
          <button disabled={Boolean(ocupado)} onClick={() => void acao("rota", { evento: evento.id })} className="rounded-xl bg-surface-container px-3 py-2 text-xs disabled:opacity-50">{ocupado === "rota" ? "Calculando…" : rota ? "Atualizar rota" : "Calcular rota"}</button>
          {dupla?.primeiro_evento_id === evento.id && <div className="space-y-2 text-xs">
            <p>{trecho ? `${trecho.distancia_km} km · ${trecho.duracao_minutos} min até o segundo evento` : "Trecho entre os eventos ainda não calculado"}</p>
            <div className="flex flex-wrap gap-2">
              <button disabled={Boolean(ocupado)} onClick={() => void acao("rota_dupla", { duplo: dupla.id })} className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50">{ocupado === "rota_dupla" ? "Calculando…" : "Calcular trecho da dupla"}</button>
              <button disabled={Boolean(ocupado) || dados.planos.some((plano) => plano.evento_duplo_id === dupla.id && plano.situacao === "aprovado")} onClick={() => setConfirmarDesvinculo(dupla.id)} className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50">Desfazer dupla</button>
            </div>
            {dados.planos.some((plano) => plano.evento_duplo_id === dupla.id && plano.situacao === "aprovado") && <p className="text-on-surface-variant">Revise o plano de carro aprovado antes de desfazer a dupla.</p>}
            {confirmarDesvinculo === dupla.id && <div className="rounded-xl bg-surface-container p-3"><p>As propostas de carro desta dupla serão removidas. Os eventos continuarão separados na agenda.</p><div className="mt-2 flex gap-2"><button disabled={Boolean(ocupado)} onClick={() => { setConfirmarDesvinculo(null); void acao("desvincular", { duplo: dupla.id }); }} className="rounded-lg bg-primary px-3 py-2 text-on-primary disabled:opacity-50">Confirmar desvínculo</button><button onClick={() => setConfirmarDesvinculo(null)} className="rounded-lg px-3 py-2">Manter dupla</button></div></div>}
          </div>}
          {dupla?.segundo_evento_id === evento.id && <p className="text-xs text-on-surface-variant">O carro desta dupla é planejado no primeiro evento.</p>}
          {opcoes.length > 1 && <label className="grid gap-1 text-xs">Comparar carros e modos de viagem<select className={campo} value={propostaSelecionada ? chave(propostaSelecionada) : ""} onChange={(ev) => setOpcaoPorEvento((atual) => ({ ...atual, [evento.id]: ev.target.value }))}>{opcoes.map((item) => <option key={chave(item)} value={chave(item)}>{dados.veiculos.find((carro) => carro.id === item.veiculoId)?.modelo ?? "Carro"} · {item.modo === "levar" ? "levar" : "com a equipe"} · R$ {(item.custoCentavos / 100).toFixed(2).replace(".", ",")}</option>)}</select></label>}
          {propostaSelecionada && <Proposta key={`${chave(propostaSelecionada)}:${propostaSelecionada.saidaPrevista}`} proposta={propostaSelecionada} dados={dados} ocupado={Boolean(ocupado)} salvar={(valores) => acao("plano", { dados: valores })} />}
        </article>;
      })}</div>}
      {dados.eventos.length > 1 && <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-container p-3 text-sm"><div className="mr-auto"><strong>Ligar dois eventos consecutivos</strong><p className="text-xs text-on-surface-variant">Exige a mesma equipe e líderes confirmados nos dois eventos.</p></div><select className={campo} value={primeiro} onChange={(evento) => setPrimeiro(evento.target.value)}><option value="">Primeiro evento</option>{dados.eventos.map((evento) => <option key={evento.id} value={evento.id}>{evento.horario?.slice(0, 5)} · {evento.cliente_nome}</option>)}</select><select className={campo} value={segundo} onChange={(evento) => setSegundo(evento.target.value)}><option value="">Segundo evento</option>{dados.eventos.filter((evento) => evento.id !== primeiro).map((evento) => <option key={evento.id} value={evento.id}>{evento.horario?.slice(0, 5)} · {evento.cliente_nome}</option>)}</select><button disabled={!primeiro || !segundo || Boolean(ocupado)} onClick={() => void acao("vincular", { primeiro, segundo })} className="rounded-xl bg-primary px-3 py-2 text-on-primary disabled:opacity-50">Vincular</button></div>}
    </>}
  </section>;
}

function BuscaEquipeForm({ evento, requisito, rota, dados, ocupado, salvar }: { evento: Evento; requisito: Requisito; rota: Rota; dados: Dados; ocupado: boolean; salvar: (veiculo: string, motorista: string, saida: string) => void }) {
  const inicio = Date.parse(`${evento.data_evento}T${evento.horario.slice(0, 5)}:00-03:00`);
  const fim = inicio + (dados.capacidade?.duracao_minutos ?? 240) * 60_000;
  const duracaoIda = Math.ceil(rota.duracao_minutos * Math.max(100, dados.configuracao?.fator_pico_percentual ?? 100) / 100);
  // O carro deve chegar pouco antes do fim. datetime-local espera o horario de Sao Paulo,
  // enquanto toISOString() mostraria UTC e deslocaria a sugestao em tres horas.
  const sugestao = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(fim - duracaoIda * 60_000 - 15 * 60_000)).replace(" ", "T");
  const [saidaLocal, setSaidaLocal] = useState(sugestao);
  const [veiculoId, setVeiculoId] = useState("");
  const carro = dados.veiculos.find((item) => item.id === veiculoId);
  const [motoristaId, setMotoristaId] = useState("");
  const saidaMs = Date.parse(`${saidaLocal}:00-03:00`);
  const chegadaMs = saidaMs + duracaoIda * 60_000;
  const retornoMs = Math.max(chegadaMs, fim) + duracaoIda * 60_000;
  const horarioValido = Number.isFinite(saidaMs) && saidaMs > Date.now() && saidaMs >= inicio && saidaMs <= fim + 2 * 60 * 60_000 && chegadaMs >= fim - 60 * 60_000 && chegadaMs <= fim + 2 * 60 * 60_000;
  const saidaIso = horarioValido ? new Date(saidaMs).toISOString() : "";
  const retornoIso = horarioValido ? new Date(retornoMs).toISOString() : "";
  const carros = dados.veiculos.filter((item) => item.lugares >= requisito.pessoas_transportar && ordemForno.indexOf(item.forno_maximo) >= ordemForno.indexOf(requisito.forno_necessario as TipoForno) && ordemBebida.indexOf(item.bebida_maxima) >= ordemBebida.indexOf(requisito.bebida_necessaria as TipoBebida));
  const motoristaPronto = Boolean(carro && horarioValido && motoristaDisponivel(dados, motoristaId, saidaIso, retornoIso, Boolean(carro.proprietario_id)));
  const carroLivre = Boolean(carro && horarioValido && !dados.planos.some((plano) => plano.situacao === "aprovado" && plano.veiculo_id === carro.id && saidaMs < Date.parse(plano.retorno_previsto) && retornoMs > Date.parse(plano.saida_prevista)));
  const carroPlanejavel = !carro?.proprietario_id || veiculosDoDia(dados, evento.data_evento).some((item) => item.id === carro.id && item.disponivel);
  const km = Number(rota.distancia_km) * 2;
  const material = requisito.forno_necessario !== "nenhum" || requisito.bebida_necessaria !== "nenhuma";
  const custoCentavos = carro?.proprietario_id
    ? Math.max(dados.regra?.minimo_centavos ?? 0, Math.round(km * (material ? dados.regra?.material_centavos_km ?? 0 : dados.regra?.pessoas_centavos_km ?? 0))) + (material ? dados.regra?.adicional_material_centavos ?? 0 : 0)
    : Math.round(km * (dados.configuracao?.custo_frota_centavos_km ?? 0));
  return <form onSubmit={(ev) => { ev.preventDefault(); if (carro && horarioValido && motoristaPronto && carroLivre && carroPlanejavel) salvar(carro.id, motoristaId, saidaIso); }} className="space-y-2 rounded-xl bg-primary/10 p-3 text-xs">
    <strong>Planejar a busca da equipe</strong>
    <p className="text-on-surface-variant">Registre outra viagem do QG ao evento e de volta com a equipe. A busca ocupa carro e motorista e soma um custo próprio.</p>
    <div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1">Saída do QG<input className={campo} type="datetime-local" value={saidaLocal} onChange={(ev) => setSaidaLocal(ev.target.value)} /></label><label className="grid gap-1">Carro<select className={campo} value={veiculoId} onChange={(ev) => { const escolhido = dados.veiculos.find((item) => item.id === ev.target.value); setVeiculoId(ev.target.value); setMotoristaId(escolhido?.proprietario_id ?? ""); }}><option value="">Selecione</option>{carros.map((item) => <option key={item.id} value={item.id}>{item.modelo} · {item.placa}</option>)}</select></label></div>
    <label className="grid gap-1">Motorista<select className={campo} value={motoristaId} disabled={Boolean(carro?.proprietario_id)} onChange={(ev) => setMotoristaId(ev.target.value)}><option value="">Selecione</option>{dados.pessoas.map((item) => <option key={item.id} value={item.id} disabled={!horarioValido || !motoristaDisponivel(dados, item.id, saidaIso, retornoIso, Boolean(carro?.proprietario_id))}>{item.nome}</option>)}</select></label>
    {horarioValido ? <p>Chegada estimada {new Date(chegadaMs).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })} · retorno ao QG {new Date(retornoMs).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })} · {km.toFixed(2).replace(".", ",")} km{carro ? ` · custo estimado R$ ${(custoCentavos / 100).toFixed(2).replace(".", ",")}` : ""}</p> : <p className="text-on-surface-variant">A chegada precisa ficar entre uma hora antes e duas horas após o fim previsto do evento.</p>}
    {carro && (!carroLivre || !carroPlanejavel || (motoristaId && !motoristaPronto)) && <p className="text-on-surface-variant">Confira disponibilidade do carro e do motorista nesse horário.</p>}
    <button disabled={ocupado || !carro || !horarioValido || !carroLivre || !carroPlanejavel || !motoristaPronto} className="rounded-xl bg-primary px-3 py-2 font-semibold text-on-primary disabled:opacity-50">Aprovar busca</button>
  </form>;
}

function RequisitoForm({ evento, atual, bloqueado, salvar }: { evento: Evento; atual?: Requisito; bloqueado: boolean; salvar: (dados: Record<string, unknown>) => void }) {
  const [pessoas, setPessoas] = useState(atual?.pessoas_transportar ?? 1);
  const [forno, setForno] = useState(atual?.forno_necessario ?? "medio");
  const [bebida, setBebida] = useState(atual?.bebida_necessaria ?? "nenhuma");
  const [antes, setAntes] = useState(atual?.bebida_comeca_antes ?? false);
  useEffect(() => { setPessoas(atual?.pessoas_transportar ?? 1); setForno(atual?.forno_necessario ?? "medio"); setBebida(atual?.bebida_necessaria ?? "nenhuma"); setAntes(atual?.bebida_comeca_antes ?? false); }, [evento.id, atual?.pessoas_transportar, atual?.forno_necessario, atual?.bebida_necessaria, atual?.bebida_comeca_antes]);
  return <form onSubmit={(ev) => { ev.preventDefault(); salvar({ pessoas_transportar: pessoas, forno_necessario: forno, bebida_necessaria: bebida, bebida_comeca_antes: antes }); }} className="grid grid-cols-2 gap-2 text-xs"><label className="grid gap-1">Pessoas no carro<input className={campo} type="number" min={1} max={20} value={pessoas} onChange={(ev) => setPessoas(Number(ev.target.value))} /></label><label className="grid gap-1">Forno<select className={campo} value={forno} onChange={(ev) => setForno(ev.target.value)}><option value="nenhum">Nenhum</option><option value="mini">Mini</option><option value="mini_medio">Mini médio</option><option value="medio">Médio</option></select></label><label className="grid gap-1">Bebida<select className={campo} value={bebida} onChange={(ev) => setBebida(ev.target.value)}><option value="nenhuma">Nenhuma</option><option value="isopor_pequeno">Isopor pequeno</option><option value="isopor_grande">Isopor grande</option></select></label><label className="flex items-center gap-2"><input type="checkbox" checked={antes} onChange={(ev) => setAntes(ev.target.checked)} />Bebida começa antes</label><button disabled={bloqueado || pessoas < 1 || pessoas > 20} className="col-span-2 rounded-xl bg-primary px-3 py-2 text-on-primary disabled:opacity-50">Salvar carga</button></form>;
}

function Proposta({ proposta, dados, ocupado, salvar }: { proposta: PropostaLogistica; dados: Dados; ocupado: boolean; salvar: (valores: Record<string, unknown>) => void }) {
  const carro = dados.veiculos.find((item) => item.id === proposta.veiculoId);
  const [motorista, setMotorista] = useState(carro?.proprietario_id ?? "");
  const [justificativa, setJustificativa] = useState("");
  const motoristaPronto = motoristaDisponivel(dados, motorista, proposta.saidaPrevista, proposta.retornoPrevisto, Boolean(carro?.proprietario_id));
  useEffect(() => setMotorista(carro?.proprietario_id ?? ""), [carro?.proprietario_id]);
  return <div className="space-y-2 rounded-xl bg-primary/10 p-3 text-xs">
    <strong>Sugestão: {carro?.modelo ?? "Carro"} · {proposta.modo === "levar" ? "levar equipe" : "carro com a equipe"}</strong>
    <p>Saída {new Date(proposta.saidaPrevista).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })} · retorno previsto {new Date(proposta.retornoPrevisto).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</p>
    <p>{proposta.distanciaTotalKm} km · custo estimado R$ {(proposta.custoCentavos / 100).toFixed(2).replace(".", ",")}</p>
    {proposta.modo === "levar" && <p className="text-on-surface-variant">Custo e horário cobrem apenas a ida com a equipe e a volta do carro ao QG. A busca depois do evento ainda precisa ser planejada.</p>}
    {proposta.alertas.map((alerta) => <p key={alerta} className="text-on-surface-variant">{alerta}</p>)}
    <p className="text-on-surface-variant">Estimativa sem trânsito ao vivo. Confira os horários e a equipe antes de aprovar.</p>
    <label className="grid gap-1">Motorista<select className={campo} value={motorista} disabled={Boolean(carro?.proprietario_id)} onChange={(ev) => setMotorista(ev.target.value)}><option value="">Selecione</option>{dados.pessoas.map((pessoa) => <option key={pessoa.id} value={pessoa.id} disabled={!motoristaDisponivel(dados, pessoa.id, proposta.saidaPrevista, proposta.retornoPrevisto, Boolean(carro?.proprietario_id))}>{pessoa.nome}</option>)}</select></label>
    {motorista && !motoristaPronto && <p className="text-on-surface-variant">O motorista precisa declarar disponibilidade e não pode ter outra viagem nesse horário.</p>}
    {(proposta.modo === "levar" || proposta.segundoEventoId) && <label className="grid gap-1">{proposta.segundoEventoId ? "Confira desmontagem e trajeto entre os eventos" : "Observações para a busca (opcional)"}<input className={campo} value={justificativa} onChange={(ev) => setJustificativa(ev.target.value)} minLength={proposta.segundoEventoId ? 10 : undefined} maxLength={500} /></label>}
    <button disabled={ocupado || !motoristaPronto || (!!proposta.segundoEventoId && justificativa.trim().length < 10)} onClick={() => salvar({ evento_id: proposta.eventoId, veiculo_id: proposta.veiculoId, motorista_id: motorista, modo: proposta.modo, saida_prevista: proposta.saidaPrevista, retorno_previsto: proposta.retornoPrevisto, distancia_km: proposta.distanciaTotalKm, custo_estimado: proposta.custoCentavos / 100, justificativa, aprovar: true })} className="rounded-xl bg-primary px-3 py-2 font-semibold text-on-primary disabled:opacity-50">Aprovar saída</button>
  </div>;
}
