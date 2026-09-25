"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Camera, CheckCircle2, CircleAlert, ExternalLink, Plus, RefreshCw, Send, Settings2, UserRound } from "lucide-react";
import { horarioSaoPauloParaIso } from "@/src/lib/agenda-marketing-data";
import { instagramViaNavegador, type InstagramBrowserHome, type InstagramBrowserItem, type InstagramBrowserStory } from "@/src/servidor/instagram/navegador";

type Conta = { id: string; instagram_user_id: string; username: string; account_type: string; scopes: string[]; status: string; token_expires_at: string; last_error: string | null };
type Midia = { id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string; timestamp?: string };
type Publicacao = { id: string; username: string; formato: string; legenda: string; midias: string[]; agendado_para: string; status: string; tentativas: number; permalink: string | null; erro: string | null; publicado_em: string | null };
type EstadoFeed = { perfil: { username?: string; account_type?: string; media_count?: number }; publicacoes: Midia[]; stories: Midia[]; storiesDisponiveis: boolean };
type Props = { gestor: boolean };

const campo = "w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-on-surface outline-none focus:border-primary";
const acao = "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-label-md transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const estados: Record<string, string> = { rascunho: "Rascunho", agendado: "Agendado", preparando: "Preparando mídia", publicando: "Publicando", publicado: "Publicado", falhou: "Falhou" };

function dataHora(iso?: string | null) {
  return iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso)) : "—";
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function dataHoraLocalFutura() {
  const data = new Date(Date.now() + 10 * 60_000);
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

export function InstagramCentral({ gestor }: Props) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");
  const [configurado, setConfigurado] = useState(false);
  const [faltando, setFaltando] = useState<string[]>([]);
  const [feed, setFeed] = useState<EstadoFeed | null>(null);
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [aba, setAba] = useState<"feed" | "stories" | "criar" | "resultados">("feed");
  const [legenda, setLegenda] = useState("");
  const [midia, setMidia] = useState("");
  const [agendar, setAgendar] = useState(false);
  const [horario, setHorario] = useState(dataHoraLocalFutura);
  const [carregando, setCarregando] = useState(true);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [bridgeInstalada, setBridgeInstalada] = useState(false);
  const [sessaoInstagram, setSessaoInstagram] = useState(false);
  const [instagramBrowser, setInstagramBrowser] = useState<InstagramBrowserHome | null>(null);
  const [storiesVistos, setStoriesVistos] = useState<InstagramBrowserItem[]>([]);
  const [storyAtual, setStoryAtual] = useState(0);
  const [erroBrowser, setErroBrowser] = useState("");
  const [carregandoBrowser, setCarregandoBrowser] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [rContas, rPublicacoes] = await Promise.all([
        fetch("/api/operacao/marketing/instagram/contas", { cache: "no-store" }),
        fetch("/api/operacao/marketing/instagram/publicacoes", { cache: "no-store" }),
      ]);
      const c = await rContas.json() as { contas?: Conta[]; configurado?: boolean; faltando?: string[]; mensagem?: string };
      if (!rContas.ok) throw new Error(c.mensagem ?? "Banco ainda não tem a estrutura do Instagram.");
      const p = await rPublicacoes.json() as { publicacoes?: Publicacao[] };
      setContas(c.contas ?? []); setConfigurado(Boolean(c.configurado)); setFaltando(c.faltando ?? []); setPublicacoes(p.publicacoes ?? []);
      setContaId((atual) => (c.contas ?? []).some((item) => item.id === atual) ? atual : c.contas?.[0]?.id ?? "");
      setErro("");
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Falha ao carregar a central"); }
    finally { setCarregando(false); }
  }, []);

  const atualizarBrowser = useCallback(async () => {
    setCarregandoBrowser(true); setErroBrowser("");
    try {
      const ping = await instagramViaNavegador<{ instalada: boolean; sessaoAtiva: boolean }>("ping");
      setBridgeInstalada(Boolean(ping.instalada)); setSessaoInstagram(Boolean(ping.sessaoAtiva));
      if (!ping.sessaoAtiva) { setInstagramBrowser(null); return; }
      const home = await instagramViaNavegador<InstagramBrowserHome>("home");
      setInstagramBrowser(home); setSessaoInstagram(true);
    } catch (falha) {
      const mensagemFalha = falha instanceof Error ? falha.message : "Não foi possível acessar a sessão local do Instagram.";
      const extensaoAusente = mensagemFalha.startsWith("Extensão Cecchin Instagram Bridge não encontrada");
      setBridgeInstalada(!extensaoAusente); setSessaoInstagram(false); setInstagramBrowser(null);
      setErroBrowser(extensaoAusente ? "" : mensagemFalha);
    } finally { setCarregandoBrowser(false); }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { void atualizarBrowser(); }, [atualizarBrowser]);
  useEffect(() => {
    if (!contaId) { setFeed(null); return; }
    const controller = new AbortController();
    setFeed(null); setErro("");
    fetch(`/api/operacao/marketing/instagram/contas/${contaId}/feed`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json() as EstadoFeed & { mensagem?: string }; if (!response.ok) throw new Error(body.mensagem ?? "Falha ao consultar o Instagram"); if (!controller.signal.aborted) setFeed(body); })
      .catch((falha) => { if (!controller.signal.aborted) setErro(falha instanceof Error ? falha.message : "Falha ao consultar o Instagram"); });
    return () => controller.abort();
  }, [contaId]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (publicacoes.some((item) => ["agendado", "preparando", "publicando"].includes(item.status))) void carregar();
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [carregar, publicacoes]);

  const conta = useMemo(() => contas.find((item) => item.id === contaId) ?? null, [contas, contaId]);

  const abrirStory = async (story: InstagramBrowserStory) => {
    setErroBrowser(""); setCarregandoBrowser(true);
    try {
      const resultado = await instagramViaNavegador<{ stories: InstagramBrowserItem[] }>("story", { userId: story.id });
      setStoriesVistos(resultado.stories); setStoryAtual(0);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível abrir este Story."); }
    finally { setCarregandoBrowser(false); }
  };

  const anexar = async (arquivo?: File) => {
    if (!arquivo) return;
    setEnviandoMidia(true); setErro(""); setMensagem("");
    try {
      const form = new FormData(); form.set("arquivo", arquivo);
      const response = await fetch("/api/operacao/marketing/midia", { method: "POST", body: form });
      const body = await response.json() as { caminho?: string; mensagem?: string };
      if (!response.ok || !body.caminho) throw new Error(body.mensagem ?? "Não foi possível guardar a imagem");
      setMidia(body.caminho); setMensagem("Imagem guardada na biblioteca privada.");
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Falha ao guardar imagem"); }
    finally { setEnviandoMidia(false); }
  };

  const enviar = async (agendadoPara: string) => {
    if (!contaId || !midia || !legenda.trim()) { setErro("Escolha uma conta, uma imagem e escreva a legenda."); return; }
    setPublicando(true); setErro(""); setMensagem("");
    try {
      const response = await fetch("/api/operacao/marketing/instagram/publicacoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conta_id: contaId, midia, legenda: legenda.trim(), agendado_para: agendadoPara, chave_idempotencia: crypto.randomUUID() }),
      });
      const body = await response.json() as { mensagem?: string; status?: string };
      if (!response.ok) throw new Error(body.mensagem ?? "Não foi possível criar a publicação");
      setMensagem(body.status === "preparando" ? "Publicação enfileirada. A Meta ainda precisa processar a imagem." : "Publicação agendada; o worker fará o envio no horário escolhido.");
      setAba("resultados"); setMidia(""); setLegenda(""); await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Falha ao agendar publicação"); }
    finally { setPublicando(false); }
  };

  const conectar = () => { window.location.assign("/api/operacao/marketing/instagram/oauth/iniciar"); };
  const abasInstagram: { id: "feed" | "stories" | "criar" | "resultados"; titulo: string }[] = [
    { id: "feed", titulo: "Feed" },
    { id: "stories", titulo: "Stories" },
  ];
  if (contas.length) abasInstagram.push({ id: "criar", titulo: "Criar publicação" }, { id: "resultados", titulo: "Resultados" });

  return <div className="mx-auto flex min-h-[65dvh] max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/30">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><Camera className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate font-title-md">Instagram</h2><p className="text-xs text-on-surface-variant">Feed e Stories da sessão do navegador</p></div></div>
      <div className="flex items-center gap-2">
        {!!contas.length && <select aria-label="Conta Instagram" className="max-w-40 rounded-lg bg-surface-container px-2 py-2 text-sm" value={contaId} onChange={(e) => setContaId(e.target.value)}>{contas.map((item) => <option key={item.id} value={item.id}>@{item.username}</option>)}</select>}
        <button type="button" aria-label="Atualizar Instagram" className={`${acao} bg-surface-container text-on-surface`} onClick={() => { void carregar(); void atualizarBrowser(); }}><RefreshCw className={`h-4 w-4 ${carregando || carregandoBrowser ? "animate-spin" : ""}`} /></button>
        {gestor && configurado && <button type="button" onClick={conectar} className={`${acao} bg-primary text-on-primary`}><Plus className="h-4 w-4" />Conectar API</button>}
      </div>
    </header>
    {instagramBrowser?.perfil.username && <div className="flex items-center gap-3 border-b border-outline-variant/20 px-4 py-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-tertiary-container text-on-tertiary-container">{instagramBrowser.perfil.foto ? <img src={instagramBrowser.perfil.foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</span><div className="min-w-0 flex-1"><strong className="block truncate">@{instagramBrowser.perfil.username}</strong><span className="text-xs text-on-surface-variant">Sessão ativa neste navegador · feed e Stories dos perfis seguidos</span></div></div>}
    {conta && <div className="flex items-center gap-3 border-b border-outline-variant/20 px-4 py-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-tertiary-container text-on-tertiary-container"><UserRound className="h-6 w-6" /></span><div className="min-w-0 flex-1"><strong className="block truncate">@{feed?.perfil.username ?? conta.username}</strong><span className="text-xs text-on-surface-variant">{feed?.perfil.account_type ?? conta.account_type} · {feed?.perfil.media_count ?? "—"} publicações</span>{conta.last_error && <span className="mt-1 block text-xs text-error">{conta.last_error}</span>}</div><a href={`https://www.instagram.com/${encodeURIComponent(conta.username)}/`} target="_blank" rel="noreferrer" aria-label="Abrir Instagram" className="rounded-lg p-2 text-primary hover:bg-surface-container"><ExternalLink className="h-4 w-4" /></a></div>}
    <nav aria-label="Instagram" className="flex gap-1 border-b border-outline-variant/20 px-3 py-2">
      {abasInstagram.map(({ id, titulo }) => <button key={id} type="button" aria-current={aba === id ? "page" : undefined} onClick={() => setAba(id)} className={`rounded-lg px-3 py-2 text-sm ${aba === id ? "bg-primary-container font-semibold text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container"}`}>{titulo}</button>)}
    </nav>

    {(erro || mensagem) && <div className="px-4 pt-3">{erro && <p role="alert" className="flex gap-2 rounded-xl bg-error-container p-3 text-sm text-on-error-container"><CircleAlert className="h-4 w-4 shrink-0" />{erro}</p>}{mensagem && <p role="status" className="mt-2 flex gap-2 rounded-xl bg-tertiary-container p-3 text-sm text-on-tertiary-container"><CheckCircle2 className="h-4 w-4 shrink-0" />{mensagem}</p>}</div>}
    {erroBrowser && <p role="alert" className="mx-4 mt-3 rounded-xl bg-error-container p-3 text-sm text-on-error-container">{erroBrowser}</p>}

    {!contas.length && !sessaoInstagram && <div className="m-auto max-w-lg p-6 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-container text-primary"><Settings2 className="h-6 w-6" /></span>
      <h3 className="mt-4 font-title-lg">{bridgeInstalada ? "Entre no Instagram para carregar seu feed" : "Ative o feed do Instagram nesta página"}</h3>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">A central pode mostrar feed e Stories dos perfis que você segue usando a sessão já aberta no navegador. A senha fica no Instagram; a página Cecchin não recebe nem guarda cookies.</p>
      <div className="mt-4 rounded-xl bg-surface-container p-4 text-left"><p className="font-label-md">{bridgeInstalada ? "Sessão não encontrada" : "Instale a ponte local do navegador"}</p><p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{bridgeInstalada ? "Abra Instagram.com, faça login normalmente, volte a esta página e toque em atualizar." : "Brave/Chrome: abra brave://extensions (ou chrome://extensions), habilite o modo do desenvolvedor e escolha Carregar sem compactação."}</p><p className="mt-2 break-all font-mono text-xs">{bridgeInstalada ? "" : "C:\\Users\\josh\\Desktop\\Nicolas\\cecchin-pizzas\\browser-extension\\instagram-bridge"}</p><div className="mt-3 flex flex-wrap gap-2"><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className={`${acao} bg-primary text-on-primary`}><ExternalLink className="h-4 w-4" />Abrir Instagram</a><button type="button" onClick={() => void atualizarBrowser()} className={`${acao} bg-surface-container-high text-on-surface`}><RefreshCw className="h-4 w-4" />Verificar sessão</button></div></div>
      {!bridgeInstalada && !erroBrowser && carregandoBrowser && <p className="mt-3 text-xs text-on-surface-variant">Procurando a extensão local…</p>}
    </div>}

    {sessaoInstagram && aba === "feed" && <div className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mb-3 flex gap-3 overflow-x-auto pb-2">{instagramBrowser?.stories.map((story) => <button key={story.id} type="button" onClick={() => void abrirStory(story)} className="grid w-16 shrink-0 justify-items-center gap-1 text-center"><span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-surface-container ring-2 ring-primary">{story.foto ? <img src={story.foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</span><span className="w-full truncate text-[10px]">{story.username}</span></button>)}</div>
      {carregandoBrowser && !instagramBrowser && <p className="py-12 text-center text-sm text-on-surface-variant">Carregando feed e Stories…</p>}
      <div className="mx-auto max-w-xl space-y-4">{instagramBrowser?.feed.map((post) => <article key={post.id} className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest"><header className="flex items-center gap-2 p-3"><span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-surface-container">{post.fotoPerfil ? <img src={post.fotoPerfil} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{post.username}</strong><span className="text-[10px] text-on-surface-variant">{dataHora(post.timestamp)}</span></div>{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" aria-label="Abrir publicação no Instagram" className="p-2 text-primary"><ExternalLink className="h-4 w-4" /></a>}</header>{post.assets?.length ? <div className="flex snap-x snap-mandatory overflow-x-auto" aria-label={`Carrossel de ${post.assets.length} mídias`}>{post.assets.map((asset, index) => <div key={`${post.id}-${index}`} className="grid min-w-full snap-center place-items-center bg-black">{asset.tipo === "video" ? <video src={asset.urlMidia} controls playsInline className="max-h-[34rem] w-full object-contain" /> : <img src={asset.urlMidia} alt={`${post.legenda.slice(0, 80) || `Publicação de ${post.username}`} · ${index + 1} de ${post.assets?.length}`} loading="lazy" className="max-h-[34rem] w-full object-contain" />}</div>)}</div> : post.urlMidia && (post.tipo === "video" ? <video src={post.urlMidia} poster={post.miniatura ?? undefined} controls playsInline className="max-h-[34rem] w-full bg-black object-contain" /> : <img src={post.urlMidia} alt={post.legenda.slice(0, 100) || `Publicação de ${post.username}`} loading="lazy" className="max-h-[34rem] w-full bg-black object-contain" />)}<div className="p-3"><p className="text-xs text-on-surface-variant">{post.likes.toLocaleString("pt-BR")} curtidas · {post.comentarios.toLocaleString("pt-BR")} comentários {Boolean(post.assets?.length) && <span>· {post.assets.length} mídias, deslize para ver</span>}</p>{post.legenda && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>{post.username} </strong>{post.legenda}</p>}</div></article>)}{instagramBrowser && !instagramBrowser.feed.length && <p className="rounded-xl bg-surface-container p-6 text-center text-sm text-on-surface-variant">O Instagram não retornou publicações para este feed.</p>}</div>
      {!instagramBrowser && !carregandoBrowser && <button type="button" onClick={() => void atualizarBrowser()} className={`${acao} mx-auto mt-4 bg-surface-container text-on-surface`}><RefreshCw className="h-4 w-4" />Carregar feed</button>}
    </div>}

    {sessaoInstagram && aba === "stories" && <div className="min-h-0 flex-1 overflow-y-auto p-4"><h3 className="mb-3 font-title-md">Stories recentes dos perfis seguidos</h3><div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{instagramBrowser?.stories.map((story) => <button key={story.id} type="button" onClick={() => void abrirStory(story)} className="rounded-xl bg-surface-container p-3 text-center hover:ring-2 hover:ring-primary"><span className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-surface-container-high ring-2 ring-primary">{story.foto ? <img src={story.foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</span><strong className="mt-2 block truncate text-xs">@{story.username}</strong><span className="mt-1 block text-[10px] text-on-surface-variant">{dataHora(story.atualizadoEm)}</span></button>)}</div>{!instagramBrowser?.stories.length && <p className="py-12 text-center text-sm text-on-surface-variant">Nenhum Story ativo foi retornado pela bandeja do Instagram.</p>}</div>}

    {!!contas.length && !sessaoInstagram && aba === "stories" && <div className="min-h-0 flex-1 overflow-y-auto p-4"><h3 className="font-title-md">Stories da conta conectada</h3><p className="mt-1 text-xs text-on-surface-variant">Para ver também os Stories dos perfis que você segue, ative a sessão do navegador.</p>{feed?.storiesDisponiveis && !!feed.stories.length ? <div className="mt-4 grid grid-cols-3 gap-3">{feed.stories.map((story) => <a key={story.id} href={story.permalink ?? "https://www.instagram.com/"} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-surface-container"><div className="aspect-[9/16] bg-black">{story.media_url && <img src={story.media_url} alt="Story da conta conectada" className="h-full w-full object-contain" />}</div><p className="p-2 text-[10px] text-on-surface-variant">{dataHora(story.timestamp)}</p></a>)}</div> : <p className="py-12 text-center text-sm text-on-surface-variant">A API oficial não retornou Stories para esta conta.</p>}</div>}

    {storiesVistos.length > 0 && <div role="dialog" aria-modal="true" aria-label="Visualizador de Stories" className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4"><button type="button" onClick={() => setStoriesVistos([])} className="absolute right-5 top-5 rounded-lg bg-white/15 px-4 py-2 text-white">Fechar</button><button type="button" aria-label="Story anterior" onClick={() => setStoryAtual((v) => Math.max(0, v - 1))} className="absolute left-4 rounded-full bg-white/15 p-3 text-white">‹</button><div className="relative flex max-h-[88dvh] w-full max-w-md flex-col items-center"><div className="mb-2 w-full truncate text-center text-sm text-white">{storiesVistos[storyAtual]?.username}</div>{storiesVistos[storyAtual]?.tipo === "video" ? <video src={storiesVistos[storyAtual]?.urlMidia ?? undefined} controls autoPlay playsInline className="max-h-[80dvh] w-full rounded-2xl bg-black object-contain" /> : <img src={storiesVistos[storyAtual]?.urlMidia ?? ""} alt="Story do Instagram" className="max-h-[80dvh] rounded-2xl object-contain" />}</div><button type="button" aria-label="Próximo Story" onClick={() => setStoryAtual((v) => Math.min(storiesVistos.length - 1, v + 1))} className="absolute right-4 rounded-full bg-white/15 p-3 text-white">›</button></div>}

    {!!contas.length && !sessaoInstagram && aba === "feed" && <div className="min-h-0 flex-1 overflow-y-auto">
      {feed?.storiesDisponiveis && !!feed.stories.length && <section className="border-b border-outline-variant/20 p-4"><h3 className="mb-3 font-label-md">Stories ativos da conta</h3><div className="flex gap-3 overflow-x-auto">{feed.stories.map((story) => <div key={story.id} className="w-24 shrink-0"><div className="aspect-[9/16] overflow-hidden rounded-xl bg-surface-container">{story.media_url && <img src={story.media_url} alt="Story da conta conectada" className="h-full w-full object-cover" />}</div><p className="mt-1 text-[10px] text-on-surface-variant">{dataHora(story.timestamp)}</p></div>)}</div></section>}
      {feed && !feed.storiesDisponiveis && <p className="mx-4 mt-3 rounded-lg bg-surface-container p-2 text-xs text-on-surface-variant">A API não liberou stories para esta conta ou permissão; o feed continua disponível.</p>}
      <section className="p-3"><div className="mb-3 flex items-center justify-between"><h3 className="font-label-md">Publicações recentes</h3><span className="text-xs text-on-surface-variant">{feed?.publicacoes.length ?? 0}</span></div>{!feed && !erro && <p className="py-12 text-center text-sm text-on-surface-variant">Carregando feed autorizado…</p>}{feed && !feed.publicacoes.length && <p className="py-12 text-center text-sm text-on-surface-variant">A API não retornou publicações para esta conta.</p>}<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{feed?.publicacoes.map((post) => <a key={post.id} href={post.permalink ?? "https://www.instagram.com/"} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl bg-surface-container hover:ring-2 hover:ring-primary">{(post.thumbnail_url || post.media_url) ? <img src={post.thumbnail_url ?? post.media_url} alt={post.caption?.slice(0, 100) || "Publicação Instagram"} loading="lazy" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-xs text-on-surface-variant">Mídia indisponível pela API</div>}<div className="p-2"><p className="line-clamp-2 text-xs">{post.caption || post.media_type}</p><p className="mt-1 text-[10px] text-on-surface-variant">{dataHora(post.timestamp)}</p></div></a>)}</div></section>
    </div>}

    {!!contas.length && aba === "criar" && <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      <div><h3 className="font-title-md">Publicar no feed</h3><p className="mt-1 text-xs text-on-surface-variant">Primeira etapa: uma imagem por publicação. O agendamento só é confirmado pela Meta após o processamento assíncrono.</p></div>
      <label className="block text-sm">Imagem do feed<input type="file" accept="image/jpeg,image/png,image/webp" className={`${campo} mt-1`} onChange={(e) => void anexar(e.target.files?.[0])} disabled={enviandoMidia} /></label>
      {midia && <div className="flex items-center gap-3 rounded-xl bg-surface-container p-2"><img src={`/api/operacao/marketing/midia?caminho=${encodeURIComponent(midia)}`} alt="Prévia da imagem escolhida" className="h-20 w-20 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-xs">Imagem na biblioteca privada</span><button type="button" className="text-xs text-error" onClick={() => setMidia("")}>Remover</button></div>}
      <label className="block text-sm">Legenda<textarea maxLength={2200} rows={4} className={`${campo} mt-1 resize-y`} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Escreva a legenda da publicação" /><span className="mt-1 block text-right text-[10px] text-on-surface-variant">{legenda.length}/2200</span></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} />Agendar para outro horário</label>
      {agendar && <label className="block max-w-sm text-sm">Data e hora em São Paulo<input type="datetime-local" className={`${campo} mt-1`} value={horario} onChange={(e) => setHorario(e.target.value)} /></label>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={publicando || enviandoMidia || !midia || !legenda.trim() || !conta || conta.status !== "connected"} onClick={() => { try { const iso = agendar ? horarioSaoPauloParaIso(horario) : new Date().toISOString(); if (agendar && Date.parse(iso) <= Date.now()) throw new Error("Escolha um horário futuro."); void enviar(iso); } catch (falha) { setErro(falha instanceof Error ? falha.message : "Horário inválido"); } }} className={`${acao} bg-primary text-on-primary`}><Send className="h-4 w-4" />{publicando ? "Enfileirando…" : agendar ? "Agendar publicação" : "Publicar agora"}</button><span className="self-center text-xs text-on-surface-variant">Máximo de 25 publicações API a cada 24 horas.</span></div>
      {conta?.status !== "connected" && <p className="text-sm text-error">Reconecte esta conta antes de publicar.</p>}
    </div>}

    {!!contas.length && aba === "resultados" && <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-title-md">Fila e resultados</h3><p className="mt-1 text-xs text-on-surface-variant">Estados vêm da fila e da confirmação de publicação da Meta.</p></div><CalendarClock className="h-5 w-5 text-primary" /></div><div className="space-y-2">{publicacoes.map((item) => <article key={item.id} className="rounded-xl bg-surface-container p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-label-md">@{item.username} · {item.formato}</p><p className="mt-1 text-sm">{item.legenda || "Sem legenda"}</p></div><span className={`rounded-full px-2 py-1 text-xs ${item.status === "falhou" ? "bg-error-container text-on-error-container" : item.status === "publicado" ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-primary-container"}`}>{estados[item.status] ?? item.status}</span></div><p className="mt-2 text-xs text-on-surface-variant">{item.status === "publicado" ? `Publicado ${dataHora(item.publicado_em)}` : `Programado ${dataHora(item.agendado_para)}`} · {item.tentativas} tentativas</p>{item.erro && <p className="mt-2 text-xs text-error">{item.erro}</p>}{item.permalink && <a href={item.permalink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline">Ver no Instagram <ExternalLink className="h-3 w-3" /></a>}</article>)}{!publicacoes.length && <p className="rounded-xl bg-surface-container p-5 text-center text-sm text-on-surface-variant">Nenhuma publicação na fila desta central.</p>}</div></div>}

    <footer className="border-t border-outline-variant/20 px-4 py-2 text-[10px] leading-relaxed text-on-surface-variant">Feed e Stories: sessão já aberta no navegador, sem enviar senha ou cookies ao Cecchin. Publicação automática continua disponível via API Meta quando uma conta profissional estiver conectada.</footer>
  </div>;
}
