"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Camera, CheckCircle2, CircleAlert, ExternalLink, Plus, RefreshCw, Send, Settings2, UserRound } from "lucide-react";
import { horarioSaoPauloParaIso } from "@/src/lib/agenda-marketing-data";

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
  const [aba, setAba] = useState<"feed" | "criar" | "resultados">("feed");
  const [legenda, setLegenda] = useState("");
  const [midia, setMidia] = useState("");
  const [agendar, setAgendar] = useState(false);
  const [horario, setHorario] = useState(dataHoraLocalFutura);
  const [carregando, setCarregando] = useState(true);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

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

  useEffect(() => { void carregar(); }, [carregar]);
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

  return <div className="mx-auto flex min-h-[65dvh] max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/30">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><Camera className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate font-title-md">Instagram</h2><p className="text-xs text-on-surface-variant">Conta profissional · dados oficiais</p></div></div>
      <div className="flex items-center gap-2">
        {!!contas.length && <select aria-label="Conta Instagram" className="max-w-40 rounded-lg bg-surface-container px-2 py-2 text-sm" value={contaId} onChange={(e) => setContaId(e.target.value)}>{contas.map((item) => <option key={item.id} value={item.id}>@{item.username}</option>)}</select>}
        <button type="button" aria-label="Atualizar Instagram" className={`${acao} bg-surface-container text-on-surface`} onClick={() => void carregar()}><RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /></button>
        {gestor && <button type="button" onClick={conectar} disabled={!configurado} className={`${acao} bg-primary text-on-primary`}><Plus className="h-4 w-4" />Conectar</button>}
      </div>
    </header>
    {conta && <div className="flex items-center gap-3 border-b border-outline-variant/20 px-4 py-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-tertiary-container text-on-tertiary-container"><UserRound className="h-6 w-6" /></span><div className="min-w-0 flex-1"><strong className="block truncate">@{feed?.perfil.username ?? conta.username}</strong><span className="text-xs text-on-surface-variant">{feed?.perfil.account_type ?? conta.account_type} · {feed?.perfil.media_count ?? "—"} publicações</span>{conta.last_error && <span className="mt-1 block text-xs text-error">{conta.last_error}</span>}</div><a href={`https://www.instagram.com/${encodeURIComponent(conta.username)}/`} target="_blank" rel="noreferrer" aria-label="Abrir Instagram" className="rounded-lg p-2 text-primary hover:bg-surface-container"><ExternalLink className="h-4 w-4" /></a></div>}
    <nav aria-label="Instagram" className="flex gap-1 border-b border-outline-variant/20 px-3 py-2">
      {([["feed", "Feed"], ["criar", "Criar publicação"], ["resultados", "Resultados"]] as const).map(([id, titulo]) => <button key={id} type="button" aria-current={aba === id ? "page" : undefined} onClick={() => setAba(id)} className={`rounded-lg px-3 py-2 text-sm ${aba === id ? "bg-primary-container font-semibold text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container"}`}>{titulo}</button>)}
    </nav>

    {(erro || mensagem) && <div className="px-4 pt-3">{erro && <p role="alert" className="flex gap-2 rounded-xl bg-error-container p-3 text-sm text-on-error-container"><CircleAlert className="h-4 w-4 shrink-0" />{erro}</p>}{mensagem && <p role="status" className="mt-2 flex gap-2 rounded-xl bg-tertiary-container p-3 text-sm text-on-tertiary-container"><CheckCircle2 className="h-4 w-4 shrink-0" />{mensagem}</p>}</div>}

    {!contas.length && <div className="m-auto max-w-lg p-6 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-container text-primary"><Settings2 className="h-6 w-6" /></span>
      <h3 className="mt-4 font-title-lg">Conecte uma conta profissional</h3>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">O login passa pelo OAuth oficial do Instagram. Nenhuma senha é pedida neste app. Contas pessoais não são aceitas pela API.</p>
      {configurado ? gestor ? <button type="button" onClick={conectar} className={`${acao} mt-4 bg-primary text-on-primary`}><Plus className="h-4 w-4" />Conectar conta</button> : <p className="mt-4 text-sm">Peça à gestão para conectar uma conta profissional.</p> : <div className="mt-4 rounded-xl bg-surface-container p-4 text-left"><p className="font-label-md">Configuração do servidor pendente</p><p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Defina as variáveis Meta no servidor e registre a URL de callback HTTPS no painel do app. A UI não iniciará OAuth sem isso.</p><p className="mt-2 break-words font-mono text-[10px] text-on-surface-variant">{faltando.join(" · ")}</p></div>}
    </div>}

    {!!contas.length && aba === "feed" && <div className="min-h-0 flex-1 overflow-y-auto">
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

    <footer className="border-t border-outline-variant/20 px-4 py-2 text-[10px] leading-relaxed text-on-surface-variant">API oficial: contas Business/Creator. Stories de concorrentes, rascunhos, comentários e mensagens não são reproduzidos aqui. Reels, carrossel e Stories ainda não estão habilitados.</footer>
  </div>;
}
