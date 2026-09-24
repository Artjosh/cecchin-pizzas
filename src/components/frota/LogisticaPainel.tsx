"use client";

import { useEffect, useState } from "react";
import { planejarLogistica, type PropostaLogistica, type TipoBebida, type TipoForno } from "@/src/lib/logistica/planejador";

type Evento = { id: string; cliente_nome: string; data_evento: string; horario: string; inteiros: number; meios: number };
type Requisito = { evento_id: string; forno_necessario: string; bebida_necessaria: string; bebida_comeca_antes: boolean; pessoas_transportar: number };
type Rota = { evento_id: string; distancia_km: number; duracao_minutos: number; medido_em: string; latitude: number; longitude: number };
type Duplo = { id: string; primeiro_evento_id: string; segundo_evento_id: string };
type TrechoDuplo = { evento_duplo_id: string; primeira_latitude: number; primeira_longitude: number; segunda_latitude: number; segunda_longitude: number; distancia_km: number; duracao_minutos: number; medido_em: string };
type Plano = { evento_id: string; situacao: string; veiculo_id: string; modo: string };
type Veiculo = { id: string; modelo: string; placa: string; forno_maximo: TipoForno; bebida_maxima: TipoBebida; lugares: number; limite_eventos_levar: number; proprietario_id: string | null };
type Dados = { eventos: Evento[]; requisitos: Requisito[]; rotas: Rota[]; locais: Array<{ evento_id: string; latitude: number; longitude: number }>; duplos: Duplo[]; trechosDuplos: TrechoDuplo[]; planos: Plano[]; veiculos: Veiculo[]; pessoas: Array<{ id: string; nome: string }>; disponibilidades: Array<{ veiculo_id: string; dias: boolean[] }>; configuracao: Record<string, number> | null; regra: Record<string, number> | null };
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

function propostasDoDia(dados: Dados, selecionados: Set<string> | null) {
  if (!dados.configuracao || !dados.regra) return new Map<string, PropostaLogistica>();
  const eventos = dados.eventos.flatMap((evento) => {
    const requisito = dados.requisitos.find((item) => item.evento_id === evento.id);
    const rota = rotaAtual(dados, evento.id);
    const dupla = dados.duplos.find((item) => item.primeiro_evento_id === evento.id || item.segundo_evento_id === evento.id);
    if (!requisito || !rota || dupla?.segundo_evento_id === evento.id || dados.planos.some((plano) => plano.evento_id === evento.id && plano.situacao === "aprovado")) return [];
    const base = { id: evento.id, inicioMs: Date.parse(`${evento.data_evento}T${evento.horario}-03:00`), convidados: (evento.inteiros ?? 0) + (evento.meios ?? 0), forno: requisito.forno_necessario as TipoForno, bebida: requisito.bebida_necessaria as TipoBebida, bebidaAntes: requisito.bebida_comeca_antes, pessoas: requisito.pessoas_transportar, rotaMinutos: rota.duracao_minutos, rotaKm: rota.distancia_km };
    if (!dupla) return [base];
    const segundo = dados.eventos.find((item) => item.id === dupla.segundo_evento_id);
    const requisitoSegundo = dados.requisitos.find((item) => item.evento_id === dupla.segundo_evento_id);
    const rotaSegundo = rotaAtual(dados, dupla.segundo_evento_id);
    const trecho = trechoAtual(dados, dupla);
    if (!segundo || !requisitoSegundo || !rotaSegundo || !trecho) return [];
    return [{ ...base, forno: ordemForno[Math.max(ordemForno.indexOf(base.forno), ordemForno.indexOf(requisitoSegundo.forno_necessario as TipoForno))], bebida: ordemBebida[Math.max(ordemBebida.indexOf(base.bebida), ordemBebida.indexOf(requisitoSegundo.bebida_necessaria as TipoBebida))], pessoas: Math.max(base.pessoas, requisitoSegundo.pessoas_transportar), segundoEventoId: segundo.id, segundoInicioMs: Date.parse(`${segundo.data_evento}T${segundo.horario}-03:00`), segundoBebidaAntes: requisitoSegundo.bebida_comeca_antes, trechoSegundoMinutos: trecho.duracao_minutos, trechoSegundoKm: trecho.distancia_km, segundaRotaKm: rotaSegundo.distancia_km, segundaRotaMinutos: rotaSegundo.duracao_minutos }];
  });
  const indiceDia = (new Date(`${dados.eventos[0]?.data_evento ?? "2000-01-03"}T12:00:00Z`).getUTCDay() + 6) % 7;
  const veiculos = dados.veiculos.map((carro) => ({ id: carro.id, modelo: carro.modelo, placa: carro.placa, proprietarioId: carro.proprietario_id, forno: carro.forno_maximo, bebida: carro.bebida_maxima, lugares: carro.lugares, limiteLevar: carro.limite_eventos_levar, disponivel: (selecionados === null || selecionados.has(carro.id)) && !dados.planos.some((plano) => plano.veiculo_id === carro.id && plano.situacao === "aprovado") && (!carro.proprietario_id || dados.disponibilidades.find((item) => item.veiculo_id === carro.id)?.dias[indiceDia] === true) }));
  const c = dados.configuracao, r = dados.regra;
  const resultado = planejarLogistica(eventos, veiculos, { minutosCarregar: c.minutos_carregar, flexSaidaMinutos: c.flex_saida_minutos, montagemPadraoMinutos: c.montagem_padrao_minutos, montagemBebidaAntesMinutos: c.montagem_bebida_antes_minutos, fatorPicoPercentual: c.fator_pico_percentual, custoFrotaCentavosKm: c.custo_frota_centavos_km, materialCentavosKm: r.material_centavos_km, pessoasCentavosKm: r.pessoas_centavos_km, minimoCentavos: r.minimo_centavos, adicionalMaterialCentavos: r.adicional_material_centavos, duracaoEventoMinutos: 240 });
  return new Map(resultado.propostas.map((proposta) => [proposta.eventoId, proposta]));
}

export function LogisticaPainel() {
  const [dia, setDia] = useState(dataLocal);
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [primeiro, setPrimeiro] = useState("");
  const [segundo, setSegundo] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [selecionados, setSelecionados] = useState<Set<string> | null>(null);
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

  const propostas = dados ? propostasDoDia(dados, selecionados) : new Map<string, PropostaLogistica>();

  return <section className="space-y-4 rounded-2xl bg-surface-container-low p-4 sm:p-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-headline-sm text-headline-sm">Planejar saídas</h2><p className="text-sm text-on-surface-variant">Confira carga, trajeto e carro antes de aprovar a logística.</p></div><label className="grid gap-1 text-xs">Dia dos eventos<input className={campo} type="date" value={dia} onChange={(evento) => { setDia(evento.target.value); setSelecionados(null); }} /></label></div>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm text-on-error-container">{erro}</p>}
    {!dados && !erro && <p role="status" className="text-sm text-on-surface-variant">Carregando eventos e veículos…</p>}
    {dados && <>
      <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-surface-container px-3 py-1">{dados.eventos.length} eventos</span><span className="rounded-full bg-surface-container px-3 py-1">{dados.veiculos.length} carros ativos</span><span className="rounded-full bg-surface-container px-3 py-1">{dados.planos.filter((plano) => plano.situacao === "aprovado").length} planos aprovados</span></div>
      <div className="space-y-2 rounded-xl bg-surface-container p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><strong>Carros usados nas sugestões</strong><div className="flex gap-2"><button type="button" onClick={() => setSelecionados(null)} className="rounded-lg bg-surface-container-high px-2 py-1">Todos</button><button type="button" onClick={() => setSelecionados(new Set())} className="rounded-lg bg-surface-container-high px-2 py-1">Limpar</button></div></div><div className="flex flex-wrap gap-x-4 gap-y-2">{dados.veiculos.map((carro) => <label key={carro.id} className="flex items-center gap-1"><input type="checkbox" checked={selecionados === null || selecionados.has(carro.id)} onChange={(ev) => { const proximo = new Set(selecionados ?? dados.veiculos.map((item) => item.id)); if (ev.target.checked) proximo.add(carro.id); else proximo.delete(carro.id); setSelecionados(proximo); }} /><span>{carro.modelo} · {carro.placa} · {carro.proprietario_id ? "particular" : "empresa"}</span></label>)}</div></div>
      {dados.eventos.length === 0 ? <p className="rounded-xl bg-surface-container p-5 text-sm text-on-surface-variant">Nenhum evento confirmado para este dia.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dados.eventos.map((evento) => {
        const requisito = dados.requisitos.find((item) => item.evento_id === evento.id);
        const rota = rotaAtual(dados, evento.id);
        const dupla = dados.duplos.find((item) => item.primeiro_evento_id === evento.id || item.segundo_evento_id === evento.id);
        const trecho = dupla ? trechoAtual(dados, dupla) : undefined;
        const planos = dados.planos.filter((item) => item.evento_id === evento.id);
        const proposta = propostas.get(evento.id);
        return <article key={evento.id} className="space-y-3 rounded-2xl bg-surface-container-lowest p-4 ring-1 ring-outline-variant/30">
          <div><h3 className="font-semibold">{evento.horario?.slice(0, 5)} · {evento.cliente_nome || "Evento"}</h3><p className="text-xs text-on-surface-variant">{(evento.inteiros ?? 0) + (evento.meios ?? 0)} convidados{dupla ? " · Evento duplo" : ""}</p></div>
          <div className="space-y-1 text-sm"><p>{requisito ? `${requisito.pessoas_transportar} pessoas · forno ${requisito.forno_necessario} · bebida ${requisito.bebida_necessaria}` : "Carga ainda não informada"}</p><p>{rota ? `${rota.distancia_km} km · ${rota.duracao_minutos} min desde o QG` : "Rota rodoviária ainda não calculada"}</p><p>{planos.length ? planos.map((plano) => `${dados.veiculos.find((v) => v.id === plano.veiculo_id)?.modelo ?? "Carro"}: ${plano.situacao}`).join(" · ") : "Nenhum carro planejado"}</p></div>
          <RequisitoForm evento={evento} atual={requisito} bloqueado={Boolean(ocupado)} salvar={(valores) => acao("requisito", { evento: evento.id, dados: valores })} />
          <button disabled={Boolean(ocupado)} onClick={() => void acao("rota", { evento: evento.id })} className="rounded-xl bg-surface-container px-3 py-2 text-xs disabled:opacity-50">{ocupado === "rota" ? "Calculando…" : rota ? "Atualizar rota" : "Calcular rota"}</button>
          {dupla?.primeiro_evento_id === evento.id && <div className="space-y-1 text-xs"><p>{trecho ? `${trecho.distancia_km} km · ${trecho.duracao_minutos} min até o segundo evento` : "Trecho entre os eventos ainda não calculado"}</p><button disabled={Boolean(ocupado)} onClick={() => void acao("rota_dupla", { duplo: dupla.id })} className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50">{ocupado === "rota_dupla" ? "Calculando…" : "Calcular trecho da dupla"}</button></div>}
          {dupla?.segundo_evento_id === evento.id && <p className="text-xs text-on-surface-variant">O carro desta dupla é planejado no primeiro evento.</p>}
          {proposta && <Proposta proposta={proposta} dados={dados} ocupado={Boolean(ocupado)} salvar={(valores) => acao("plano", { dados: valores })} />}
        </article>;
      })}</div>}
      {dados.eventos.length > 1 && <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-container p-3 text-sm"><div className="mr-auto"><strong>Ligar dois eventos consecutivos</strong><p className="text-xs text-on-surface-variant">Exige a mesma equipe e líderes confirmados nos dois eventos.</p></div><select className={campo} value={primeiro} onChange={(evento) => setPrimeiro(evento.target.value)}><option value="">Primeiro evento</option>{dados.eventos.map((evento) => <option key={evento.id} value={evento.id}>{evento.horario?.slice(0, 5)} · {evento.cliente_nome}</option>)}</select><select className={campo} value={segundo} onChange={(evento) => setSegundo(evento.target.value)}><option value="">Segundo evento</option>{dados.eventos.filter((evento) => evento.id !== primeiro).map((evento) => <option key={evento.id} value={evento.id}>{evento.horario?.slice(0, 5)} · {evento.cliente_nome}</option>)}</select><button disabled={!primeiro || !segundo || Boolean(ocupado)} onClick={() => void acao("vincular", { primeiro, segundo })} className="rounded-xl bg-primary px-3 py-2 text-on-primary disabled:opacity-50">Vincular</button></div>}
    </>}
  </section>;
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
  useEffect(() => setMotorista(carro?.proprietario_id ?? ""), [carro?.proprietario_id]);
  return <div className="space-y-2 rounded-xl bg-primary/10 p-3 text-xs">
    <strong>Sugestão: {carro?.modelo ?? "Carro"} · {proposta.modo === "levar" ? "levar equipe" : "carro com a equipe"}</strong>
    <p>Saída {new Date(proposta.saidaPrevista).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })} · retorno previsto {new Date(proposta.retornoPrevisto).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</p>
    <p>{proposta.distanciaTotalKm} km · custo estimado R$ {(proposta.custoCentavos / 100).toFixed(2).replace(".", ",")}</p>
    {proposta.alertas.map((alerta) => <p key={alerta} className="text-on-surface-variant">{alerta}</p>)}
    <p className="text-on-surface-variant">Estimativa sem trânsito ao vivo. Confira os horários e a equipe antes de aprovar.</p>
    <label className="grid gap-1">Motorista<select className={campo} value={motorista} disabled={Boolean(carro?.proprietario_id)} onChange={(ev) => setMotorista(ev.target.value)}><option value="">Selecione</option>{dados.pessoas.map((pessoa) => <option key={pessoa.id} value={pessoa.id}>{pessoa.nome}</option>)}</select></label>
    {(proposta.modo === "levar" || proposta.segundoEventoId) && <label className="grid gap-1">{proposta.segundoEventoId ? "Confira desmontagem e trajeto entre os eventos" : "Como a equipe será buscada?"}<input className={campo} value={justificativa} onChange={(ev) => setJustificativa(ev.target.value)} minLength={10} maxLength={500} /></label>}
    <button disabled={ocupado || !motorista || ((proposta.modo === "levar" || !!proposta.segundoEventoId) && justificativa.trim().length < 10)} onClick={() => salvar({ evento_id: proposta.eventoId, veiculo_id: proposta.veiculoId, motorista_id: motorista, modo: proposta.modo, saida_prevista: proposta.saidaPrevista, retorno_previsto: proposta.retornoPrevisto, distancia_km: proposta.distanciaTotalKm, custo_estimado: proposta.custoCentavos / 100, justificativa, aprovar: true })} className="rounded-xl bg-primary px-3 py-2 font-semibold text-on-primary disabled:opacity-50">Aprovar saída</button>
  </div>;
}
