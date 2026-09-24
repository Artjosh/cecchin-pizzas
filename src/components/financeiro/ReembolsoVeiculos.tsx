"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CarFront } from "lucide-react";
import { formatBRL } from "../../lib/moeda";

export type PlanoVeiculo = { id: string; evento_id: string; veiculo_id: string; motorista_id: string | null; distancia_km: number | string | null; retorno_previsto: string | null };
export type VeiculoFinanceiro = { id: string; proprietario_id: string | null; modelo: string; placa: string };
export type UsoVeiculo = { id: string; plano_id: string; veiculo_id: string; motorista_id: string; numero_uso: number; km_rodados: number | string; transportou_material: boolean; lavagem_opcao: string | null; valor_deslocamento_centavos: number; valor_adicional_centavos: number; valor_lavagem_centavos: number; valor_bonus_centavos: number; estado: string };
export type ResumoUsoVeiculo = { veiculo_id: string; ultimo_uso: number };

const campo = "rounded-lg bg-surface-container px-3 py-2 text-on-surface";
const dataBrasil = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function ReembolsoVeiculos({ planos, veiculos, usos, resumos, pessoas }: { planos: PlanoVeiculo[]; veiculos: VeiculoFinanceiro[]; usos: UsoVeiculo[]; resumos: ResumoUsoVeiculo[]; pessoas: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [plano, setPlano] = useState("");
  const [km, setKm] = useState("");
  const [material, setMaterial] = useState(false);
  const [lavagem, setLavagem] = useState("");
  const [data, setData] = useState(dataBrasil);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const usosPorVeiculo = new Map(resumos.map(resumo => [resumo.veiculo_id, resumo.ultimo_uso]));
  const pendentes = usos.filter(uso => uso.estado === "pendente");
  const elegiveis = planos.filter(p => {
    const carro = veiculos.find(v => v.id === p.veiculo_id);
    return carro?.proprietario_id && carro.proprietario_id === p.motorista_id && p.retorno_previsto && new Date(p.retorno_previsto) <= new Date() && !usos.some(u => u.plano_id === p.id);
  });
  const escolhido = elegiveis.find(p => p.id === plano);
  const veiculoEscolhido = veiculos.find(v => v.id === escolhido?.veiculo_id);
  const numeroUso = (usosPorVeiculo.get(veiculoEscolhido?.id ?? "") ?? 0) + 1;
  async function enviar(corpo: Record<string, unknown>) {
    setErro(""); setOcupado(true);
    try {
      const resposta = await fetch("/api/operacao/financeiro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.mensagem ?? "Não foi possível salvar");
      router.refresh();
      return true;
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar"); return false; }
    finally { setOcupado(false); }
  }
  return <section className="space-y-3">
    <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm"><CarFront size={20} />Veículos particulares <span className="rounded-full bg-primary px-2 text-sm text-on-primary">{pendentes.length}</span></h2>
    <p className="text-sm text-on-surface-variant">Registre a quilometragem real após a viagem. O banco calcula deslocamento, adicional, lavagem e bônus; os pagamentos aparecem no caixa do dia.</p>
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={e => { e.preventDefault(); if (escolhido) void enviar({ acao: "registrar_uso_veiculo", plano: escolhido.id, km: Number(km), material, lavagem: lavagem || null }).then(ok => { if (ok) { setPlano(""); setKm(""); setLavagem(""); } }); }} className="grid content-start gap-3 rounded-2xl bg-surface-container-low p-4">
        <h3 className="font-semibold">Registrar uso concluído</h3>
        <label className="text-sm">Viagem<select required className={`mt-1 w-full ${campo}`} value={plano} onChange={e => { const p = elegiveis.find(item => item.id === e.target.value); setPlano(e.target.value); setKm(p?.distancia_km == null ? "" : String(p.distancia_km)); setLavagem(""); }}><option value="">Escolha a viagem</option>{elegiveis.map(p => { const v = veiculos.find(item => item.id === p.veiculo_id); return <option key={p.id} value={p.id}>{p.retorno_previsto ? new Date(p.retorno_previsto).toLocaleDateString("pt-BR") : ""} · {v?.modelo} {v?.placa} · {p.evento_id.slice(0, 8)}</option>; })}</select></label>
        {escolhido && <><p className="text-sm text-on-surface-variant">{pessoas.find(p => p.id === escolhido.motorista_id)?.nome ?? "Motorista"} · uso nº {numeroUso}</p><label className="text-sm">Quilômetros rodados (ida e volta)<input required className={`mt-1 w-full ${campo}`} type="number" min="0" max="3000" step="0.01" value={km} onChange={e => setKm(e.target.value)} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={material} onChange={e => setMaterial(e.target.checked)} />Transportou material</label>{numeroUso % 5 === 0 && <label className="text-sm">Benefício do 5º uso<select required className={`mt-1 w-full ${campo}`} value={lavagem} onChange={e => setLavagem(e.target.value)}><option value="">Escolha</option><option value="lavagem">Lavagem do carro</option><option value="dinheiro">R$ 40 em dinheiro</option></select></label>}{numeroUso % 10 === 0 && <p className="text-sm text-tertiary">Este uso também recebe bônus de R$ 50.</p>}</>}
        <button disabled={ocupado || !escolhido || km === "" || (numeroUso % 5 === 0 && !lavagem)} className="rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-40">Registrar reembolso</button>
      </form>
      <div className="space-y-2 rounded-2xl bg-surface-container-low p-4"><h3 className="font-semibold">Reembolsos a pagar</h3>{pendentes.length ? pendentes.map(uso => { const v = veiculos.find(item => item.id === uso.veiculo_id); const total = (uso.valor_deslocamento_centavos + uso.valor_adicional_centavos + uso.valor_lavagem_centavos + uso.valor_bonus_centavos) / 100; return <article key={uso.id} className="rounded-xl bg-surface-container-lowest p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{pessoas.find(p => p.id === uso.motorista_id)?.nome ?? "Motorista"}</strong><small className="block text-on-surface-variant">{v?.modelo} {v?.placa} · uso nº {uso.numero_uso} · {uso.km_rodados} km</small><small className="block text-on-surface-variant">{uso.transportou_material ? "Material" : "Pessoas"}{uso.lavagem_opcao ? ` · ${uso.lavagem_opcao === "dinheiro" ? "R$ 40 pela lavagem" : "Lavagem em serviço"}` : ""}{uso.valor_bonus_centavos ? " · bônus R$ 50" : ""}</small></div><strong>{formatBRL(total)}</strong></div><div className="mt-3 flex flex-wrap items-end gap-2"><label className="text-xs">Pago em<input type="date" className={`block ${campo}`} value={data} onChange={e => setData(e.target.value)} /></label><button type="button" disabled={ocupado || !data} onClick={() => void enviar({ acao: "quitar_uso_veiculo", id: uso.id, data })} className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary disabled:opacity-40">Marcar pago</button></div></article>; }) : <p className="text-sm text-on-surface-variant">Nenhum reembolso pendente.</p>}</div>
    </div>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-3 text-on-error-container">{erro}</p>}
  </section>;
}
