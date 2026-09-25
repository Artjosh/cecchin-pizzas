"use client";

import { useState } from "react";
import { FolderOpen, RefreshCw, Upload } from "lucide-react";

type Arquivo = { caminho: string; criado_em: string | null; tamanho: number | null; tipo: string | null };
type Resposta = { arquivos?: Arquivo[]; temMais?: boolean; mensagem?: string };

export function BibliotecaMarketing() {
  const [aberta, setAberta] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  async function carregar(proximaPagina: number) {
    setOcupado(true); setErro("");
    try {
      const resposta = await fetch(`/api/operacao/marketing/biblioteca?pagina=${proximaPagina}`, { cache: "no-store" });
      const dados = await resposta.json() as Resposta;
      if (!resposta.ok || !dados.arquivos) throw new Error(dados.mensagem ?? "Falha ao carregar a biblioteca");
      setArquivos(dados.arquivos); setTemMais(Boolean(dados.temMais)); setPagina(proximaPagina);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Falha ao carregar a biblioteca"); }
    finally { setOcupado(false); }
  }

  async function enviar() {
    if (!arquivo) return;
    setOcupado(true); setErro("");
    try {
      const dados = new FormData(); dados.set("arquivo", arquivo);
      const resposta = await fetch("/api/operacao/marketing/midia", { method: "POST", body: dados });
      const resultado = await resposta.json() as { mensagem?: string };
      if (!resposta.ok) throw new Error(resultado.mensagem ?? "Falha ao salvar o arquivo");
      setArquivo(null);
      const campo = document.getElementById("marketing-arquivo-biblioteca") as HTMLInputElement | null;
      if (campo) campo.value = "";
      await carregar(0);
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Falha ao salvar o arquivo"); }
    finally { setOcupado(false); }
  }

  return <section className="rounded-2xl bg-surface-container-low p-5">
    <button type="button" aria-expanded={aberta} onClick={() => { setAberta(!aberta); if (!aberta && !arquivos.length) void carregar(0); }} className="flex w-full items-center gap-2 text-left font-title-lg"><FolderOpen className="h-5 w-5" />Biblioteca de conteúdos<span className="ml-auto text-sm text-on-surface-variant">{aberta ? "Ocultar" : "Abrir"}</span></button>
    {aberta && <div className="mt-4 space-y-4">
      <p className="text-sm text-on-surface-variant">Fotos e vídeos privados do marketing, inclusive arquivos ainda não vinculados à agenda.</p>
      <div className="flex flex-wrap items-end gap-2"><label className="min-w-56 flex-1 text-sm">Adicionar foto ou vídeo<input id="marketing-arquivo-biblioteca" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(evento) => setArquivo(evento.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" /></label><button type="button" disabled={!arquivo || ocupado} onClick={() => void enviar()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-50"><Upload className="h-4 w-4" />Salvar</button><button type="button" disabled={ocupado} onClick={() => void carregar(0)} aria-label="Atualizar biblioteca" className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${ocupado ? "animate-spin" : ""}`} /></button></div>
      {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{arquivos.map((item) => <a key={item.caminho} href={`/api/operacao/marketing/midia?caminho=${encodeURIComponent(item.caminho)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-surface-container-lowest p-3 hover:bg-surface-container-high"><strong className="block truncate text-sm">{item.tipo?.startsWith("video/") ? "Vídeo" : "Imagem"} · {item.caminho.split("/").at(-1)}</strong><span className="text-xs text-on-surface-variant">{item.criado_em ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(item.criado_em)) : "Data indisponível"}{item.tamanho != null ? ` · ${(item.tamanho / 1048576).toFixed(1)} MB` : ""}</span></a>)}</div>
      {!ocupado && !arquivos.length && !erro && <p className="text-sm text-on-surface-variant">Nenhum arquivo nesta página.</p>}
      <nav aria-label="Páginas da biblioteca" className="flex items-center justify-end gap-2 text-sm"><button type="button" disabled={ocupado || pagina === 0} onClick={() => void carregar(pagina - 1)} className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50">Anterior</button><span>Página {pagina + 1}</span><button type="button" disabled={ocupado || !temMais} onClick={() => void carregar(pagina + 1)} className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50">Próxima</button></nav>
    </div>}
  </section>;
}
