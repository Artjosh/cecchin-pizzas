"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileImage, Film, RefreshCw, Upload, ArrowUpRight } from "lucide-react";
import { enviarMidiaMarketing } from "../../lib/enviar-midia-marketing";

type Arquivo = { caminho: string; criado_em: string | null; tamanho: number | null; tipo: string | null };
type Resposta = { arquivos?: Arquivo[]; temMais?: boolean; mensagem?: string };
const mensagemFalha = (falha: unknown, padrao: string) => falha instanceof TypeError ? "A conexão falhou. Confira a rede e tente novamente." : falha instanceof Error ? falha.message : padrao;

export function BibliotecaMarketing() {
  const [pagina, setPagina] = useState(0);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const campoArquivo = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async (proximaPagina: number) => {
    setOcupado(true); setErro(""); setAviso("");
    try {
      const resposta = await fetch(`/api/operacao/marketing/biblioteca?pagina=${proximaPagina}`, { cache: "no-store" });
      const dados = await resposta.json() as Resposta;
      if (!resposta.ok || !Array.isArray(dados.arquivos)) throw new Error(dados.mensagem ?? "Falha ao carregar a biblioteca");
      setArquivos(dados.arquivos); setTemMais(Boolean(dados.temMais)); setPagina(proximaPagina);
      setAviso("Biblioteca atualizada.");
      setAtualizadoEm(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
      return true;
    } catch (falha) { setErro(mensagemFalha(falha, "Falha ao carregar a biblioteca")); return false; }
    finally { setCarregou(true); setOcupado(false); }
  }, []);

  useEffect(() => { void carregar(0); }, [carregar]);

  async function enviar() {
    if (!arquivo || ocupado) return;
    setOcupado(true); setErro(""); setAviso("");
    try {
      await enviarMidiaMarketing(arquivo);
      setArquivo(null);
      if (campoArquivo.current) campoArquivo.current.value = "";
      if (await carregar(0)) setAviso("Arquivo salvo na biblioteca.");
    } catch (falha) { setErro(mensagemFalha(falha, "Falha ao salvar o arquivo")); }
    finally { setOcupado(false); }
  }

  return <section aria-labelledby="biblioteca-titulo" className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="biblioteca-titulo" className="text-2xl font-semibold tracking-tight">Biblioteca</h2><p className="mt-1 text-sm text-on-surface-variant">Arquivos para a agenda e as publicações da equipe.</p></div>
      <button type="button" disabled={ocupado} onClick={() => void carregar(pagina)} aria-label="Atualizar biblioteca" className="rounded-xl bg-surface-container-high p-2.5 text-on-surface disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${ocupado ? "animate-spin" : ""}`} /></button>
    </div>
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)]">
      <div className="flex min-h-56 flex-col justify-between rounded-2xl bg-surface-container-lowest p-6">
        <div><div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><Upload className="h-5 w-5" /></div><h3 className="text-lg font-semibold">Adicionar ao acervo</h3><p className="mt-1 max-w-sm text-sm text-on-surface-variant">Selecione uma foto ou vídeo. O arquivo ficará disponível para vincular à agenda.</p></div>
        <div className="mt-8 flex flex-wrap items-center gap-3"><label htmlFor="marketing-arquivo-biblioteca" className="cursor-pointer rounded-xl bg-surface-container-high px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container">Escolher arquivo</label><input ref={campoArquivo} id="marketing-arquivo-biblioteca" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(evento) => { setArquivo(evento.target.files?.[0] ?? null); setErro(""); setAviso(""); }} className="sr-only" /><button type="button" disabled={!arquivo || ocupado} onClick={() => void enviar()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50">{ocupado && arquivo ? "Salvando…" : "Salvar arquivo"}</button></div>
      </div>
      <div className="flex flex-col justify-between py-2 text-sm"><div><p className="font-semibold">Arquivo selecionado</p><p className="mt-2 break-all text-on-surface-variant">{arquivo ? arquivo.name : "Nenhum arquivo selecionado"}</p>{arquivo && <p className="mt-1 text-on-surface-variant">{(arquivo.size / 1048576).toFixed(1)} MB</p>}</div><p className="mt-6 text-xs leading-5 text-on-surface-variant">JPG, PNG, WebP, MP4, MOV ou WebM<br />Tamanho máximo: 100 MB</p></div>
    </div>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm text-on-error-container">{erro}</p>}
    {aviso && <p role="status" className="text-sm text-on-surface-variant">{aviso}{atualizadoEm ? ` · ${atualizadoEm}` : ""}</p>}
    <div className="space-y-4"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Arquivos</h3><span className="text-xs text-on-surface-variant">Página {pagina + 1}</span></div>
      {ocupado && !carregou && <p role="status" className="py-8 text-sm text-on-surface-variant">Carregando arquivos…</p>}
      {carregou && !ocupado && !arquivos.length && !erro && <div className="py-10 text-center"><FileImage className="mx-auto h-7 w-7 text-primary" /><p className="mt-3 font-semibold">Nenhum arquivo ainda</p><p className="mt-1 text-sm text-on-surface-variant">O primeiro arquivo salvo aparecerá aqui.</p></div>}
      {!!arquivos.length && <div className="divide-y divide-outline-variant/20">{arquivos.map((item) => <a key={item.caminho} href={`/api/operacao/marketing/midia?caminho=${encodeURIComponent(item.caminho)}`} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-3 py-3 hover:text-primary"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-primary">{item.tipo?.startsWith("video/") ? <Film className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.caminho.split("/").at(-1)}</strong><span className="text-xs text-on-surface-variant">{item.criado_em ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(item.criado_em)) : "Data indisponível"}{item.tamanho != null ? ` · ${(item.tamanho / 1048576).toFixed(1)} MB` : ""}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-on-surface-variant" /></a>)}</div>}
      {(pagina > 0 || temMais) && <nav aria-label="Páginas da biblioteca" className="flex items-center justify-end gap-3 pt-3 text-sm"><button type="button" disabled={ocupado || pagina === 0} onClick={() => void carregar(pagina - 1)} className="rounded-xl bg-surface-container-high px-3 py-2 disabled:opacity-50">Anterior</button><span>{pagina + 1}</span><button type="button" disabled={ocupado || !temMais} onClick={() => void carregar(pagina + 1)} className="rounded-xl bg-surface-container-high px-3 py-2 disabled:opacity-50">Próxima</button></nav>}
    </div>
  </section>;
}
