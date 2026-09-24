"use client";

import { useEffect, useState } from "react";
import { CarFront } from "lucide-react";

type Veiculo = { id: string; modelo: string; placa: string };
const nomes = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function DisponibilidadeCarro({ semana }: { semana: string }) {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [dias, setDias] = useState<Record<string, boolean[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(""); const [erro, setErro] = useState(""); const [salvo, setSalvo] = useState("");
  useEffect(() => {
    if (!semana) return;
    const controlador = new AbortController(); setCarregando(true); setErro("");
    void fetch(`/api/operacao/veiculos/disponibilidade?semana=${semana}`, { signal: controlador.signal })
      .then(async resposta => { const corpo = await resposta.json(); if (!resposta.ok) throw new Error(corpo.mensagem); return corpo; })
      .then((corpo: { veiculos: Veiculo[]; declaracoes: { veiculo_id: string; dias: boolean[] }[] }) => {
        setVeiculos(corpo.veiculos); setDias(Object.fromEntries(corpo.veiculos.map(v => [v.id, corpo.declaracoes.find(d => d.veiculo_id === v.id)?.dias ?? Array(7).fill(false)])));
      }).catch(falha => { if (!controlador.signal.aborted) setErro(falha instanceof Error ? falha.message : "Falha na consulta"); })
      .finally(() => { if (!controlador.signal.aborted) setCarregando(false); });
    return () => controlador.abort();
  }, [semana]);
  async function salvar(veiculo: string) {
    setSalvando(veiculo); setErro(""); setSalvo("");
    try {
      const resposta = await fetch("/api/operacao/veiculos/disponibilidade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ veiculo, semana, dias: dias[veiculo] }) });
      const corpo = await resposta.json(); if (!resposta.ok) throw new Error(corpo.mensagem); setSalvo(veiculo);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar"); }
    finally { setSalvando(""); }
  }
  if (carregando) return <p role="status" className="text-sm text-on-surface-variant">Consultando veículos cadastrados…</p>;
  if (veiculos.length === 0 && !erro) return null;
  return <section className="space-y-4 rounded-2xl bg-surface-container-low p-5"><div className="flex items-center gap-2"><CarFront size={20} /><h2 className="font-semibold">Meu carro nesta semana</h2></div>
    <p className="text-sm text-on-surface-variant">Indique em quais dias seu veículo também poderá ser usado. Isso não altera sua disponibilidade pessoal.</p>
    {veiculos.map(v => <div key={v.id} className="space-y-3 rounded-xl bg-surface-container-lowest p-4"><h3 className="font-semibold">{v.modelo} · {v.placa}</h3><div className="flex flex-wrap gap-2">{nomes.map((nome, i) => <label key={nome} className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-sm"><input type="checkbox" checked={dias[v.id]?.[i] ?? false} onChange={e => setDias(atual => ({ ...atual, [v.id]: atual[v.id].map((d, j) => j === i ? e.target.checked : d) }))} />{nome}</label>)}</div><button type="button" disabled={!!salvando} onClick={() => void salvar(v.id)} className="rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{salvando === v.id ? "Salvando…" : "Confirmar carro"}</button>{salvo === v.id && <span role="status" className="ml-3 text-sm text-tertiary">Carro confirmado</span>}</div>)}
    {erro && <p role="alert" className="text-error">{erro}</p>}
  </section>;
}
