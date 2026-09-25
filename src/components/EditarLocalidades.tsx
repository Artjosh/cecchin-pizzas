"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save, Search } from "lucide-react";
import { cn } from "../lib/utils";

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

type Dados = {
  localidades: LocalidadeEditavel[];
  total: number;
  incompletas: number;
  comTaxa: number;
  inicioPico: string;
  fimPico: string;
  porPagina: number;
};

const numeroNoCampo = (valor: string | number | null) => valor === null ? "" : String(valor);
const campo = "h-10 rounded-lg bg-surface-container-highest px-3 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary";

async function salvar(corpo: Record<string, unknown>): Promise<string | null> {
  try {
    const resposta = await fetch("/api/localidade", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    if (resposta.ok) return null;
    const detalhe = await resposta.json().catch(() => ({})) as { mensagem?: string };
    return detalhe.mensagem ?? "O servidor recusou a alteração.";
  } catch { return "Falha de rede. A alteração não foi gravada."; }
}

function JanelaDePico({ inicio, fim, onSalvo }: { inicio: string; fim: string; onSalvo: () => void }) {
  const [de, setDe] = useState(inicio.slice(0, 5));
  const [ate, setAte] = useState(fim.slice(0, 5));
  const [pendente, setPendente] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  async function gravar() {
    setPendente(true); setFalha(null);
    const problema = await salvar({ tipo: "pico", inicio: de, fim: ate });
    if (problema) setFalha(problema); else onSalvo();
    setPendente(false);
  }
  return <section className="flex flex-wrap items-end gap-space-sm rounded-xl bg-surface-container-low p-space-md">
    <div className="mr-auto min-w-[13rem]"><h2 className="font-title-md text-title-md">Trânsito de pico</h2><p className="font-body-sm text-body-sm text-on-surface-variant">Define quando a rota usa o tempo de pico de cada localidade.</p></div>
    <label className="flex flex-col gap-1 text-sm">Início<input value={de} onChange={(e) => setDe(e.target.value)} type="time" disabled={pendente} className={campo} /></label>
    <label className="flex flex-col gap-1 text-sm">Fim<input value={ate} onChange={(e) => setAte(e.target.value)} type="time" disabled={pendente} className={campo} /></label>
    <button type="button" onClick={() => void gravar()} disabled={pendente} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-on-primary disabled:opacity-50">{pendente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar pico</button>
    {falha && <p role="alert" className="basis-full text-sm text-primary">{falha}</p>}
  </section>;
}

function LinhaLocalidade({ localidade, onSalvo }: { localidade: LocalidadeEditavel; onSalvo: () => void }) {
  const [valor, setValor] = useState(numeroNoCampo(localidade.valor));
  const [normal, setNormal] = useState(numeroNoCampo(localidade.minutos_normal));
  const [pico, setPico] = useState(numeroNoCampo(localidade.minutos_pico));
  const [ativa, setAtiva] = useState(localidade.ativa);
  const [pendente, setPendente] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  async function gravar() {
    setPendente(true); setFalha(null);
    const problema = await salvar({ tipo: "localidade", id: localidade.id, valor, minutos_normal: normal, minutos_pico: pico, ativa });
    if (problema) setFalha(problema); else onSalvo();
    setPendente(false);
  }
  return <li className="flex flex-wrap items-end gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
    <div className="mr-auto min-w-[12rem]"><p className="font-label-lg text-label-lg">{localidade.cidade}</p><p className="text-sm text-on-surface-variant">{[localidade.bairro, localidade.uf].filter(Boolean).join(" · ") || "cidade inteira"}</p></div>
    <label className="flex flex-col gap-1 text-sm">Taxa (R$)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} disabled={pendente} className={`w-24 ${campo}`} /></label>
    <label className="flex flex-col gap-1 text-sm">Normal (min)<input inputMode="numeric" value={normal} onChange={(e) => setNormal(e.target.value)} disabled={pendente} className={`w-24 ${campo}`} /></label>
    <label className="flex flex-col gap-1 text-sm">Pico (min)<input inputMode="numeric" value={pico} onChange={(e) => setPico(e.target.value)} disabled={pendente} className={`w-24 ${campo}`} /></label>
    <label className="flex h-10 items-center gap-2 whitespace-nowrap text-sm"><input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} disabled={pendente} /> atende</label>
    <button type="button" onClick={() => void gravar()} disabled={pendente} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-on-primary disabled:opacity-50">{pendente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar</button>
    {falha && <p role="alert" className="basis-full text-sm text-primary">{falha}</p>}
  </li>;
}

export function EditarLocalidades() {
  const [busca, setBusca] = useState("");
  const [soIncompletas, setSoIncompletas] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [revisao, setRevisao] = useState(0);
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setCarregando(true);
      try {
        const parametros = new URLSearchParams({ busca: busca.trim(), incompletas: soIncompletas ? "1" : "0", pagina: String(pagina) });
        const resposta = await fetch(`/api/localidade?${parametros}`, { cache: "no-store", signal: controller.signal });
        if (!resposta.ok) throw new Error("Não foi possível carregar as localidades.");
        const resultado = await resposta.json() as Dados;
        if (!controller.signal.aborted) { setDados(resultado); setErro(""); }
      } catch { if (!controller.signal.aborted) setErro("Não foi possível carregar as localidades."); }
      finally { if (!controller.signal.aborted) setCarregando(false); }
    }, busca ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [busca, soIncompletas, pagina, revisao]);

  const totalPaginas = Math.max(1, Math.ceil((dados?.total ?? 0) / (dados?.porPagina ?? 30)));
  const atualizar = () => setRevisao((anterior) => anterior + 1);
  return <div className="flex flex-col gap-space-md">
    {dados && <JanelaDePico inicio={dados.inicioPico} fim={dados.fimPico} onSalvo={atualizar} />}
    <div className="flex flex-wrap items-center gap-space-sm">
      <div className="relative min-w-[12rem] flex-1"><label htmlFor="busca-localidade" className="sr-only">Buscar cidade ou bairro</label><Search aria-hidden="true" className="absolute left-3 top-3 h-[18px] w-[18px] text-on-surface-variant" /><input id="busca-localidade" type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(0); }} placeholder="Buscar cidade ou bairro" className="h-11 w-full rounded-lg bg-surface-container-highest pl-9 pr-3 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary" /></div>
      <button type="button" onClick={() => { setSoIncompletas((valor) => !valor); setPagina(0); }} aria-pressed={soIncompletas} className={cn("flex h-11 items-center gap-2 rounded-lg px-4", soIncompletas ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface")}><AlertTriangle className="h-4 w-4" />Só incompletas ({dados?.incompletas ?? 0})</button>
    </div>
    <p className="text-sm text-on-surface-variant">{dados ? `${dados.comTaxa} localidades têm taxa cadastrada no banco. ` : ""}A planilha histórica não trouxe tempos de deslocamento; deixe os campos sem regra confirmada em branco.</p>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-3 text-on-error-container">{erro}</p>}
    <p role="status" className="text-sm text-on-surface-variant">{carregando ? "Carregando localidades…" : `${dados?.total ?? 0} localidades encontradas`}</p>
    <ul className="flex flex-col gap-space-xs">{!carregando && dados?.localidades.map((localidade) => <LinhaLocalidade key={localidade.id} localidade={localidade} onSalvo={atualizar} />)}{!carregando && dados?.localidades.length === 0 && <li className="rounded-xl bg-surface-container-low p-space-md text-center text-on-surface-variant">Nenhuma localidade encontrada.</li>}</ul>
    {dados && totalPaginas > 1 && <nav aria-label="Páginas de localidades" className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={pagina === 0 || carregando} onClick={() => setPagina((valor) => valor - 1)} className="rounded-lg bg-surface-container px-4 py-2 disabled:opacity-40">Anterior</button><span>Página {pagina + 1} de {totalPaginas}</span><button type="button" disabled={pagina + 1 >= totalPaginas || carregando} onClick={() => setPagina((valor) => valor + 1)} className="rounded-lg bg-surface-container px-4 py-2 disabled:opacity-40">Próxima</button></nav>}
  </div>;
}
