"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CarFront, Car, Truck, BusFront, Package, Pencil, Plus, Search } from "lucide-react";
import { janelasCarro, janelasPessoa, type DiaPessoa } from "../../lib/logistica/janelasDisponibilidade";

export type Veiculo = { id: string; placa: string; modelo: string; carroceria: string; forno_maximo: string; bebida_maxima: string; lugares: number; limite_eventos_levar: number; proprietario_id: string | null; ativo: boolean };
type Pessoa = { id: string; nome: string };
const entrada = "min-w-0 w-full rounded-lg bg-surface-container px-3 py-2 text-on-surface";
const fornos: Record<string, string> = { nenhum: "Sem forno", mini: "Mini", mini_medio: "Mini médio", medio: "Médio" };
const bebidas: Record<string, string> = { nenhuma: "Sem bebida", isopor_pequeno: "Isopor pequeno", isopor_grande: "Isopor grande" };

export function CadastroVeiculos({ veiculos, pessoas, modoProprio = false }: { veiculos: Veiculo[]; pessoas: Pessoa[]; modoProprio?: boolean }) {
  const router = useRouter();
  const [dia, setDia] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
  const [hora, setHora] = useState("12:00");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [agenda, setAgenda] = useState<{ planos: Array<{ evento_id: string; veiculo_id: string; situacao: string; saida_prevista: string; retorno_previsto: string }>; disponibilidades: Array<{ veiculo_id: string; semana: string; dias: boolean[] }>; disponibilidadesPessoas: Array<{ usuario_id: string; semana: string; dias: DiaPessoa[] }>; eventos: Array<{ id: string; horario: string; cliente_nome: string }>; requisitos: Array<{ evento_id: string; forno_necessario: string; bebida_necessaria: string; pessoas_transportar: number }> } | null>(null);
  const [falhaAgenda, setFalhaAgenda] = useState("");
  useEffect(() => {
    if (modoProprio) return;
    const controller = new AbortController();
    setAgenda(null); setFalhaAgenda("");
    void fetch(`/api/operacao/logistica?data=${encodeURIComponent(dia)}`, { cache: "no-store", signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error("Disponibilidade indisponível neste momento."); return r.json(); })
      .then(d => { if (!controller.signal.aborted) setAgenda(d); })
      .catch(() => { if (!controller.signal.aborted) setFalhaAgenda("Disponibilidade indisponível neste momento."); });
    return () => controller.abort();
  }, [dia, modoProprio]);
  const instante = Date.parse(`${dia}T${hora}:00-03:00`);
  const situacao = (v: Veiculo) => {
    if (!v.ativo) return "Inativo";
    if (!agenda) return "A conferir";
    if (agenda.planos.some(p => p.veiculo_id === v.id && p.situacao === "aprovado" && instante >= Date.parse(p.saida_prevista) && instante < Date.parse(p.retorno_previsto))) return "Alocado";
    if (v.proprietario_id) {
      const janelas = agenda.disponibilidades.filter(d => d.veiculo_id === v.id).flatMap(d => janelasCarro(d.semana, d.dias));
      const pessoa = agenda.disponibilidadesPessoas.filter(d => d.usuario_id === v.proprietario_id).flatMap(d => janelasPessoa(d.semana, d.dias));
      if (!janelas.some(j => instante >= j.inicioMs && instante < j.fimMs) || !pessoa.some(j => instante >= j.inicioMs && instante < j.fimMs)) return "Sem declaração";
    }
    return "Vago";
  };
  const sugestoes = (v: Veiculo) => {
    if (!agenda || situacao(v) !== "Vago") return [];
    const ordemForno = ["nenhum", "mini", "mini_medio", "medio"];
    const ordemBebida = ["nenhuma", "isopor_pequeno", "isopor_grande"];
    return agenda.eventos.filter(e => !agenda.planos.some(p => p.evento_id === e.id && p.situacao === "aprovado")).filter(e => {
      const r = agenda.requisitos.find(item => item.evento_id === e.id);
      return r && r.pessoas_transportar <= v.lugares && ordemForno.indexOf(r.forno_necessario) >= 0 && ordemForno.indexOf(r.forno_necessario) <= ordemForno.indexOf(v.forno_maximo) && ordemBebida.indexOf(r.bebida_necessaria) >= 0 && ordemBebida.indexOf(r.bebida_necessaria) <= ordemBebida.indexOf(v.bebida_maxima);
    });
  };
  const visiveis = veiculos.filter(v => `${v.modelo} ${v.placa} ${v.carroceria}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))).filter(v => filtro === "todos" || (filtro === "vagos" && situacao(v) === "Vago") || (filtro === "sugeridos" && sugestoes(v).length > 0) || (filtro === "fornos" && v.forno_maximo !== "nenhum") || (filtro === "particulares" && Boolean(v.proprietario_id)));
  const [aberto, setAberto] = useState(false); const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState("");
  const [editando, setEditando] = useState<string | null>(null); const [ativo, setAtivo] = useState(true);
  const [modelo, setModelo] = useState(""); const [placa, setPlaca] = useState(""); const [carroceria, setCarroceria] = useState("utilitario");
  const [forno, setForno] = useState("nenhum"); const [bebida, setBebida] = useState("nenhuma"); const [lugares, setLugares] = useState(4);
  const [limite, setLimite] = useState(1); const [proprietario, setProprietario] = useState("");
  function novo() {
    setEditando(null); setModelo(""); setPlaca(""); setCarroceria("utilitario");
    setForno("nenhum"); setBebida("nenhuma"); setLugares(4); setLimite(1);
    setProprietario(""); setAtivo(true); setErro(""); setAberto(true);
  }
  function editar(veiculo: Veiculo) {
    setEditando(veiculo.id); setModelo(veiculo.modelo); setPlaca(veiculo.placa);
    setCarroceria(veiculo.carroceria); setForno(veiculo.forno_maximo);
    setBebida(veiculo.bebida_maxima); setLugares(veiculo.lugares);
    setLimite(veiculo.limite_eventos_levar); setProprietario(veiculo.proprietario_id ?? "");
    setAtivo(veiculo.ativo); setErro(""); setAberto(true);
  }
  async function salvar(evento: FormEvent) {
    evento.preventDefault(); setErro("");
    if (!/^[A-Z0-9]{7}$/.test(placa)) { setErro("A placa precisa ter exatamente 7 letras ou numeros (ex.: ABC1D23)."); return; }
    setOcupado(true);
    try {
      const resposta = await fetch("/api/operacao/veiculos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editando, modelo, placa, carroceria, forno_maximo: forno, bebida_maxima: bebida, lugares, limite_eventos_levar: limite, proprietario_id: proprietario || null, ativo }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.mensagem ?? "Não foi possível salvar");
      setAberto(false); setEditando(null); window.dispatchEvent(new Event("veiculo-salvo")); router.refresh();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar"); }
    finally { setOcupado(false); }
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-headline-sm text-headline-sm">{modoProprio ? "Meu carro" : "Veículos cadastrados"}</h2><p className="text-sm text-on-surface-variant">Capacidade física; disponibilidade e escala são decididas por data.</p></div><button type="button" onClick={novo} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-on-primary"><Plus size={17} />Cadastrar veículo</button></div>
    {aberto && <form onSubmit={salvar} className="grid gap-3 rounded-2xl bg-surface-container-low p-4 sm:grid-cols-2 xl:grid-cols-4">
      <h3 className="font-semibold sm:col-span-2 xl:col-span-4">{editando ? "Editar veículo" : "Novo veículo"}</h3>
      <label className="text-sm">Modelo<input className={entrada} value={modelo} onChange={e => setModelo(e.target.value)} required maxLength={100} /></label>
      <label className="text-sm">Placa<input className={entrada} value={placa} onChange={e => setPlaca(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} required maxLength={10} title="Informe 7 letras ou numeros, como ABC1D23" /></label>
      <label className="text-sm">Carroceria<select className={entrada} value={carroceria} onChange={e => setCarroceria(e.target.value)}>{["sedan", "hatch", "utilitario", "van", "outro"].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      {!modoProprio && <label className="text-sm">Proprietário<select className={entrada} value={proprietario} onChange={e => setProprietario(e.target.value)}><option value="">Frota da empresa</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>}
      <label className="text-sm">Maior forno que comporta<select className={entrada} value={forno} onChange={e => setForno(e.target.value)}>{Object.entries(fornos).map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <label className="text-sm">Maior carga de bebida<select className={entrada} value={bebida} onChange={e => setBebida(e.target.value)}>{Object.entries(bebidas).map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <label className="text-sm">Pessoas<input className={entrada} type="number" min={1} max={20} value={lugares} onChange={e => setLugares(Number(e.target.value))} /></label>
      <label className="text-sm">Eventos por saída como levar<input className={entrada} type="number" min={1} max={20} value={limite} onChange={e => setLimite(Number(e.target.value))} /></label>
      {editando && <label className="flex items-center gap-2 text-sm sm:col-span-2 xl:col-span-4"><input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} />Veículo ativo para o planejamento</label>}
      {erro && <p role="alert" className="text-error sm:col-span-2 xl:col-span-4">{erro}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2 xl:col-span-4"><button type="button" onClick={() => setAberto(false)} className="rounded-xl px-4 py-2">Cancelar</button><button disabled={ocupado} className="rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{ocupado ? "Salvando…" : "Salvar veículo"}</button></div>
    </form>}
    {!modoProprio && <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-container-low p-2 text-sm"><label className="grid gap-1 text-xs">Dia<input type="date" value={dia} onChange={e=>setDia(e.target.value)} className={entrada}/></label><label className="grid gap-1 text-xs">Horário<input type="time" value={hora} onChange={e=>setHora(e.target.value)} className={entrada}/></label><label className="flex min-w-44 flex-1 items-center gap-2 rounded-lg bg-surface-container px-3 py-2"><Search size={16}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Modelo, placa ou tipo" aria-label="Buscar veículos" className="min-w-0 flex-1 bg-transparent outline-none"/></label><select aria-label="Filtrar veículos" value={filtro} onChange={e=>setFiltro(e.target.value)} className={entrada}><option value="todos">Todos</option><option value="vagos">Vagos no horário</option><option value="sugeridos">Capacidade para eventos sem carro</option><option value="fornos">Levam forno</option><option value="particulares">Particulares</option></select></div>}
    {falhaAgenda && <p role="status" className="text-xs text-on-surface-variant">{falhaAgenda}</p>}
    {!modoProprio && !agenda && !falhaAgenda && <p role="status" className="text-xs text-on-surface-variant">Consultando disponibilidade e rotas…</p>}
    {veiculos.length === 0 ? <p className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">{modoProprio ? "Você ainda não cadastrou seu carro." : "Nenhum veículo físico cadastrado. Cadastre o primeiro para consultar horários e sugerir rotas no mapa tático."}</p> : visiveis.length === 0 ? <p className="rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant">Nenhum veículo corresponde ao filtro.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visiveis.map(v => { const Icone = v.carroceria === "van" ? BusFront : v.carroceria === "utilitario" ? Truck : v.carroceria === "sedan" ? Car : v.carroceria === "hatch" ? CarFront : Package; const estado = situacao(v); const compativeis = sugestoes(v); return <article key={v.id} className="flex min-h-52 flex-col rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-outline-variant/20"><div className="flex items-start justify-between gap-3"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><Icone size={38} strokeWidth={1.5} /></span><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs ${estado === "Vago" ? "bg-tertiary-container text-on-tertiary-container" : "bg-surface-container text-on-surface-variant"}`}>{estado}</span><button type="button" onClick={() => editar(v)} aria-label={`Editar ${v.modelo}`} className="rounded-lg bg-surface-container p-2 text-on-surface-variant hover:text-primary"><Pencil size={16} /></button></div></div><div className="mt-3"><h3 className="font-semibold">{v.modelo}</h3><p className="text-xs text-on-surface-variant">{v.placa} · {v.carroceria} · {modoProprio ? "Particular" : v.proprietario_id ? pessoas.find(p => p.id === v.proprietario_id)?.nome ?? "Particular" : "Empresa"}</p></div>{!modoProprio && compativeis.length > 0 && <p className="mt-3 rounded-lg bg-primary/10 px-2.5 py-2 text-xs text-primary">Compatível em capacidade com {compativeis.length} rota(s) sem carro. Planeje no mapa tático.</p>}<div className="mt-auto grid grid-cols-2 gap-2 pt-4 text-xs text-on-surface-variant"><span>Forno: {fornos[v.forno_maximo]}</span><span>Bebida: {bebidas[v.bebida_maxima]}</span><span>{v.lugares} lugares</span><span>Até {v.limite_eventos_levar} evento(s)/saída</span></div></article>; })}</div>}
  </div>;
}
