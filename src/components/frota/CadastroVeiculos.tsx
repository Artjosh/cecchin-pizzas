"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CarFront, Plus } from "lucide-react";

export type Veiculo = { id: string; placa: string; modelo: string; carroceria: string; forno_maximo: string; bebida_maxima: string; lugares: number; limite_eventos_levar: number; proprietario_id: string | null; ativo: boolean };
type Pessoa = { id: string; nome: string };
const entrada = "min-w-0 w-full rounded-lg bg-surface-container px-3 py-2 text-on-surface";
const fornos: Record<string, string> = { nenhum: "Sem forno", mini: "Mini", mini_medio: "Mini médio", medio: "Médio" };
const bebidas: Record<string, string> = { nenhuma: "Sem bebida", isopor_pequeno: "Isopor pequeno", isopor_grande: "Isopor grande" };

export function CadastroVeiculos({ veiculos, pessoas }: { veiculos: Veiculo[]; pessoas: Pessoa[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false); const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState("");
  const [modelo, setModelo] = useState(""); const [placa, setPlaca] = useState(""); const [carroceria, setCarroceria] = useState("utilitario");
  const [forno, setForno] = useState("nenhum"); const [bebida, setBebida] = useState("nenhuma"); const [lugares, setLugares] = useState(4);
  const [limite, setLimite] = useState(1); const [proprietario, setProprietario] = useState("");
  async function salvar(evento: FormEvent) {
    evento.preventDefault(); setErro(""); setOcupado(true);
    try {
      const resposta = await fetch("/api/operacao/veiculos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelo, placa, carroceria, forno_maximo: forno, bebida_maxima: bebida, lugares, limite_eventos_levar: limite, proprietario_id: proprietario || null }) });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.mensagem ?? "Não foi possível salvar");
      setAberto(false); setModelo(""); setPlaca(""); router.refresh();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar"); }
    finally { setOcupado(false); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-headline-sm text-headline-sm">Veículos cadastrados</h2><p className="text-sm text-on-surface-variant">Capacidade física; disponibilidade e escala são decididas por data.</p></div><button type="button" onClick={() => setAberto(!aberto)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-on-primary"><Plus size={17} />Cadastrar veículo</button></div>
    {aberto && <form onSubmit={salvar} className="grid gap-3 rounded-2xl bg-surface-container-low p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">Modelo<input className={entrada} value={modelo} onChange={e => setModelo(e.target.value)} required maxLength={100} /></label>
      <label className="text-sm">Placa<input className={entrada} value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} required maxLength={10} /></label>
      <label className="text-sm">Carroceria<select className={entrada} value={carroceria} onChange={e => setCarroceria(e.target.value)}>{["sedan", "hatch", "utilitario", "van", "outro"].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
      <label className="text-sm">Proprietário<select className={entrada} value={proprietario} onChange={e => setProprietario(e.target.value)}><option value="">Frota da empresa</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
      <label className="text-sm">Maior forno que comporta<select className={entrada} value={forno} onChange={e => setForno(e.target.value)}>{Object.entries(fornos).map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <label className="text-sm">Maior carga de bebida<select className={entrada} value={bebida} onChange={e => setBebida(e.target.value)}>{Object.entries(bebidas).map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <label className="text-sm">Pessoas<input className={entrada} type="number" min={1} max={20} value={lugares} onChange={e => setLugares(Number(e.target.value))} /></label>
      <label className="text-sm">Eventos por saída como levar<input className={entrada} type="number" min={1} max={20} value={limite} onChange={e => setLimite(Number(e.target.value))} /></label>
      {erro && <p role="alert" className="text-error sm:col-span-2 xl:col-span-4">{erro}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2 xl:col-span-4"><button type="button" onClick={() => setAberto(false)} className="rounded-xl px-4 py-2">Cancelar</button><button disabled={ocupado} className="rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{ocupado ? "Salvando…" : "Salvar veículo"}</button></div>
    </form>}
    {veiculos.length === 0 ? <p className="rounded-2xl bg-surface-container-low p-8 text-center text-on-surface-variant">Nenhum veículo físico cadastrado.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{veiculos.map(v => <article key={v.id} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-outline-variant/30"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><CarFront size={22} /></span><div><h3 className="font-semibold">{v.modelo}</h3><p className="text-xs text-on-surface-variant">{v.placa} · {v.proprietario_id ? pessoas.find(p => p.id === v.proprietario_id)?.nome ?? "Veículo particular" : "Frota da empresa"}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><span>Forno: {fornos[v.forno_maximo]}</span><span>Bebida: {bebidas[v.bebida_maxima]}</span><span>{v.lugares} lugares</span><span>{v.limite_eventos_levar} evento(s)/saída</span></div></article>)}</div>}
  </div>;
}
