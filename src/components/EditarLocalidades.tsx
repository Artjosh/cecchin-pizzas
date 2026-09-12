"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

export interface LocalidadeEditavel {
  id: string;
  cidade: string;
  bairro: string | null;
  uf: string | null;
  valor: string | number | null;
  minutos_normal: number | null;
  minutos_pico: number | null;
  ativa: boolean;
}

function numeroNoCampo(valor: string | number | null): string {
  return valor === null ? "" : String(valor);
}

async function salvar(corpo: Record<string, unknown>): Promise<string | null> {
  try {
    const resposta = await fetch("/api/localidade", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (resposta.ok) return null;
    const detalhe = (await resposta.json().catch(() => ({}))) as { mensagem?: string };
    return detalhe.mensagem ?? "O servidor recusou a alteração.";
  } catch {
    return "Falha de rede. A alteração não foi gravada.";
  }
}

function JanelaDePico({ inicio, fim }: { inicio: string; fim: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [de, setDe] = useState(inicio.slice(0, 5));
  const [ate, setAte] = useState(fim.slice(0, 5));
  const [falha, setFalha] = useState<string | null>(null);

  async function gravar() {
    setFalha(null);
    const problema = await salvar({ tipo: "pico", inicio: de, fim: ate });
    if (problema) return setFalha(problema);
    iniciar(() => router.refresh());
  }

  return (
    <section className="bg-surface-container-low rounded-xl p-space-md flex flex-wrap items-end gap-space-sm">
      <div className="min-w-[13rem] mr-auto">
        <h2 className="font-title-md text-title-md text-on-surface">Trânsito de pico</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Define quando a rota usa o tempo de pico de cada localidade.</p>
      </div>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">Início
        <input value={de} onChange={(e) => setDe(e.target.value)} type="time" disabled={pendente} className="h-10 rounded-lg bg-surface-container-highest px-3 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
      </label>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">Fim
        <input value={ate} onChange={(e) => setAte(e.target.value)} type="time" disabled={pendente} className="h-10 rounded-lg bg-surface-container-highest px-3 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
      </label>
      <button type="button" onClick={() => void gravar()} disabled={pendente} className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 disabled:opacity-50">
        {pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar pico
      </button>
      {falha && <p role="alert" className="basis-full text-primary font-body-sm text-body-sm">{falha}</p>}
    </section>
  );
}

function LinhaLocalidade({ localidade }: { localidade: LocalidadeEditavel }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [valor, setValor] = useState(numeroNoCampo(localidade.valor));
  const [normal, setNormal] = useState(numeroNoCampo(localidade.minutos_normal));
  const [pico, setPico] = useState(numeroNoCampo(localidade.minutos_pico));
  const [ativa, setAtiva] = useState(localidade.ativa);
  const [falha, setFalha] = useState<string | null>(null);

  async function gravar() {
    setFalha(null);
    const problema = await salvar({ tipo: "localidade", id: localidade.id, valor, minutos_normal: normal, minutos_pico: pico, ativa });
    if (problema) return setFalha(problema);
    iniciar(() => router.refresh());
  }

  return (
    <li className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-wrap items-end gap-space-sm">
      <div className="min-w-[12rem] mr-auto"><p className="font-label-lg text-label-lg text-on-surface">{localidade.cidade}</p><p className="font-body-sm text-body-sm text-on-surface-variant">{[localidade.bairro, localidade.uf].filter(Boolean).join(" · ") || "cidade inteira"}</p></div>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">Taxa (R$)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} disabled={pendente} className="w-24 h-10 rounded-lg bg-surface-container-highest px-3 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" /></label>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">Normal (min)<input inputMode="numeric" value={normal} onChange={(e) => setNormal(e.target.value)} disabled={pendente} className="w-24 h-10 rounded-lg bg-surface-container-highest px-3 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" /></label>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface-variant">Pico (min)<input inputMode="numeric" value={pico} onChange={(e) => setPico(e.target.value)} disabled={pendente} className="w-24 h-10 rounded-lg bg-surface-container-highest px-3 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" /></label>
      <label className="h-10 flex items-center gap-2 font-label-md text-label-md text-on-surface whitespace-nowrap"><input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} disabled={pendente} /> atende</label>
      <button type="button" onClick={() => void gravar()} disabled={pendente} className="h-10 px-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 disabled:opacity-50">{pendente ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar</button>
      {falha && <p role="alert" className="basis-full text-primary font-body-sm text-body-sm">{falha}</p>}
    </li>
  );
}

export function EditarLocalidades({ localidades, inicioPico = "17:00", fimPico = "20:00" }: { localidades: LocalidadeEditavel[]; inicioPico?: string; fimPico?: string }) {
  return <div className="flex flex-col gap-space-md"><JanelaDePico inicio={inicioPico} fim={fimPico} /><p className="font-body-sm text-body-sm text-on-surface-variant">Deixe a taxa ou um tempo em branco quando ainda não houver uma regra confirmada.</p><ul className="flex flex-col gap-space-xs">{localidades.map((localidade) => <LinhaLocalidade key={localidade.id} localidade={localidade} />)}</ul></div>;
}
