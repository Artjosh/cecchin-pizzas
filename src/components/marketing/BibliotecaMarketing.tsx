"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileImage, Film, FolderOpen, RefreshCw, Upload } from "lucide-react";

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
      const dados = new FormData(); dados.set("arquivo", arquivo);
      const resposta = await fetch("/api/operacao/marketing/midia", { method: "POST", body: dados });
      const resultado = await resposta.json() as { caminho?: string; mensagem?: string };
      if (!resposta.ok || !resultado.caminho) throw new Error(resultado.mensagem ?? "Falha ao salvar o arquivo");
      setArquivo(null);
      if (campoArquivo.current) campoArquivo.current.value = "";
      if (await carregar(0)) setAviso("Arquivo salvo na biblioteca.");
    } catch (falha) { setErro(mensagemFalha(falha, "Falha ao salvar o arquivo")); }
    finally { setOcupado(false); }
  }

  return <section aria-labelledby="biblioteca-titulo" className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/30 pb-4">
      <div><div className="flex items-center gap-2 text-primary"><FolderOpen className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-widest">Acervo interno</span></div><h2 id="biblioteca-titulo" className="mt-2 font-title-lg text-on-surface">Biblioteca de conteúdos</h2><p className="mt-1 text-sm text-on-surface-variant">Fotos e vídeos da equipe, prontos para vincular à agenda.</p></div>
      <button type="button" disabled={ocupado} onClick={() => void carregar(pagina)} className="inline-flex items-center gap-2 rounded-xl bg-surface-container-high px-3 py-2 text-sm text-on-surface hover:bg-surface-container disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${ocupado ? "animate-spin" : ""}`} />Atualizar</button>
    </div>
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-center gap-4"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="rounded-xl bg-primary-container p-3 text-on-primary-container"><Upload className="h-5 w-5" /></div><div><h3 className="font-label-lg">Adicionar mídia</h3><p className="text-xs text-on-surface-variant">JPG, PNG, WebP, MP4, MOV ou WebM · até 100 MB</p></div></div><label htmlFor="marketing-arquivo-biblioteca" className="cursor-pointer rounded-xl border border-outline-variant/60 bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high">Escolher arquivo</label><input ref={campoArquivo} id="marketing-arquivo-biblioteca" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={(evento) => { setArquivo(evento.target.files?.[0] ?? null); setErro(""); setAviso(""); }} className="sr-only" /><button type="button" disabled={!arquivo || ocupado} onClick={() => void enviar()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"><Upload className="h-4 w-4" />{ocupado && arquivo ? "Salvando…" : "Salvar arquivo"}</button></div>
      <p className="mt-3 text-xs text-on-surface-variant">{arquivo ? `${arquivo.name} · ${(arquivo.size / 1048576).toFixed(1)} MB` : "Escolha um arquivo para habilitar o salvamento."}</p>
    </div>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-3 text-sm text-on-error-container">{erro}</p>}
    {aviso && <p role="status" className="text-sm text-on-surface-variant">{aviso}{atualizadoEm ? ` · ${atualizadoEm}` : ""}</p>}
    {ocupado && !carregou && <p role="status" className="rounded-xl bg-surface-container-lowest p-6 text-sm text-on-surface-variant">Carregando arquivos…</p>}
    {carregou && !ocupado && !arquivos.length && !erro && <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-lowest px-5 py-10 text-center"><FileImage className="h-8 w-8 text-primary" /><h3 className="font-label-lg">Biblioteca vazia</h3><p className="max-w-xs text-sm text-on-surface-variant">Escolha uma foto ou vídeo acima para adicionar o primeiro arquivo.</p></div>}
    {!!arquivos.length && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{arquivos.map((item) => <a key={item.caminho} href={`/api/operacao/marketing/midia?caminho=${encodeURIComponent(item.caminho)}`} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 hover:bg-surface-container-high"><span className="rounded-lg bg-surface-container p-3 text-primary">{item.tipo?.startsWith("video/") ? <Film className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}</span><span className="min-w-0"><strong className="block truncate text-sm group-hover:text-primary">{item.caminho.split("/").at(-1)}</strong><span className="text-xs text-on-surface-variant">{item.criado_em ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(item.criado_em)) : "Data indisponível"}{item.tamanho != null ? ` · ${(item.tamanho / 1048576).toFixed(1)} MB` : ""}</span></span></a>)}</div>}
    {(pagina > 0 || temMais) && <nav aria-label="Páginas da biblioteca" className="flex items-center justify-between border-t border-outline-variant/30 pt-4 text-sm"><button type="button" disabled={ocupado || pagina === 0} onClick={() => void carregar(pagina - 1)} className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50">Anterior</button><span>Página {pagina + 1}</span><button type="button" disabled={ocupado || !temMais} onClick={() => void carregar(pagina + 1)} className="rounded-xl bg-surface-container px-3 py-2 disabled:opacity-50">Próxima</button></nav>}
  </section>;
}
