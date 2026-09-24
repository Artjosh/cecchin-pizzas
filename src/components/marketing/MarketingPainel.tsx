"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Plus, RefreshCw, Send } from "lucide-react";
import { dataSaoPaulo, horarioSaoPauloParaIso, inicioSemana, somarDias } from "../../lib/agenda-marketing-data";

type Pessoa = { id: string; nome: string; papel: string };
type Perfil = { usuario_id: string; ativo: boolean };
type Agenda = { id: string; responsavel_id: string; solicitacao_id: string | null; categoria: "story" | "feed" | "gravacao" | "tarefa"; titulo: string; descricao_conteudo: string; midia_caminho: string | null; agendado_para: string; situacao: "planejado" | "confirmado" | "publicado" | "cancelado"; confirmado_em: string | null; publicado_em: string | null };
type Solicitacao = { id: string; solicitante_id: string; responsavel_id: string | null; titulo: string; descricao: string; categoria: string; situacao: string; prazo: string | null; criado_em: string };
type Concorrente = { id: string; nome: string; instagram_usuario: string | null; google_place_id: string | null; seguidores_instagram: number | null; publicacoes_instagram: number | null; nota_google: number | null; avaliacoes_google: number | null; instagram_atualizado_em: string | null; google_atualizado_em: string | null; consulta_erro: string | null };
type Publicacao = { instagram_media_id: string; tipo: string; legenda: string | null; permalink: string; midia_url: string | null; miniatura_url: string | null; publicado_em: string };
type Dados = { agenda: Agenda[]; solicitacoes: Solicitacao[]; perfis: Perfil[]; alertas: { agenda_id: string; criado_em: string; lido_em: string | null }[]; concorrentes: Concorrente[] };

function rotuloData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

const campo = "w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-on-surface outline-none focus:border-primary";
const botao = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-label-md transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function MarketingPainel({ usuarioId, gestor, pessoas }: { usuarioId: string; gestor: boolean; pessoas: Pessoa[] }) {
  const [semana, setSemana] = useState(() => inicioSemana(new Date()));
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [formAgenda, setFormAgenda] = useState({ categoria: "story", titulo: "", descricao_conteudo: "", midia_caminho: "", agendado_para: "", responsavel_id: usuarioId, solicitacao_id: "" });
  const [formPedido, setFormPedido] = useState({ titulo: "", descricao: "", categoria: "arte", responsavel_id: "" });
  const [formConcorrente, setFormConcorrente] = useState({ id: "", nome: "", instagram_usuario: "", google_place_id: "" });
  const [concorrenteAberto, setConcorrenteAberto] = useState("");
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [carregandoPublicacoes, setCarregandoPublicacoes] = useState(false);
  const [erroPublicacoes, setErroPublicacoes] = useState("");
  const [prazoPorId, setPrazoPorId] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    const fim = somarDias(semana, 7);
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/operacao/marketing?inicio=${semana}&fim=${fim}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error("Não foi possível carregar a agenda. Confira a migration e o acesso ao banco.");
      setDados(await resposta.json() as Dados);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao carregar"); }
    finally { setCarregando(false); }
  }, [semana]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { const intervalo = window.setInterval(() => { void carregar(); }, 30000); return () => window.clearInterval(intervalo); }, [carregar]);
  useEffect(() => {
    if (!concorrenteAberto) return;
    const controller = new AbortController();
    fetch(`/api/operacao/marketing/publicacoes?concorrente=${concorrenteAberto}`, { cache: "no-store", signal: controller.signal })
      .then(async (resposta) => { const corpo = await resposta.json() as { publicacoes?: Publicacao[]; mensagem?: string }; if (!resposta.ok) throw new Error(corpo.mensagem ?? "Falha ao carregar publicações"); setPublicacoes(corpo.publicacoes ?? []); })
      .catch((falha) => { if (!controller.signal.aborted) setErroPublicacoes(falha instanceof Error ? falha.message : "Falha ao carregar publicações"); })
      .finally(() => { if (!controller.signal.aborted) setCarregandoPublicacoes(false); });
    return () => controller.abort();
  }, [concorrenteAberto]);

  const enviar = async (corpo: Record<string, unknown>, sucesso: string) => {
    setSalvando(true);
    setErro("");
    setAviso("");
    try {
      const resposta = await fetch("/api/operacao/marketing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const resultado = await resposta.json() as { mensagem?: string };
      if (!resposta.ok) throw new Error(resultado.mensagem ?? "Não foi possível salvar");
      setAviso(sucesso);
      await carregar();
      return true;
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar"); return false; }
    finally { setSalvando(false); }
  };

  const anexarMidia = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviandoMidia(true); setErro("");
    try {
      const corpo = new FormData(); corpo.set("arquivo", arquivo);
      const resposta = await fetch("/api/operacao/marketing/midia", { method: "POST", body: corpo });
      const resultado = await resposta.json() as { caminho?: string; mensagem?: string };
      if (!resposta.ok || !resultado.caminho) throw new Error(resultado.mensagem ?? "Não foi possível anexar");
      setFormAgenda((atual) => ({ ...atual, midia_caminho: resultado.caminho! }));
      setAviso("Arquivo anexado à programação. Salve o compromisso para vinculá-lo à agenda.");
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível anexar"); }
    finally { setEnviandoMidia(false); }
  };

  const ids = useMemo(() => new Set(dados?.perfis.map((p) => p.usuario_id) ?? []), [dados]);
  const souMarketing = ids.has(usuarioId);
  const alertasPendentes = new Set(dados?.alertas.map((a) => a.agenda_id) ?? []);
  const agendaPorDia = useMemo(() => {
    const grupos = new Map<string, Agenda[]>();
    for (const item of dados?.agenda ?? []) {
      const chave = dataSaoPaulo(new Date(item.agendado_para));
      grupos.set(chave, [...(grupos.get(chave) ?? []), item]);
    }
    return grupos;
  }, [dados]);
  const dias = Array.from({ length: 7 }, (_, indice) => somarDias(semana, indice));
  const diasProgramados = dias.filter((dia) => (agendaPorDia.get(dia) ?? []).some((item) => item.categoria !== "tarefa" && item.situacao !== "cancelado")).length;
  const nome = (id: string) => pessoas.find((p) => p.id === id)?.nome ?? (id === usuarioId ? "Você" : "Integrante");
  const perfilAberto = dados?.concorrentes.find((item) => item.id === concorrenteAberto);

  return <div className="space-y-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-label-sm uppercase tracking-[0.16em] text-primary">Operação</p><h1 className="font-headline-md text-headline-md">Marketing</h1><p className="text-on-surface-variant">Programação da semana, pedidos e confirmação de cada publicação.</p></div>
      <div className="flex items-center gap-2"><button className={`${botao} bg-surface-container text-on-surface`} onClick={() => setSemana((atual) => somarDias(atual, -7))}>Anterior</button><span className="min-w-28 text-center font-label-md">{semana}</span><button className={`${botao} bg-surface-container text-on-surface`} onClick={() => setSemana((atual) => somarDias(atual, 7))}>Próxima</button><button aria-label="Atualizar agenda" className={`${botao} bg-surface-container text-on-surface`} onClick={() => void carregar()}><RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /></button></div>
    </header>
    {erro && <p role="alert" className="rounded-xl bg-error-container p-3 text-on-error-container">{erro}</p>}
    {aviso && <p role="status" className="rounded-xl bg-tertiary-container p-3 text-on-tertiary-container">{aviso}</p>}
    {dados && (souMarketing || gestor) && <p className="text-sm text-on-surface-variant" role="status">{diasProgramados} de 7 dias com conteúdo programado nesta semana.</p>}
    {!!alertasPendentes.size && <p role="status" className="rounded-xl bg-primary-container p-3 font-label-md text-on-primary-container">{alertasPendentes.size} {alertasPendentes.size === 1 ? "compromisso precisa" : "compromissos precisam"} da sua confirmação. Os itens aparecem destacados na agenda.</p>}
    {!gestor && dados && !souMarketing && <p className="rounded-xl bg-surface-container p-4 text-on-surface-variant">Seu perfil ainda não foi atribuído ao marketing. Peça à gestão para habilitar sua agenda.</p>}
    {gestor && <details className="rounded-2xl bg-surface-container-low p-4"><summary className="cursor-pointer font-title-md">Equipe de marketing · {ids.size} {ids.size === 1 ? "integrante" : "integrantes"}</summary><div className="mt-3 flex flex-wrap gap-2">{pessoas.map((pessoa) => <button key={pessoa.id} disabled={salvando} onClick={() => void enviar({ acao: "atribuir", usuario_id: pessoa.id, ativo: !ids.has(pessoa.id) }, ids.has(pessoa.id) ? `${pessoa.nome} removido do marketing` : `${pessoa.nome} incluído no marketing`)} className={`${botao} ${ids.has(pessoa.id) ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface"}`}>{ids.has(pessoa.id) && <Check className="h-4 w-4" />}{pessoa.nome}</button>)}</div></details>}
    <section className="grid gap-3 lg:grid-cols-7" aria-label="Agenda semanal">{dias.map((dia) => {
      const chave = dia; const itens = agendaPorDia.get(chave) ?? [];
      return <div key={chave} className="min-h-44 rounded-2xl bg-surface-container-low p-3"><div className="mb-3 flex items-center justify-between border-b border-outline-variant/30 pb-2"><h2 className="font-label-lg capitalize">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", timeZone: "UTC" }).format(new Date(`${dia}T12:00:00Z`))}</h2><span className="text-on-surface-variant text-sm">{itens.length}</span></div><div className="space-y-2">{itens.map((item) => <article key={item.id} className={`rounded-xl bg-surface-container-lowest p-3 shadow-sm ${alertasPendentes.has(item.id) ? "ring-2 ring-primary" : ""}`}><div className="mb-1 flex items-center justify-between gap-1"><span className="rounded-full bg-primary-container px-2 py-0.5 text-xs text-on-primary-container">{item.categoria === "tarefa" ? "Tarefa" : item.categoria}</span><span className="text-xs text-on-surface-variant">{rotuloData(item.agendado_para).split(" ").slice(-1)}</span></div><h3 className="font-label-md leading-snug">{item.titulo}</h3><p className="mt-1 text-xs text-on-surface-variant">{nome(item.responsavel_id)} · {item.categoria === 'tarefa' && item.situacao === 'publicado' ? 'concluída' : item.situacao}</p>{item.descricao_conteudo && <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant">{item.descricao_conteudo}</p>}{item.midia_caminho && <a className="mt-2 inline-block text-xs font-semibold text-primary underline" href={`/api/operacao/marketing/midia?caminho=${encodeURIComponent(item.midia_caminho)}`} target="_blank" rel="noreferrer">Abrir foto ou vídeo</a>}{item.responsavel_id === usuarioId && item.situacao !== "publicado" && item.situacao !== "cancelado" && <div className="mt-3 flex flex-wrap gap-1">{item.situacao === "planejado" && <button disabled={salvando} className={`${botao} bg-surface-container-high text-xs`} onClick={() => void enviar({ acao: "confirmar", id: item.id }, "Compromisso confirmado")}>Confirmar</button>}<button disabled={salvando} className={`${botao} bg-primary text-on-primary text-xs`} onClick={() => void enviar({ acao: "publicar", id: item.id }, item.categoria === "tarefa" ? "Tarefa concluída" : "Publicação registrada")}>{item.categoria === "tarefa" ? "Concluir tarefa" : "Marcar publicado"}</button></div>}</article>)}{!itens.some((item) => item.categoria !== "tarefa" && item.situacao !== "cancelado") && <div className="space-y-1"><p className="text-sm text-on-surface-variant">Sem conteúdo programado</p>{(souMarketing || gestor) && <button type="button" className="text-xs font-semibold text-primary" onClick={() => { setFormAgenda((atual) => ({ ...atual, agendado_para: `${chave}T12:00` })); document.getElementById("formulario-agenda-marketing")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Programar este dia</button>}</div>}</div></div>;
    })}</section>
    <div className="grid gap-4 xl:grid-cols-2">
      {(souMarketing || gestor) && <form id="formulario-agenda-marketing" onSubmit={async (e) => { e.preventDefault(); if (enviandoMidia) return; if (await enviar({ acao: "agenda", ...formAgenda, agendado_para: horarioSaoPauloParaIso(formAgenda.agendado_para), responsavel_id: formAgenda.responsavel_id || usuarioId, solicitacao_id: formAgenda.solicitacao_id || null }, "Compromisso adicionado")) setFormAgenda((anterior) => ({ ...anterior, titulo: "", descricao_conteudo: "", midia_caminho: "", solicitacao_id: "" })); }} className="space-y-3 rounded-2xl bg-surface-container-low p-5"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-title-lg">Programar conteúdo</h2></div><div className="grid gap-3 sm:grid-cols-2"><select className={campo} value={formAgenda.categoria} onChange={(e) => setFormAgenda({ ...formAgenda, categoria: e.target.value })}><option value="story">Story</option><option value="feed">Feed</option><option value="gravacao">Gravação</option></select><input aria-label="Data e horário" required type="datetime-local" className={campo} value={formAgenda.agendado_para} onChange={(e) => setFormAgenda({ ...formAgenda, agendado_para: e.target.value })} /></div><input required maxLength={150} placeholder="Nome do conteúdo" className={campo} value={formAgenda.titulo} onChange={(e) => setFormAgenda({ ...formAgenda, titulo: e.target.value })} /><textarea rows={3} maxLength={4000} placeholder="Descrição, roteiro ou legenda" className={campo} value={formAgenda.descricao_conteudo} onChange={(e) => setFormAgenda({ ...formAgenda, descricao_conteudo: e.target.value })} /><label className="block text-sm">Foto ou vídeo<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className={`${campo} mt-1`} onChange={(e) => void anexarMidia(e.target.files?.[0])} /></label>{enviandoMidia && <p role="status" className="text-sm text-on-surface-variant">Enviando arquivo…</p>}{formAgenda.midia_caminho && <a className="text-sm text-primary underline" href={`/api/operacao/marketing/midia?caminho=${encodeURIComponent(formAgenda.midia_caminho)}`} target="_blank" rel="noreferrer">Ver arquivo anexado</a>}{gestor && <select aria-label="Responsável" className={campo} value={formAgenda.responsavel_id} onChange={(e) => setFormAgenda({ ...formAgenda, responsavel_id: e.target.value })}><option value="">Selecionar responsável</option>{pessoas.filter((p) => ids.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>}<select aria-label="Vincular solicitação" className={campo} value={formAgenda.solicitacao_id} onChange={(e) => setFormAgenda({ ...formAgenda, solicitacao_id: e.target.value })}><option value="">Sem solicitação vinculada</option>{(dados?.solicitacoes ?? []).filter((s) => ["recebida", "planejada"].includes(s.situacao) && s.responsavel_id === (formAgenda.responsavel_id || usuarioId)).map((s) => <option key={s.id} value={s.id}>{s.titulo}</option>)}</select><button disabled={salvando || enviandoMidia} className={`${botao} bg-primary text-on-primary`}><Plus className="h-4 w-4" />Adicionar à agenda</button></form>}
      <div className="space-y-4">{gestor && <form onSubmit={async (e) => { e.preventDefault(); if (await enviar({ acao: "solicitar", ...formPedido, responsavel_id: formPedido.responsavel_id || null }, "Solicitação enviada")) setFormPedido({ titulo: "", descricao: "", categoria: "arte", responsavel_id: "" }); }} className="space-y-3 rounded-2xl bg-surface-container-low p-5"><div className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /><h2 className="font-title-lg">Solicitar serviço</h2></div><input required maxLength={150} placeholder="Ex.: arte para promoção" className={campo} value={formPedido.titulo} onChange={(e) => setFormPedido({ ...formPedido, titulo: e.target.value })} /><textarea required rows={3} maxLength={4000} placeholder="Descreva o que precisa" className={campo} value={formPedido.descricao} onChange={(e) => setFormPedido({ ...formPedido, descricao: e.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><select className={campo} value={formPedido.categoria} onChange={(e) => setFormPedido({ ...formPedido, categoria: e.target.value })}><option value="arte">Arte</option><option value="conteudo">Conteúdo</option><option value="gravacao">Gravação</option><option value="outro">Outro</option></select><select aria-label="Responsável sugerido" className={campo} value={formPedido.responsavel_id} onChange={(e) => setFormPedido({ ...formPedido, responsavel_id: e.target.value })}><option value="">Equipe de marketing</option>{pessoas.filter((p) => ids.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div><button disabled={salvando} className={`${botao} bg-primary text-on-primary`}>Enviar solicitação</button></form>}
        <section className="rounded-2xl bg-surface-container-low p-5"><div className="mb-3 flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /><h2 className="font-title-lg">Solicitações</h2></div><div className="max-h-[430px] space-y-2 overflow-y-auto">{(dados?.solicitacoes ?? []).map((pedido) => <article key={pedido.id} className="rounded-xl bg-surface-container-lowest p-3"><div className="flex justify-between gap-2"><h3 className="font-label-md">{pedido.titulo}</h3><span className="text-xs text-on-surface-variant">{pedido.situacao}</span></div><p className="mt-1 text-sm text-on-surface-variant">{pedido.descricao}</p>{pedido.prazo && <p className="mt-1 text-xs text-on-surface-variant">Prazo: {rotuloData(pedido.prazo)}</p>}{souMarketing && pedido.situacao === "solicitada" && (!pedido.responsavel_id || pedido.responsavel_id === usuarioId) && <div className="mt-3 flex flex-wrap gap-2"><input aria-label={`Prazo para ${pedido.titulo}`} type="datetime-local" className={`${campo} max-w-52`} value={prazoPorId[pedido.id] ?? ""} onChange={(e) => setPrazoPorId({ ...prazoPorId, [pedido.id]: e.target.value })} /><button disabled={salvando || !prazoPorId[pedido.id]} className={`${botao} bg-primary text-on-primary`} onClick={() => void enviar({ acao: "receber", id: pedido.id, prazo: horarioSaoPauloParaIso(prazoPorId[pedido.id]) }, "Prazo informado")}>Receber pedido</button></div>}</article>)}{!dados?.solicitacoes.length && <p className="text-sm text-on-surface-variant">Nenhuma solicitação.</p>}</div></section>
      </div>
    </div>
    <section className="space-y-4 rounded-2xl bg-surface-container-low p-5"><div><h2 className="font-title-lg">Concorrência</h2><p className="text-sm text-on-surface-variant">As métricas mostram a última coleta oficial. Sem integração configurada, permanecem sem valor.</p></div>
      {gestor && <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await enviar({ acao: "concorrente", ...formConcorrente }, formConcorrente.id ? "Concorrente atualizado" : "Concorrente cadastrado")) setFormConcorrente({ id: "", nome: "", instagram_usuario: "", google_place_id: "" }); }}><label className="min-w-44 flex-1 text-xs">Nome<input required maxLength={150} className={campo} value={formConcorrente.nome} onChange={(e) => setFormConcorrente({ ...formConcorrente, nome: e.target.value })} /></label><label className="min-w-44 flex-1 text-xs">Instagram profissional<input placeholder="@usuario" maxLength={31} className={campo} value={formConcorrente.instagram_usuario} onChange={(e) => setFormConcorrente({ ...formConcorrente, instagram_usuario: e.target.value })} /></label><label className="min-w-44 flex-1 text-xs">Google Place ID<input placeholder="Place ID" maxLength={255} className={campo} value={formConcorrente.google_place_id} onChange={(e) => setFormConcorrente({ ...formConcorrente, google_place_id: e.target.value })} /></label><button disabled={salvando || (!formConcorrente.instagram_usuario.trim() && !formConcorrente.google_place_id.trim())} className={`${botao} bg-primary text-on-primary`}>{formConcorrente.id ? "Salvar" : "Adicionar"}</button>{formConcorrente.id && <button type="button" className={`${botao} bg-surface-container-high`} onClick={() => setFormConcorrente({ id: "", nome: "", instagram_usuario: "", google_place_id: "" })}>Cancelar</button>}</form>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(dados?.concorrentes ?? []).map((concorrente) => <article key={concorrente.id} className="rounded-xl bg-surface-container-lowest p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-label-lg">{concorrente.nome}</h3>{gestor && <button type="button" className="text-xs text-primary underline" onClick={() => setFormConcorrente({ id: concorrente.id, nome: concorrente.nome, instagram_usuario: concorrente.instagram_usuario ?? "", google_place_id: concorrente.google_place_id ?? "" })}>Editar</button>}</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-on-surface-variant">Instagram</p><strong>{concorrente.seguidores_instagram == null ? "Aguardando coleta" : `${concorrente.seguidores_instagram.toLocaleString("pt-BR")} seguidores`}</strong>{concorrente.publicacoes_instagram != null && <p>{concorrente.publicacoes_instagram.toLocaleString("pt-BR")} publicações</p>}</div><div><p className="text-xs text-on-surface-variant">Google</p><strong>{concorrente.nota_google == null ? "Aguardando coleta" : `${Number(concorrente.nota_google).toFixed(1).replace(".", ",")} / 5`}</strong>{concorrente.avaliacoes_google != null && <p>{concorrente.avaliacoes_google.toLocaleString("pt-BR")} avaliações</p>}</div></div><div className="mt-3 flex flex-wrap gap-3 text-xs">{concorrente.instagram_usuario && <a className="text-primary underline" href={`https://www.instagram.com/${encodeURIComponent(concorrente.instagram_usuario)}/`} target="_blank" rel="noreferrer">Abrir Instagram</a>}{concorrente.google_place_id && <a className="text-primary underline" href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(concorrente.google_place_id)}`} target="_blank" rel="noreferrer">Abrir no Maps</a>}</div>{(concorrente.instagram_atualizado_em || concorrente.google_atualizado_em) && <p className="mt-2 text-xs text-on-surface-variant">Última coleta: {rotuloData([concorrente.instagram_atualizado_em, concorrente.google_atualizado_em].filter(Boolean).sort().at(-1)!)}</p>}{concorrente.consulta_erro && <p className="mt-2 text-xs text-error">Coleta pendente: {concorrente.consulta_erro}</p>}</article>)}{!dados?.concorrentes.length && <p className="text-sm text-on-surface-variant">Nenhum concorrente cadastrado.</p>}</div>
      {(dados?.concorrentes ?? []).some((item) => item.instagram_usuario) && <div className="space-y-3 rounded-xl bg-surface-container-lowest p-4"><label className="block max-w-sm text-sm font-medium">Publicações recentes de um concorrente<select className={`${campo} mt-2`} value={concorrenteAberto} onChange={(e) => { setConcorrenteAberto(e.target.value); setPublicacoes([]); setErroPublicacoes(""); setCarregandoPublicacoes(Boolean(e.target.value)); }}><option value="">Escolha o Instagram</option>{dados?.concorrentes.filter((item) => item.instagram_usuario).map((item) => <option key={item.id} value={item.id}>{item.nome} · @{item.instagram_usuario}</option>)}</select></label>
        {perfilAberto?.instagram_usuario && <a href={`https://www.instagram.com/${encodeURIComponent(perfilAberto.instagram_usuario)}/`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Abrir perfil e stories no Instagram</a>}
        {carregandoPublicacoes && <p role="status" className="text-sm text-on-surface-variant">Carregando publicações…</p>}
        {erroPublicacoes && <p role="alert" className="text-sm text-error">{erroPublicacoes}</p>}
        {concorrenteAberto && !carregandoPublicacoes && !erroPublicacoes && !publicacoes.length && <p className="text-sm text-on-surface-variant">Ainda não há publicações coletadas para este perfil. Abra o Instagram para conferir feed e stories diretamente.</p>}
        {!!publicacoes.length && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{publicacoes.map((post) => <a key={post.instagram_media_id} href={post.permalink} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl bg-surface-container text-sm hover:bg-surface-container-high">{(post.miniatura_url || (post.tipo !== "VIDEO" ? post.midia_url : null)) && <img src={post.miniatura_url || post.midia_url!} alt={post.legenda?.slice(0, 100) || "Publicação do Instagram"} loading="lazy" className="aspect-square w-full object-cover" />}<div className="p-3"><p className="line-clamp-3">{post.legenda || "Abrir publicação"}</p><p className="mt-2 text-xs text-on-surface-variant">{rotuloData(post.publicado_em)} · {post.tipo.toLowerCase().replaceAll("_", " ")}</p></div></a>)}</div>}
      </div>}
    </section>
  </div>;
}
