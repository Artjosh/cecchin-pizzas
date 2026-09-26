"use client";

import { useCallback, useEffect, useState } from "react";
import { FileImage, Film } from "lucide-react";

type Arquivo = { caminho: string; tipo: string | null; tamanho: number | null; criado_em: string | null };
type Resposta = { arquivos?: Arquivo[]; temMais?: boolean; mensagem?: string };

export function SeletorMidiaAgenda({ selecionado, aoSelecionar }: { selecionado: string; aoSelecionar: (caminho: string) => void }) {
  const [pagina, setPagina] = useState(0);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async (alvo: number, sinal?: AbortSignal) => {
    setCarregando(true); setErro("");
    try {
      const resposta = await fetch(`/api/operacao/marketing/biblioteca?pagina=${alvo}`, { cache: "no-store", signal: sinal });
      const dados = await resposta.json() as Resposta;
      if (!resposta.ok || !Array.isArray(dados.arquivos)) throw new Error(dados.mensagem ?? "Não foi possível carregar a biblioteca");
      if (sinal?.aborted) return;
      setArquivos(dados.arquivos); setTemMais(Boolean(dados.temMais)); setPagina(alvo);
    } catch (falha) {
      if (!sinal?.aborted) setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a biblioteca");
    } finally { if (!sinal?.aborted) setCarregando(false); }
  }, []);

  useEffect(() => { const controle = new AbortController(); void carregar(0, controle.signal); return () => controle.abort(); }, [carregar]);

  return <div className="space-y-3 rounded-xl bg-surface-container p-4" aria-label="Escolher arquivo da biblioteca">
    <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Biblioteca</p><p className="text-xs text-on-surface-variant">Escolha um arquivo já enviado para esta publicação.</p></div><button type="button" disabled={carregando} onClick={() => void carregar(pagina)} className="text-xs font-semibold text-primary disabled:opacity-50">Atualizar</button></div>
    {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
    {carregando && <p role="status" className="text-sm text-on-surface-variant">Carregando arquivos…</p>}
    {!carregando && !erro && arquivos.length === 0 && <p className="py-5 text-center text-sm text-on-surface-variant">Nenhum arquivo nesta página da biblioteca.</p>}
    {!!arquivos.length && <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{arquivos.map((item) => { const url = `/api/operacao/marketing/midia?caminho=${encodeURIComponent(item.caminho)}`; return <button key={item.caminho} type="button" aria-pressed={selecionado === item.caminho} onClick={() => aoSelecionar(item.caminho)} className={`min-w-0 overflow-hidden rounded-xl p-1 text-left text-xs ${selecionado === item.caminho ? "bg-primary-container text-on-primary-container ring-2 ring-primary" : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-high"}`}><span className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface-container-high">{item.tipo?.startsWith("image/") ? <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" /> : item.tipo?.startsWith("video/") ? <video src={url} muted preload="metadata" className="h-full w-full object-cover" /> : item.tipo?.startsWith("video") ? <Film className="h-6 w-6" /> : <FileImage className="h-6 w-6" />}</span><span className="block truncate px-1 py-2">{item.caminho.split("/").at(-1)}</span></button>; })}</div>}
    {(pagina > 0 || temMais) && <div className="flex items-center justify-end gap-3 text-xs"><button type="button" disabled={carregando || pagina === 0} onClick={() => void carregar(pagina - 1)} className="disabled:opacity-50">Anterior</button><span>{pagina + 1}</span><button type="button" disabled={carregando || !temMais} onClick={() => void carregar(pagina + 1)} className="disabled:opacity-50">Próxima</button></div>}
  </div>;
}
