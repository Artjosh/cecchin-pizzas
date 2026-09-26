"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, Camera, CheckCircle2, CircleAlert, ExternalLink, Heart, MessageCircle, Plus, RefreshCw, Send, Settings2, UserRound } from "lucide-react";
import { horarioSaoPauloParaIso } from "@/src/lib/agenda-marketing-data";
import { instagramViaNavegador, type InstagramBrowserComment, type InstagramBrowserHome, type InstagramBrowserItem, type InstagramBrowserProfile, type InstagramBrowserStory } from "@/src/servidor/instagram/navegador";

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

function urlPerfilInstagram(username?: string | null) {
  return username ? `https://www.instagram.com/${encodeURIComponent(username)}/` : "https://www.instagram.com/";
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
  const [storyConta, setStoryConta] = useState(0);
  const [progressoStory, setProgressoStory] = useState(0);
  const avancandoStoryRef = useRef(false);
  const videoStoryRef = useRef<HTMLVideoElement>(null);
  const [erroBrowser, setErroBrowser] = useState("");
  const [carregandoBrowser, setCarregandoBrowser] = useState(false);
  const [perfilAtual, setPerfilAtual] = useState<InstagramBrowserProfile | null>(null);
  const [perfilParcial, setPerfilParcial] = useState(false);
  const [carregandoMaisPerfil, setCarregandoMaisPerfil] = useState(false);
  const [respostaComentario, setRespostaComentario] = useState<InstagramBrowserComment | null>(null);
  const [textoStory, setTextoStory] = useState("");
  const [enviandoStory, setEnviandoStory] = useState(false);
  const [curtindoStory, setCurtindoStory] = useState(false);
  const [mensagemStory, setMensagemStory] = useState("");
  const [compondoStory, setCompondoStory] = useState(false);
  const [comentariosPost, setComentariosPost] = useState<InstagramBrowserItem | null>(null);
  const [listaComentarios, setListaComentarios] = useState<InstagramBrowserComment[]>([]);
  const [textoComentario, setTextoComentario] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);
  const [carregandoComentarios, setCarregandoComentarios] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [curtidasPendentes, setCurtidasPendentes] = useState<string[]>([]);
  const curtidasEmAndamento = useRef(new Set<string>());
  const fotosConsultadasRef = useRef(new Set<string>());
  const faixaStoriesRef = useRef<HTMLDivElement>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const audioFeedRef = useRef({ muted: false, volume: 1 });
  const audioAutoplayPendenteRef = useRef(false);
  const volumeAutomaticoRef = useRef(new WeakSet<HTMLVideoElement>());
  const registrarVideoFeed = (video: HTMLVideoElement | null) => {
    if (!video) return;
    video.muted = audioFeedRef.current.muted;
    video.volume = audioFeedRef.current.volume;
  };
  const mudarAudioFeed = (video: HTMLVideoElement) => {
    if (volumeAutomaticoRef.current.has(video)) { volumeAutomaticoRef.current.delete(video); return; }
    audioAutoplayPendenteRef.current = false;
    audioFeedRef.current = { muted: video.muted, volume: video.volume };
    feedScrollRef.current?.querySelectorAll<HTMLVideoElement>('video[data-feed-video]').forEach((outro) => {
      if (outro === video) return;
      outro.muted = video.muted;
      outro.volume = video.volume;
    });
  };

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
    const raiz = feedScrollRef.current;
    if (!raiz || aba !== "feed" || perfilAtual) return;
    const videos = [...raiz.querySelectorAll<HTMLVideoElement>('video[data-feed-video]')];
    const proporcoes = new Map<HTMLVideoElement, number>();
    const tentativas = new WeakSet<HTMLVideoElement>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) proporcoes.set(entry.target as HTMLVideoElement, entry.intersectionRatio);
      const atual = document.visibilityState === "visible"
        ? videos.reduce<HTMLVideoElement | null>((melhor, video) =>
            (proporcoes.get(video) ?? 0) >= 0.25 && (proporcoes.get(video) ?? 0) > (melhor ? proporcoes.get(melhor) ?? 0 : 0) ? video : melhor, null)
        : null;
      for (const video of videos) {
        if (video === atual) {
          if (video.paused && !tentativas.has(video)) {
            tentativas.add(video);
            void video.play().catch(async () => {
              if (audioFeedRef.current.muted || video !== atual) return;
              volumeAutomaticoRef.current.add(video);
              video.muted = true;
              audioAutoplayPendenteRef.current = true;
              await video.play().catch(() => {});
            }).finally(() => tentativas.delete(video));
          }
        } else video.pause();
      }
    }, { root: raiz, threshold: [0, 0.25, 0.5, 0.75, 1] });
    videos.forEach((video) => observer.observe(video));
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "hidden") videos.forEach((video) => video.pause());
    };
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", aoMudarVisibilidade); videos.forEach((video) => video.pause()); };
  }, [aba, perfilAtual, instagramBrowser?.feed]);
  useEffect(() => {
    const ativarAudio = () => {
      if (!audioAutoplayPendenteRef.current || audioFeedRef.current.muted) return;
      audioAutoplayPendenteRef.current = false;
      feedScrollRef.current?.querySelectorAll<HTMLVideoElement>('video[data-feed-video]').forEach((video) => {
        if (!video.muted) return;
        volumeAutomaticoRef.current.add(video);
        video.muted = false;
      });
    };
    window.addEventListener("pointerdown", ativarAudio);
    window.addEventListener("keydown", ativarAudio);
    return () => { window.removeEventListener("pointerdown", ativarAudio); window.removeEventListener("keydown", ativarAudio); };
  }, []);
  useEffect(() => {
    const faixa = faixaStoriesRef.current;
    if (!faixa) return;
    const aoRolar = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      const podeMover = event.deltaY < 0 ? faixa.scrollLeft > 0 : faixa.scrollLeft + faixa.clientWidth < faixa.scrollWidth - 1;
      if (!podeMover) return;
      event.preventDefault();
      event.stopPropagation();
      faixa.scrollLeft += event.deltaY;
    };
    faixa.addEventListener("wheel", aoRolar, { passive: false });
    return () => faixa.removeEventListener("wheel", aoRolar);
  }, [aba, instagramBrowser?.stories.length, sessaoInstagram]);
  const mudarStory = async (direcao: 1 | -1) => {
    if (avancandoStoryRef.current || !storiesVistos.length) return;
    setTextoStory(""); setMensagemStory(""); setCompondoStory(false);
    const indice = storyAtual + direcao;
    if (indice >= 0 && indice < storiesVistos.length) { setStoryAtual(indice); setProgressoStory(0); return; }
    const contasStory = instagramBrowser?.stories ?? [];
    const proximaConta = storyConta + direcao;
    if (proximaConta < 0) { setStoryAtual(0); setProgressoStory(0); return; }
    if (proximaConta >= contasStory.length) { setStoriesVistos([]); return; }
    avancandoStoryRef.current = true;
    try {
      const conta = contasStory[proximaConta];
      const resultado = await instagramViaNavegador<{ stories: InstagramBrowserItem[] }>("story", { userId: conta.id, username: conta.username, foto: conta.foto ?? "" });
      setStoryConta(proximaConta);
      setStoriesVistos(resultado.stories);
      setStoryAtual(direcao === 1 ? 0 : Math.max(0, resultado.stories.length - 1));
      setProgressoStory(0);
      if (!resultado.stories.length) setErroBrowser(`Nenhum Story ativo de @${conta.username}.`);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível abrir o próximo Story."); }
    finally { avancandoStoryRef.current = false; }
  };
  useEffect(() => {
    if (!storiesVistos.length) return;
    const teclado = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setStoriesVistos([]); return; }
      if (event.key === "ArrowRight") void mudarStory(1);
      if (event.key === "ArrowLeft") void mudarStory(-1);
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [storiesVistos, storyAtual, storyConta, instagramBrowser?.stories]);
  useEffect(() => {
    if (!storiesVistos.length || storiesVistos[storyAtual]?.tipo === "video" || compondoStory) return;
    const inicio = performance.now();
    const timer = window.setInterval(() => {
      const progresso = Math.min(1, (performance.now() - inicio) / 5000);
      setProgressoStory(progresso);
      if (progresso >= 1) { window.clearInterval(timer); void mudarStory(1); }
    }, 50);
    return () => window.clearInterval(timer);
  }, [storiesVistos, storyAtual, storyConta, compondoStory]);
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
  const usuarioVisivel = instagramBrowser?.perfil.username ?? feed?.perfil.username ?? conta?.username ?? "";

  const abrirStory = async (story: InstagramBrowserStory) => {
    setErroBrowser(""); setErro(""); setMensagem(""); setMensagemStory(""); setTextoStory(""); setCarregandoBrowser(true);
    try {
      const resultado = await instagramViaNavegador<{ stories: InstagramBrowserItem[] }>("story", { userId: story.id, username: story.username, foto: story.foto ?? "" });
      if (!resultado.stories.length) throw new Error(`Não encontrei mídia ativa nos Stories de @${story.username}. Atualize a bandeja e tente novamente.`);
      setStoryConta(Math.max(0, instagramBrowser?.stories.findIndex((item) => item.id === story.id) ?? 0));
      setStoriesVistos(resultado.stories); setStoryAtual(0); setProgressoStory(0);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível abrir este Story."); }
    finally { setCarregandoBrowser(false); }
  };

  const abrirPerfil = async (item: Pick<InstagramBrowserItem, "userId" | "username">) => {
    if (!item.userId && !item.username) { setErroBrowser("O Instagram n?o retornou o identificador deste perfil."); return; }
    const postsConhecidos = instagramBrowser?.feed.filter((post) => post.userId === item.userId || post.username === item.username) ?? [];
    const primeiro = postsConhecidos[0];
    setStoriesVistos([]);
    setComentariosPost(null);
    setAba("feed");
    setErroBrowser("");
    setPerfilParcial(true);
    setPerfilAtual({ id: item.userId ?? "", username: item.username, nome: primeiro?.nome ?? item.username,
      foto: primeiro?.fotoPerfil ?? null, biografia: "", mediaCount: null,
      followers: null, following: null, feed: postsConhecidos, cursor: null, hasMore: false });
    setCarregandoPerfil(true);
    feedScrollRef.current?.scrollTo({ top: 0 });
    try {
      const resultado = await instagramViaNavegador<{ perfil: InstagramBrowserProfile; parcial?: boolean }>("profile", { userId: item.userId ?? "", username: item.username });
      setPerfilParcial(Boolean(resultado.parcial));
      setPerfilAtual((atual) => atual?.username === item.username ? { ...resultado.perfil,
        nome: resultado.perfil.nome || atual.nome, foto: resultado.perfil.foto || atual.foto,
        feed: resultado.perfil.feed.length ? resultado.perfil.feed : postsConhecidos } : atual);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "N?o foi poss?vel completar este perfil."); }
    finally { setCarregandoPerfil(false); }
  };

  const abrirComentarios = async (post: InstagramBrowserItem) => {
    setComentariosPost(post); setListaComentarios([]); setTextoComentario(""); setRespostaComentario(null); setErroBrowser(""); setCarregandoComentarios(true);
    try {
      const resultado = await instagramViaNavegador<{ comments: InstagramBrowserComment[] }>("comments", { mediaId: post.id });
      setListaComentarios(resultado.comments);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível carregar os comentários."); }
    finally { setCarregandoComentarios(false); }
  };

  const enviarComentarioInstagram = async () => {
    if (!comentariosPost || !textoComentario.trim() || enviandoComentario) return;
    setEnviandoComentario(true); setErroBrowser("");
    try {
      const resultado = await instagramViaNavegador<{ comment: InstagramBrowserComment }>("comment", { mediaId: comentariosPost.id, text: textoComentario.trim(), ...(respostaComentario ? { replyToCommentId: respostaComentario.id } : {}) });
      setListaComentarios((atuais) => respostaComentario ? atuais.map((item) => item.id === respostaComentario.id ? { ...item, replies: [...(item.replies ?? []), resultado.comment] } : item) : [...atuais, resultado.comment]);
      setTextoComentario(""); setRespostaComentario(null);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível enviar o comentário."); }
    finally { setEnviandoComentario(false); }
  };

  const alternarCurtida = async (post: InstagramBrowserItem) => {
    if (curtidasEmAndamento.current.has(post.id)) return;
    curtidasEmAndamento.current.add(post.id);
    setCurtidasPendentes((atuais) => [...atuais, post.id]);
    setErroBrowser("");
    try {
      const resultado = await instagramViaNavegador<{ liked: boolean }>(post.gostei ? "unlike" : "like", { mediaId: post.id, permalink: post.permalink });
      setInstagramBrowser((atual) => atual ? ({ ...atual, feed: atual.feed.map((item) => item.id === post.id ? { ...item, gostei: resultado.liked, likes: Math.max(0, item.likes + (resultado.liked ? 1 : -1)) } : item) }) : atual);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "N?o foi poss?vel atualizar a curtida."); }
    finally { curtidasEmAndamento.current.delete(post.id); setCurtidasPendentes((atuais) => atuais.filter((id) => id !== post.id)); }
  };

  const renovarFotoFeed = async (post: InstagramBrowserItem) => {
    if (!post.userId || fotosConsultadasRef.current.has(post.userId)) return;
    fotosConsultadasRef.current.add(post.userId);
    try {
      const resultado = await instagramViaNavegador<{ foto: string | null }>("avatar", { userId: post.userId });
      if (resultado.foto && resultado.foto !== post.fotoPerfil) {
        setInstagramBrowser((atual) => atual ? { ...atual, feed: atual.feed.map((item) => item.userId === post.userId ? { ...item, fotoPerfil: resultado.foto } : item) } : atual);
      }
    } catch { /* manter avatar alternativo se o Instagram limitar a consulta */ }
  };

  const carregarMaisFeed = async () => {
    const cursor = instagramBrowser?.nextMaxId;
    if (!cursor || carregandoMais || perfilAtual || !sessaoInstagram) return;
    setCarregandoMais(true);
    try {
      const seenPosts = instagramBrowser?.feed.map((post) => post.id).filter((id) => /^\d+(?:_\d+)?$/.test(id)).slice(-30).join(",") ?? "";
      const pagina = await instagramViaNavegador<{ feed: InstagramBrowserItem[]; nextMaxId?: string | null; hasMore?: boolean }>("more", { cursor, seenPosts });
      setInstagramBrowser((atual) => {
        if (!atual) return atual;
        const existentes = new Set(atual.feed.map((post) => post.id));
        return { ...atual, feed: [...atual.feed, ...pagina.feed.filter((post) => !existentes.has(post.id))], nextMaxId: pagina.nextMaxId ?? null, hasMore: pagina.hasMore };
      });
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível carregar mais publicações."); }
    finally { setCarregandoMais(false); }
  };

  const carregarMaisPostsPerfil = async () => {
    const perfil = perfilAtual;
    if (!perfil?.cursor || !perfil.hasMore || carregandoMaisPerfil) return;
    setCarregandoMaisPerfil(true);
    try {
      const pagina = await instagramViaNavegador<{ feed: InstagramBrowserItem[]; cursor: string | null; hasMore: boolean }>("profile_more", { userId: perfil.id, username: perfil.username, cursor: perfil.cursor });
      setPerfilAtual((atual) => {
        if (!atual || atual.id !== perfil.id) return atual;
        const ids = new Set(atual.feed.map((post) => post.id));
        return { ...atual, feed: [...atual.feed, ...pagina.feed.filter((post) => !ids.has(post.id))], cursor: pagina.cursor, hasMore: pagina.hasMore && pagina.cursor !== perfil.cursor };
      });
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível carregar mais posts deste perfil."); }
    finally { setCarregandoMaisPerfil(false); }
  };

  const alternarCurtidaStory = async () => {
    const story = storiesVistos[storyAtual];
    if (!story || curtindoStory) return;
    setCurtindoStory(true); setErroBrowser("");
    try {
      const resultado = await instagramViaNavegador<{ liked: boolean }>(story.gostei ? "story_unlike" : "story_like", { mediaId: story.id });
      setStoriesVistos((atuais) => atuais.map((item, index) => index === storyAtual && item.id === story.id ? { ...item, gostei: resultado.liked } : item));
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível curtir este Story."); }
    finally { setCurtindoStory(false); }
  };

  const responderStory = async (texto: string, reaction = false) => {
    const story = storiesVistos[storyAtual];
    const userId = story?.userId || instagramBrowser?.stories[storyConta]?.id;
    if (!story || !userId || !texto.trim() || enviandoStory) return;
    setEnviandoStory(true); setCompondoStory(true); videoStoryRef.current?.pause(); setErroBrowser(""); setMensagemStory("");
    try {
      await instagramViaNavegador<{ sent: boolean }>("story_reply", { mediaId: story.id, userId, text: texto.trim(), reaction: reaction ? "1" : "0" });
      setTextoStory(""); setMensagemStory("Resposta enviada."); setCompondoStory(false);
    } catch (falha) { setErroBrowser(falha instanceof Error ? falha.message : "Não foi possível responder este Story."); }
    finally { setEnviandoStory(false); setCompondoStory(false); if (videoStoryRef.current?.paused) void videoStoryRef.current.play().catch(() => {}); }
  };

  const voltarDoPerfil = () => {
    setPerfilAtual(null);
    requestAnimationFrame(() => { if (faixaStoriesRef.current?.parentElement) faixaStoriesRef.current.parentElement.scrollTop = 0; });
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

  return <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/30">
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2"><a href={urlPerfilInstagram(usuarioVisivel)} target="_blank" rel="noreferrer" aria-label={usuarioVisivel ? `Abrir perfil @${usuarioVisivel} no Instagram` : "Abrir Instagram"} className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-container text-on-primary-container ring-1 ring-outline-variant/30">{instagramBrowser?.perfil.foto ? <img src={instagramBrowser.perfil.foto} alt="" className="h-full w-full object-cover" /> : usuarioVisivel ? <UserRound className="h-5 w-5" /> : <Camera className="h-5 w-5" />}</a><div className="min-w-0"><h2 className="truncate font-title-md">{usuarioVisivel ? <a href={urlPerfilInstagram(usuarioVisivel)} target="_blank" rel="noreferrer" className="hover:text-primary">@{usuarioVisivel}</a> : "Instagram"}</h2><p className="truncate text-[11px] text-on-surface-variant">{sessaoInstagram ? "Feed · Stories · perfis" : conta ? `${feed?.perfil.account_type ?? conta.account_type} · API oficial` : "Conecte a sessão para abrir o feed"}</p></div></div>
      <div className="flex items-center gap-2">
        {!!contas.length && <select aria-label="Conta Instagram" className="max-w-40 rounded-lg bg-surface-container px-2 py-2 text-sm" value={contaId} onChange={(e) => setContaId(e.target.value)}>{contas.map((item) => <option key={item.id} value={item.id}>@{item.username}</option>)}</select>}
        <button type="button" aria-label="Atualizar Instagram" className={`${acao} bg-surface-container text-on-surface`} onClick={() => { void carregar(); void atualizarBrowser(); }}><RefreshCw className={`h-4 w-4 ${carregando || carregandoBrowser ? "animate-spin" : ""}`} /></button>
        {gestor && configurado && <button type="button" onClick={conectar} className={`${acao} bg-primary text-on-primary`}><Plus className="h-4 w-4" />Conectar API</button>}
      </div>
    </header>
    <nav aria-label="Instagram" className="flex gap-1 border-b border-outline-variant/20 px-2 py-1">
      {abasInstagram.map(({ id, titulo }) => <button key={id} type="button" aria-current={aba === id ? "page" : undefined} onClick={() => setAba(id)} className={`rounded-lg px-3 py-1.5 text-sm ${aba === id ? "bg-primary-container font-semibold text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container"}`}>{titulo}</button>)}
    </nav>

    {(erro || mensagem) && <div className="shrink-0 px-4 pt-3">{erro && <p role="alert" className="flex gap-2 rounded-xl bg-error-container p-3 text-sm text-on-error-container"><CircleAlert className="h-4 w-4 shrink-0" />{erro}</p>}{mensagem && <p role="status" className="mt-2 flex gap-2 rounded-xl bg-tertiary-container p-3 text-sm text-on-tertiary-container"><CheckCircle2 className="h-4 w-4 shrink-0" />{mensagem}</p>}</div>}
    {erroBrowser && <p role="alert" className="mx-4 mt-3 shrink-0 rounded-xl bg-error-container p-3 text-sm text-on-error-container">{erroBrowser}</p>}

    {!contas.length && !sessaoInstagram && <div className="m-auto max-w-lg p-6 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface-container text-primary"><Settings2 className="h-6 w-6" /></span>
      <h3 className="mt-4 font-title-lg">{bridgeInstalada ? "Entre no Instagram para carregar seu feed" : "Ative o feed do Instagram nesta página"}</h3>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">A central pode mostrar feed e Stories dos perfis que você segue usando a sessão já aberta no navegador. A senha fica no Instagram; a página Cecchin não recebe nem guarda cookies.</p>
      <div className="mt-4 rounded-xl bg-surface-container p-4 text-left"><p className="font-label-md">{bridgeInstalada ? "Sessão não encontrada" : "Instale a ponte local do navegador"}</p><p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{bridgeInstalada ? "Abra Instagram.com, faça login normalmente, volte a esta página e toque em atualizar." : "Brave/Chrome: abra brave://extensions (ou chrome://extensions), habilite o modo do desenvolvedor e escolha Carregar sem compactação. Depois, recarregue esta aba para ativar a ponte."}</p><p className="mt-2 break-all font-mono text-xs">{bridgeInstalada ? "" : "C:\\Users\\josh\\Desktop\\Nicolas\\cecchin-pizzas\\browser-extension\\instagram-bridge"}</p><div className="mt-3 flex flex-wrap gap-2"><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className={`${acao} bg-primary text-on-primary`}><ExternalLink className="h-4 w-4" />Abrir Instagram</a><button type="button" onClick={() => void atualizarBrowser()} className={`${acao} bg-surface-container-high text-on-surface`}><RefreshCw className="h-4 w-4" />Verificar sessão</button></div></div>
      {!bridgeInstalada && !erroBrowser && carregandoBrowser && <p className="mt-3 text-xs text-on-surface-variant">Procurando a extensão local…</p>}
    </div>}

    {sessaoInstagram && aba === "feed" && <div ref={feedScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" onScroll={(event) => { const el = event.currentTarget; if (el.scrollHeight - el.scrollTop - el.clientHeight < 360) { if (perfilAtual) void carregarMaisPostsPerfil(); else void carregarMaisFeed(); } }}>
      {perfilAtual ? <section aria-label={`Perfil ${perfilAtual.username}`} className="mx-auto max-w-xl"><button type="button" onClick={voltarDoPerfil} className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-container"><ArrowLeft className="h-4 w-4" />Voltar ao feed</button><header className="mb-5 flex items-center gap-4 rounded-xl bg-surface-container p-4"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-high">{perfilAtual.foto ? <img src={perfilAtual.foto} alt={`Foto de ${perfilAtual.username}`} className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7" />}</div><div className="min-w-0 flex-1"><h3 className="truncate font-title-lg">@{perfilAtual.username}</h3><p className="text-xs text-on-surface-variant">{perfilAtual.nome}</p>{!perfilParcial && <div className="mt-2 flex flex-wrap gap-x-4 text-xs"><span><strong>{perfilAtual.mediaCount?.toLocaleString("pt-BR") ?? "?"}</strong> publicações</span><span><strong>{perfilAtual.followers?.toLocaleString("pt-BR") ?? "?"}</strong> seguidores</span><span><strong>{perfilAtual.following?.toLocaleString("pt-BR") ?? "?"}</strong> seguindo</span></div>}</div></header>{perfilAtual.biografia && <p className="mb-4 whitespace-pre-wrap px-1 text-sm">{perfilAtual.biografia}</p>}<div className="grid grid-cols-3 gap-1">{perfilAtual.feed.map((post) => <button key={post.id} type="button" onClick={() => void abrirComentarios(post)} aria-label={`Abrir comentários da publicação de ${post.username}`} className="aspect-square overflow-hidden bg-surface-container">{post.miniatura || post.urlMidia ? <img src={post.miniatura ?? post.urlMidia ?? ""} alt={post.legenda.slice(0, 80) || "Publicação do Instagram"} loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xs">Mídia indisponível</span>}</button>)}</div>{!perfilAtual.feed.length && <p className="rounded-xl bg-surface-container p-6 text-center text-sm text-on-surface-variant">Nenhuma publicação pública disponível neste perfil.</p>}{carregandoPerfil && <p role="status" className="py-5 text-center text-sm">Carregando posts do perfil...</p>}{carregandoMaisPerfil && <p role="status" className="py-5 text-center text-sm">Carregando mais posts...</p>}{perfilAtual.hasMore && !carregandoMaisPerfil && <button type="button" onClick={() => void carregarMaisPostsPerfil()} className="mx-auto mt-4 block rounded-lg px-4 py-2 text-sm hover:bg-surface-container">Carregar mais posts</button>}</section> : carregandoPerfil ? <p role="status" className="py-12 text-center text-sm text-on-surface-variant">Carregando perfil e publicações…</p> : <><div ref={faixaStoriesRef} className="mb-3 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pt-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {instagramBrowser?.stories.map((story) => <button key={story.id} type="button" onClick={() => void abrirStory(story)} className="grid w-16 shrink-0 justify-items-center gap-1 text-center"><span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-surface-container ring-2 ring-primary">{story.foto ? <img src={story.foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</span><span className="w-full truncate text-[10px]">{story.username}</span></button>)}
      </div>
      {carregandoBrowser && !instagramBrowser && <p className="py-12 text-center text-sm text-on-surface-variant">Carregando feed e Stories…</p>}
      <div className="mx-auto max-w-xl space-y-4">{instagramBrowser?.feed.map((post) => { return <article key={post.id} className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest"><header className="flex items-center gap-2 p-3">{post.username ? <button type="button" onClick={() => void abrirPerfil(post)} aria-label={`Abrir perfil @${post.username}`} className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container ring-1 ring-outline-variant/30">{post.fotoPerfil ? <img src={post.fotoPerfil} alt={`Foto de perfil de ${post.username}`} onError={() => void renovarFotoFeed(post)} loading="lazy" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5" />}</button> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container"><UserRound className="h-5 w-5" /></span>}<div className="min-w-0 flex-1"><strong className="block truncate text-sm">{post.username ? <button type="button" onClick={() => void abrirPerfil(post)} className="hover:text-primary">{post.username}</button> : post.nome}</strong><span className="text-[10px] text-on-surface-variant">{dataHora(post.timestamp)}</span></div>{post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" aria-label="Abrir publicação no Instagram" className="p-2 text-primary"><ExternalLink className="h-4 w-4" /></a>}</header>{post.assets?.length ? <div className="flex snap-x snap-mandatory overflow-x-auto" aria-label={`Carrossel de ${post.assets.length} mídias`}>{post.assets.map((asset, index) => <div key={`${post.id}-${index}`} className="grid min-w-full snap-center place-items-center bg-black">{asset.tipo === "video" ? <video data-feed-video ref={registrarVideoFeed} onVolumeChange={(event) => mudarAudioFeed(event.currentTarget)} src={asset.urlMidia} controls playsInline preload="metadata" className="max-h-[34rem] w-full object-contain" /> : <img src={asset.urlMidia} alt={`${post.legenda.slice(0, 80) || `Publicação de ${post.username}`} · ${index + 1} de ${post.assets?.length}`} loading="lazy" className="max-h-[34rem] w-full object-contain" />}</div>)}</div> : post.urlMidia && (post.tipo === "video" ? <video data-feed-video ref={registrarVideoFeed} onVolumeChange={(event) => mudarAudioFeed(event.currentTarget)} src={post.urlMidia} poster={post.miniatura ?? undefined} controls playsInline preload="metadata" className="max-h-[34rem] w-full bg-black object-contain" /> : <img src={post.urlMidia} alt={post.legenda.slice(0, 100) || `Publicação de ${post.username}`} loading="lazy" className="max-h-[34rem] w-full bg-black object-contain" />)}<div className="p-3"><div className="flex items-center justify-between"><button type="button" aria-pressed={post.gostei} aria-label={post.gostei ? "Remover curtida" : "Curtir publicação"} disabled={curtidasPendentes.includes(post.id) || !post.permalink} onClick={() => void alternarCurtida(post)} className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-container disabled:opacity-50 ${post.gostei ? "text-error" : "text-on-surface-variant"}`}><Heart className="h-5 w-5" fill={post.gostei ? "currentColor" : "none"} />{post.likes.toLocaleString("pt-BR")} curtidas</button><button type="button" onClick={() => void abrirComentarios(post)} className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-on-surface-variant hover:bg-surface-container"><MessageCircle className="h-4 w-4" />{post.comentarios.toLocaleString("pt-BR")} comentários</button></div>{post.legenda && <p className="mt-2 whitespace-pre-wrap text-sm"><strong>{post.username} </strong>{post.legenda}</p>}</div></article>; })}{instagramBrowser && !instagramBrowser.feed.length && <p className="rounded-xl bg-surface-container p-6 text-center text-sm text-on-surface-variant">O Instagram não retornou publicações para este feed.</p>}{carregandoMais && <p role="status" className="py-5 text-center text-sm text-on-surface-variant">Carregando mais publicacoes...</p>}{instagramBrowser?.hasMore === false && !!instagramBrowser.feed.length && <p className="py-5 text-center text-xs text-on-surface-variant">Voce chegou ao fim das publicacoes disponiveis.</p>}</div></>}
      {!instagramBrowser && !carregandoBrowser && <button type="button" onClick={() => void atualizarBrowser()} className={`${acao} mx-auto mt-4 bg-surface-container text-on-surface`}><RefreshCw className="h-4 w-4" />Carregar feed</button>}
    </div>}

    {sessaoInstagram && aba === "stories" && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"><h3 className="mb-3 font-title-md">Stories recentes dos perfis seguidos</h3><div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{instagramBrowser?.stories.map((story) => <button key={story.id} type="button" onClick={() => void abrirStory(story)} className="rounded-xl bg-surface-container p-3 text-center hover:ring-2 hover:ring-primary"><span className="mx-auto grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-surface-container-high ring-2 ring-primary">{story.foto ? <img src={story.foto} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6" />}</span><strong className="mt-2 block truncate text-xs">@{story.username}</strong><span className="mt-1 block text-[10px] text-on-surface-variant">{dataHora(story.atualizadoEm)}</span></button>)}</div>{!instagramBrowser?.stories.length && <p className="py-12 text-center text-sm text-on-surface-variant">Nenhum Story ativo foi retornado pela bandeja do Instagram.</p>}</div>}

    {!!contas.length && !sessaoInstagram && aba === "stories" && <div className="min-h-0 flex-1 overflow-y-auto p-4"><h3 className="font-title-md">Stories da conta conectada</h3><p className="mt-1 text-xs text-on-surface-variant">Para ver também os Stories dos perfis que você segue, ative a sessão do navegador.</p>{feed?.storiesDisponiveis && !!feed.stories.length ? <div className="mt-4 grid grid-cols-3 gap-3">{feed.stories.map((story) => <a key={story.id} href={story.permalink ?? "https://www.instagram.com/"} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-surface-container"><div className="aspect-[9/16] bg-black">{story.media_url && <img src={story.media_url} alt="Story da conta conectada" className="h-full w-full object-contain" />}</div><p className="p-2 text-[10px] text-on-surface-variant">{dataHora(story.timestamp)}</p></a>)}</div> : <p className="py-12 text-center text-sm text-on-surface-variant">A API oficial não retornou Stories para esta conta.</p>}</div>}

    {storiesVistos.length > 0 && <div role="dialog" aria-modal="true" aria-label="Visualizador de Stories" className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="button" onClick={() => setStoriesVistos([])} className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] z-10 rounded-lg bg-white/15 px-4 py-2 text-white">Fechar</button><button type="button" aria-label="Story anterior" onClick={() => void mudarStory(-1)} className="absolute left-4 rounded-full bg-white/15 p-3 text-white">‹</button><div className="relative flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col items-center overflow-y-auto"><div className="mb-2 w-full shrink-0 pt-8"><div className="mb-2 flex gap-1" aria-label={`Story ${storyAtual + 1} de ${storiesVistos.length}`}>{storiesVistos.map((item, index) => <span key={item.id} className="h-1 flex-1 rounded-full bg-white/30"><span className="block h-full rounded-full bg-white" style={{ width: `${index < storyAtual ? 100 : index === storyAtual ? progressoStory * 100 : 0}%` }} /></span>)}</div><div className="flex items-center gap-2 text-sm">{(storiesVistos[storyAtual]?.fotoPerfil || instagramBrowser?.stories[storyConta]?.foto) ? <img src={storiesVistos[storyAtual]?.fotoPerfil || instagramBrowser?.stories[storyConta]?.foto || ""} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20"><UserRound className="h-4 w-4" /></span>}{(storiesVistos[storyAtual]?.username || instagramBrowser?.stories[storyConta]?.username) ? <button type="button" onClick={() => void abrirPerfil({ userId: storiesVistos[storyAtual]?.userId || instagramBrowser?.stories[storyConta]?.id || "", username: storiesVistos[storyAtual]?.username || instagramBrowser?.stories[storyConta]?.username || "" })} className="truncate font-semibold">{storiesVistos[storyAtual]?.nome || instagramBrowser?.stories[storyConta]?.nome || storiesVistos[storyAtual]?.username || instagramBrowser?.stories[storyConta]?.username}</button> : <span>Story do Instagram</span>}</div></div>{storiesVistos[storyAtual]?.tipo === "video" ? <video ref={videoStoryRef} key={storiesVistos[storyAtual]?.id} src={storiesVistos[storyAtual]?.urlMidia ?? undefined} controls autoPlay playsInline onTimeUpdate={(event) => { const video = event.currentTarget; const duracao = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : storiesVistos[storyAtual]?.duracaoSegundos ?? 0; if (duracao > 0) setProgressoStory(Math.min(1, video.currentTime / duracao)); }} onEnded={() => void mudarStory(1)} className="max-h-[calc(100dvh-7rem)] w-full rounded-2xl bg-black object-contain" /> : <img src={storiesVistos[storyAtual]?.urlMidia ?? ""} alt="Story do Instagram" className="max-h-[calc(100dvh-7rem)] max-w-full rounded-2xl object-contain" />}<div className="mt-3 flex w-full items-center gap-2 pb-2"><form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void responderStory(textoStory); }}><input aria-label="Responder Story" value={textoStory} maxLength={1000} onFocus={() => { setCompondoStory(true); videoStoryRef.current?.pause(); }} onBlur={() => { setCompondoStory(false); if (videoStoryRef.current?.paused) void videoStoryRef.current.play().catch(() => {}); }} onChange={(event) => setTextoStory(event.target.value)} placeholder="Responder Story..." className="min-w-0 flex-1 rounded-full border border-white/50 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70" /><button type="submit" disabled={!textoStory.trim() || enviandoStory} aria-label="Enviar resposta ao Story" className="rounded-full bg-white/15 p-2 disabled:opacity-50"><Send className="h-5 w-5" /></button></form><button type="button" disabled={curtindoStory} aria-label={storiesVistos[storyAtual]?.gostei ? "Remover curtida do Story" : "Curtir Story"} aria-pressed={storiesVistos[storyAtual]?.gostei} onClick={() => void alternarCurtidaStory()} className="rounded-full bg-white/15 p-2 disabled:opacity-50"><Heart className="h-5 w-5" fill={storiesVistos[storyAtual]?.gostei ? "currentColor" : "none"} /></button></div><div className="flex flex-wrap justify-center gap-2 pb-2" aria-label="Reacoes ao Story">{["\u{1F60D}", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F44F}", "\u{1F525}"].map((emoji) => <button key={emoji} type="button" disabled={enviandoStory} aria-label={`Reagir com ${emoji}`} onClick={() => void responderStory(emoji, true)} className="rounded-full bg-white/10 px-2 py-1 text-xl hover:bg-white/25 disabled:opacity-50">{emoji}</button>)}</div>{mensagemStory && <p role="status" className="text-xs text-white">{mensagemStory}</p>}{erroBrowser && <p role="alert" className="text-center text-xs text-red-300">{erroBrowser}</p>}</div><button type="button" aria-label="Próximo Story" onClick={() => void mudarStory(1)} className="absolute right-4 rounded-full bg-white/15 p-3 text-white">›</button></div>}

    {comentariosPost && <div role="dialog" aria-modal="true" aria-label="Comentários da publicação" className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setComentariosPost(null); }}><section className="flex max-h-[min(80dvh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl"><header className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 p-4"><div className="min-w-0"><h3 className="font-title-md">Comentários</h3><p className="truncate text-xs text-on-surface-variant">Publicação de @{comentariosPost.username}</p></div><button type="button" aria-label="Fechar comentários" onClick={() => setComentariosPost(null)} className="rounded-lg px-3 py-2 hover:bg-surface-container">Fechar</button></header><div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{carregandoComentarios && <p role="status" className="text-sm text-on-surface-variant">Carregando comentários…</p>}{!carregandoComentarios && !listaComentarios.length && <p className="py-8 text-center text-sm text-on-surface-variant">Nenhum comentário retornado para esta publicação.</p>}{listaComentarios.map((comment) => <article key={comment.id} className="text-sm"><p><button type="button" onClick={() => void abrirPerfil({ username: comment.username, userId: comment.userId })} className="font-semibold hover:text-primary">@{comment.username}</button> <span>{comment.text}</span></p><time className="mt-1 block text-[10px] text-on-surface-variant">{dataHora(comment.timestamp)}</time><button type="button" onClick={() => setRespostaComentario(comment)} className="mt-1 text-xs text-primary">Responder</button>{comment.replies?.map((reply) => <p key={reply.id} className="ml-5 mt-2 border-l border-outline-variant/40 pl-3"><button type="button" onClick={() => void abrirPerfil({ username: reply.username, userId: reply.userId })} className="font-semibold hover:text-primary">@{reply.username}</button> {reply.text}</p>)}</article>)}</div>{respostaComentario && <div className="flex items-center justify-between px-4 py-2 text-xs">Respondendo a @{respostaComentario.username}<button type="button" onClick={() => setRespostaComentario(null)} className="text-primary">Cancelar</button></div>}<form className="flex shrink-0 gap-2 border-t border-outline-variant/20 p-3" onSubmit={(event) => { event.preventDefault(); void enviarComentarioInstagram(); }}><input aria-label="Escreva um comentário" maxLength={2200} value={textoComentario} onChange={(event) => setTextoComentario(event.target.value)} className={`${campo} min-w-0 flex-1`} placeholder="Adicione um comentário…" /><button type="submit" disabled={!textoComentario.trim() || enviandoComentario} className={`${acao} shrink-0 bg-primary text-on-primary`}>{enviandoComentario ? "Enviando…" : "Publicar"}</button></form>{erroBrowser && <p role="alert" className="px-4 pb-3 text-sm text-error">{erroBrowser}</p>}</section></div>}

    {!!contas.length && !sessaoInstagram && aba === "feed" && <div className="min-h-0 flex-1 overflow-y-auto">
      {feed?.storiesDisponiveis && !!feed.stories.length && <section className="border-b border-outline-variant/20 p-4"><h3 className="mb-3 font-label-md">Stories ativos da conta</h3><div className="flex gap-3 overflow-x-auto">{feed.stories.map((story) => <div key={story.id} className="w-24 shrink-0"><div className="aspect-[9/16] overflow-hidden rounded-xl bg-surface-container">{story.media_url && <img src={story.media_url} alt="Story da conta conectada" className="h-full w-full object-cover" />}</div><p className="mt-1 text-[10px] text-on-surface-variant">{dataHora(story.timestamp)}</p></div>)}</div></section>}
      {feed && !feed.storiesDisponiveis && <p className="mx-4 mt-3 rounded-lg bg-surface-container p-2 text-xs text-on-surface-variant">A API não liberou stories para esta conta ou permissão; o feed continua disponível.</p>}
      <section className="p-3"><div className="mb-3 flex items-center justify-between"><h3 className="font-label-md">Publicações recentes</h3><span className="text-xs text-on-surface-variant">{feed?.publicacoes.length ?? 0}</span></div>{!feed && !erro && <p className="py-12 text-center text-sm text-on-surface-variant">Carregando feed autorizado…</p>}{feed && !feed.publicacoes.length && <p className="py-12 text-center text-sm text-on-surface-variant">A API não retornou publicações para esta conta.</p>}<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{feed?.publicacoes.map((post) => <a key={post.id} href={post.permalink ?? "https://www.instagram.com/"} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl bg-surface-container hover:ring-2 hover:ring-primary">{(post.thumbnail_url || post.media_url) ? <img src={post.thumbnail_url ?? post.media_url} alt={post.caption?.slice(0, 100) || "Publicação Instagram"} loading="lazy" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-xs text-on-surface-variant">Mídia indisponível pela API</div>}<div className="p-2"><p className="line-clamp-2 text-xs">{post.caption || post.media_type}</p><p className="mt-1 text-[10px] text-on-surface-variant">{dataHora(post.timestamp)}</p></div></a>)}</div></section>
    </div>}

    {!!contas.length && aba === "criar" && <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
      <div><h3 className="font-title-md">Publicar no feed</h3><p className="mt-1 text-xs text-on-surface-variant">Primeira etapa: uma imagem por publicação. O agendamento só é confirmado pela Meta após o processamento assíncrono.</p></div>
      <label className="block text-sm">Imagem do feed<input type="file" accept="image/jpeg,image/png,image/webp" className={`${campo} mt-1`} onChange={(e) => void anexar(e.target.files?.[0])} disabled={enviandoMidia} /></label>
      {midia && <div className="flex items-center gap-3 rounded-xl bg-surface-container p-2"><img src={`/api/operacao/marketing/midia?caminho=${encodeURIComponent(midia)}`} alt="Prévia da imagem escolhida" className="h-20 w-20 rounded-lg object-cover" /><span className="min-w-0 flex-1 truncate text-xs">Imagem na biblioteca privada</span><button type="button" className="text-xs text-error" onClick={() => setMidia("")}>Remover</button></div>}
      <label className="block text-sm">Legenda<textarea maxLength={2200} rows={4} className={`${campo} mt-1 resize-y`} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Escreva a legenda da publicação" /><span className="mt-1 block text-right text-[10px] text-on-surface-variant">{legenda.length}/2200</span></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} />Agendar para outro horário</label>
      {agendar && <label className="block max-w-sm text-sm">Data e hora em São Paulo<input type="datetime-local" className={`${campo} mt-1`} value={horario} onChange={(e) => setHorario(e.target.value)} /></label>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={publicando || enviandoMidia || !midia || !legenda.trim() || !conta || conta.status !== "connected"} onClick={() => { try { const iso = agendar ? horarioSaoPauloParaIso(horario) : new Date().toISOString(); if (agendar && Date.parse(iso) <= Date.now()) throw new Error("Escolha um horário futuro."); void enviar(iso); } catch (falha) { setErro(falha instanceof Error ? falha.message : "Horário inválido"); } }} className={`${acao} bg-primary text-on-primary`}><Send className="h-4 w-4" />{publicando ? "Enfileirando…" : agendar ? "Agendar publicação" : "Publicar agora"}</button><span className="self-center text-xs text-on-surface-variant">Máximo de 25 publicações API a cada 24 horas.</span></div>
      {conta?.status !== "connected" && <p className="text-sm text-error">Reconecte esta conta antes de publicar.</p>}
    </div>}

    {!!contas.length && aba === "resultados" && <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-title-md">Fila e resultados</h3><p className="mt-1 text-xs text-on-surface-variant">Estados vêm da fila e da confirmação de publicação da Meta.</p></div><CalendarClock className="h-5 w-5 text-primary" /></div><div className="space-y-2">{publicacoes.map((item) => <article key={item.id} className="rounded-xl bg-surface-container p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-label-md">@{item.username} · {item.formato}</p><p className="mt-1 text-sm">{item.legenda || "Sem legenda"}</p></div><span className={`rounded-full px-2 py-1 text-xs ${item.status === "falhou" ? "bg-error-container text-on-error-container" : item.status === "publicado" ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-primary-container"}`}>{estados[item.status] ?? item.status}</span></div><p className="mt-2 text-xs text-on-surface-variant">{item.status === "publicado" ? `Publicado ${dataHora(item.publicado_em)}` : `Programado ${dataHora(item.agendado_para)}`} · {item.tentativas} tentativas</p>{item.erro && <p className="mt-2 text-xs text-error">{item.erro}</p>}{item.permalink && <a href={item.permalink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline">Ver no Instagram <ExternalLink className="h-3 w-3" /></a>}</article>)}{!publicacoes.length && <p className="rounded-xl bg-surface-container p-5 text-center text-sm text-on-surface-variant">Nenhuma publicação na fila desta central.</p>}</div></div>}

  </div>;
}
