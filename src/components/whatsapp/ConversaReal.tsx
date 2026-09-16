"use client";

import { useHistoricoConversa,type Mensagem } from "./useHistoricoConversa";
import estilos from "./HistoricoConversa.module.css";
import { Paginacao } from "../painel/Paginacao";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModoConversaWhatsapp } from "../ModoConversaWhatsapp";
import { EnviarMensagemWhatsapp } from "../EnviarMensagemWhatsapp";
import { ArrowDown, Trash2, Clock3, LoaderCircle, CircleAlert } from "lucide-react";
import { SomAtendimento } from "./SomAtendimento";
import { comoTelefone } from "../../lib/formato";

function texto(conteudo: Record<string, unknown>, tipo = "") {
  if (typeof conteudo.texto === "string") return conteudo.texto;
  if (typeof conteudo.text === "string") return conteudo.text;
  const corpo = conteudo.text as { body?: unknown } | undefined;
  if (typeof corpo?.body === "string") {
    const acoes: Record<string, string> = { "bot:contratar": "Contratar evento", "bot:escala": "Minha escala", "bot:atendimento": "Atendimento", "bot:ajuda": "Ajuda", "bot:reserva": "Minha reserva" };
    return acoes[corpo.body] ? `Opção escolhida: ${acoes[corpo.body]}` : corpo.body;
  }
  const interativo = conteudo.interactive as { body?: { text?: unknown }; action?: { buttons?: Array<{ reply?: { titulo?: string; title?: string } }> }; button_reply?: { title?: unknown }; list_reply?: { title?: unknown } } | undefined;
  const textoInterativo = interativo?.body?.text ?? interativo?.button_reply?.title ?? interativo?.list_reply?.title;
  if (typeof textoInterativo === "string") {
    const opcoes = interativo?.action?.buttons?.map((botao, indice) => `${indice + 1}. ${botao.reply?.titulo ?? botao.reply?.title ?? "Opção"}`) ?? [];
    return [textoInterativo, ...opcoes].join("\n");
  }
  return `Mensagem ${tipo || "sem texto disponível"}`;
}

function AnexoDaMensagem({ mensagem }: { mensagem: Mensagem }) {
  const [falhou, setFalhou] = useState(false);
  const midia = mensagem.conteudo.media as { disponivel?: boolean; nome?: string; caption?: string; erro?: string } | undefined;
  if (!midia) return null;
  if (!midia.disponivel || falhou) return <p className="mt-2 text-sm" role="status">{falhou ? "Não foi possível abrir o arquivo." : midia.erro ?? "Arquivo indisponível."}</p>;
  const url = `/api/operacao/whatsapp?midia=${mensagem.id}`;
  return <div className="mt-2 max-w-full space-y-2">
    {(mensagem.tipo === "image" || mensagem.tipo === "sticker") && <img src={url} alt={midia.caption || "Imagem recebida pelo WhatsApp"} loading="lazy" onError={() => setFalhou(true)} className="max-h-64 max-w-full rounded-lg object-contain" />}
    {mensagem.tipo === "audio" && <audio controls preload="none" src={url} onError={() => setFalhou(true)} className="max-w-full" />}
    {mensagem.tipo === "video" && <video controls preload="metadata" src={url} onError={() => setFalhou(true)} className="max-h-64 max-w-full rounded-lg" />}
    {midia.caption && <p className="whitespace-pre-wrap break-words">{midia.caption}</p>}
    <a href={url} target="_blank" rel="noopener noreferrer" className="block break-words text-sm underline">Abrir {midia.nome || "arquivo"}</a>
  </div>;
}

export function ConversaReal({ telefones }: { telefones: string[] }) {
  const parametros = useSearchParams();
  const telefoneInicial = parametros.get("telefone") ?? "";
  const filtroInicial = parametros.get("aguardando") === "1";
  const [aguardando, setAguardando] = useState(filtroInicial);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [telefone, setTelefone] = useState("");
  const [numero, setNumero] = useState("");
  const [antigas, setAntigas] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const [revisaoConversa, setRevisaoConversa] = useState(0);
  const atualizarConversa = () => { setRevisaoConversa(v => v + 1); setRevisao(v => v + 1); };
  const [ocupado, setOcupado] = useState(false);
  const [excluir, setExcluir] = useState("");
  const [erroExclusao, setErroExclusao] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (excluir) modal.current?.showModal(); else modal.current?.close(); }, [excluir]);
  const [atencao, setAtencao] = useState<string[]>([]);
  const {dados,setDados,erro,carregandoMais,longeDoFim,novas,listaMensagens,conteudo,aoRolar,descer,carregarMais}=useHistoricoConversa(telefone,antigas,revisaoConversa);
  const [lista, setLista] = useState(telefones);
  const [paginaLista, setPaginaLista] = useState(0);
  const [totalConversas, setTotalConversas] = useState(0);
  const [erroLista, setErroLista] = useState("");
  const abertura = useRef(0);

  useEffect(() => {
    setAguardando(filtroInicial);
    setPaginaLista(0);
    setLista([]);
    setCarregandoLista(true);
  }, [filtroInicial]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function carregarLista() {
      try {
        const resposta = await fetch(`/api/operacao/whatsapp?pagina=${paginaLista}&aguardando=${aguardando ? "1" : "0"}`, { cache: "no-store", signal: controller.signal });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.mensagem ?? "Falha ao carregar conversas.");
        if (!controller.signal.aborted) { setLista(resultado.telefones); setAtencao((resultado.conversas ?? []).filter((c: { modo: string; atendente_id: string | null }) => c.modo === "atendimento_humano" && !c.atendente_id).map((c: { telefone: string }) => c.telefone)); setTotalConversas(resultado.total); setErroLista(""); }
      } catch (causa) {
        if (!controller.signal.aborted) setErroLista(causa instanceof Error ? causa.message : "Falha ao carregar conversas.");
      } finally {
        if (!controller.signal.aborted) setCarregandoLista(false);
        if (!controller.signal.aborted) timer = setTimeout(() => { void carregarLista(); }, 15000);
      }
    }
    void carregarLista();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [paginaLista, aguardando, revisao]);

  useEffect(() => {
    if (/^\d{10,15}$/.test(telefoneInicial)) { void selecionar(telefoneInicial); setNumero(telefoneInicial); }
  }, [telefoneInicial]);

  async function selecionar(valor: string) {
    const pedido = ++abertura.current;
    setErroLista("");
    try {
      const r = await fetch("/api/operacao/whatsapp", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ telefone: valor, acao: "abrir" }) });
      if (!r.ok) throw new Error("Não foi possível abrir a conversa.");
      if (pedido !== abertura.current) return;
      if (valor !== telefone) setDados(null);
      setTelefone(valor); setAntigas(false); setRevisao(v => v + 1);
    } catch (e) { setErroLista(e instanceof Error ? e.message : "Falha ao abrir conversa."); }
  }
  async function remover() {
    if (!excluir || ocupado) return;
    setOcupado(true); setErroExclusao("");
    try {
      const r = await fetch("/api/operacao/whatsapp", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ telefone: excluir, acao: "remover" }) });
      if (!r.ok) throw new Error("Não foi possível remover da Central.");
      setLista(itens => itens.filter(item => item !== excluir));
      if (telefone === excluir) { setTelefone(""); setDados(null); }
      setExcluir(""); setRevisao(v => v + 1);
    } catch (e) { setErroExclusao(e instanceof Error ? e.message : "Falha ao remover."); }
    finally { setOcupado(false); }
  }

  return <section className="grid h-full min-h-0 min-w-0 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
    <aside className={`min-h-0 overflow-y-auto rounded-xl bg-surface-container-low p-4 ${telefone ? "hidden lg:block" : ""}`}>
      <h2 className="font-bold">Conversas</h2>
      <SomAtendimento />
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={aguardando} onChange={(event) => { setAguardando(event.target.checked); setPaginaLista(0); setLista([]); setCarregandoLista(true); }} />Aguardando atendimento</label>
      {carregandoLista && <p role="status" className="mt-2 text-sm">Carregando conversas…</p>}
      {!carregandoLista && !erroLista && lista.length === 0 && <p className="mt-2 text-sm">{aguardando ? "Nenhuma conversa aguardando atendimento." : "Nenhuma conversa registrada."}</p>}
      <form className="my-3 flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); selecionar(numero.replace(/\D/g, "")); }}>
        <label className="text-sm">Número com código do país<input aria-label="Número da conversa" required pattern="[0-9+ ()-]{10,20}" value={numero} onChange={(event) => setNumero(event.target.value)} className="mt-1 w-full rounded-lg bg-surface p-2" inputMode="tel" /></label>
        <button className="rounded-lg bg-primary p-2 text-on-primary">Abrir conversa</button>
      </form>
      {erroLista && <p role="alert" className="text-sm text-error">{erroLista}</p>}
      <div className="max-h-80 space-y-1 overflow-y-auto">{lista.map((item) => <div key={item} className={`flex items-center rounded-lg ${atencao.includes(item) ? "border-l-4 border-amber-500 bg-amber-100 text-amber-950" : telefone === item ? "bg-surface-container-highest" : "hover:bg-surface-container"}`}>
        <button onClick={() => selecionar(item)} aria-pressed={telefone === item} className="min-w-0 flex-1 rounded-lg p-3 text-left"><span className="block break-all">{comoTelefone(item)}</span>{atencao.includes(item) && <span className="block text-xs font-semibold">Aguardando atendimento</span>}</button>
        <button type="button" disabled={ocupado} onClick={() => { setErroExclusao(""); setExcluir(item); }} aria-label={`Remover conversa ${comoTelefone(item)}`} title="Remover da Central" className="mr-1 shrink-0 rounded-lg p-2 text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"><Trash2 size={17} /></button>
      </div>)}</div>
      <Paginacao pagina={paginaLista + 1} total={totalConversas} porPagina={50} onPagina={valor => setPaginaLista(valor - 1)} rotulo="Páginas de conversas" />
    </aside>
    <div className={`min-h-0 min-w-0 overflow-hidden rounded-xl bg-surface-container-lowest p-4 ${telefone ? "flex h-full flex-col" : ""}`}>
      {!telefone ? <p>Selecione uma conversa ou informe um número para começar.</p> : <>
        <button onClick={() => setTelefone("")} className="mb-3 text-sm text-primary lg:hidden">← Todas as conversas</button>
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{comoTelefone(telefone)}</h2>{dados && <ModoConversaWhatsapp key={`${telefone}-${dados.modo}-${dados.assumida}`} telefone={telefone} modo={dados.modo} assumida={dados.assumida} aoAtualizar={atualizarConversa} />}{!dados && <div className="h-8 w-44 animate-pulse rounded-full bg-surface-container" />}</header>
        {erro && <p role="alert" className="mb-3 text-error">{erro}</p>}
        {!dados && <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 h-5 w-36 animate-pulse rounded bg-surface-container" />
          <div role="status" aria-label="Carregando conversa" className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg bg-surface-container-low p-3">
            <span className="sr-only">Carregando conversa...</span>
            <div className="h-16 w-2/5 animate-pulse rounded-xl bg-surface" />
            <div className="h-20 w-3/5 animate-pulse self-end rounded-xl bg-surface-container" />
          </div>
        </div>}
        {dados && <>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-surface-container-low">
          <div ref={listaMensagens} onScroll={aoRolar} aria-label="Histórico da conversa" className="absolute inset-0 overflow-y-auto overscroll-contain [overflow-anchor:none] [scrollbar-gutter:stable]">
          <ol ref={conteudo} className="flex min-h-full flex-col gap-3 p-3">
            {carregandoMais&&<li role="status" className="flex shrink-0 items-center justify-center gap-2 py-2 text-xs text-on-surface-variant"><LoaderCircle size={14} className="animate-spin"/>Carregando mensagens anteriores…</li>}
            {erro&&dados.temMais&&<li className="text-center"><button onClick={carregarMais} className="rounded-lg bg-surface-container px-3 py-2 text-xs">Tentar carregar anteriores</button></li>}
            {dados.historicoOculto&&!dados.temMais&&<li className="text-center"><button onClick={()=>setAntigas(true)} className="rounded-full bg-surface-container px-3 py-2 text-xs text-primary">Carregar mensagens antigas</button></li>}
            {[...dados.mensagens].reverse().map((mensagem) => <li key={mensagem.id} data-mensagem={mensagem.id} className={`shrink-0 max-w-[90%] rounded-xl p-3 ${mensagem.direcao === "saida" ? "self-end bg-primary-container text-on-primary-container" : "self-start bg-surface"}`}><p className="whitespace-pre-wrap break-words">{texto(mensagem.conteudo, mensagem.tipo)}</p><AnexoDaMensagem mensagem={mensagem} /><p className="mt-1 text-xs opacity-75">{new Date(mensagem.criado_em).toLocaleString("pt-BR")} · {mensagem.status === "enviada" ? "Envio aceito pela ponte; entrega ainda não confirmada" : mensagem.status === "entregue" ? "Entregue no WhatsApp" : mensagem.status === "lida" ? "Lida no WhatsApp" : mensagem.status}</p></li>)}
            {[...dados.fila].reverse().map(item => <li key={`fila-${item.id}`} data-mensagem={`fila-${item.id}`} className={`shrink-0 max-w-[90%] self-end rounded-xl border px-4 py-3 ${item.status === "falha" ? "border-error/30 bg-error/5" : "border-on-surface/15 bg-surface"}`}>
              <p className="whitespace-pre-wrap break-words">{texto(item.conteudo)}</p>
              <div className={`mt-2 flex items-center justify-end gap-1.5 text-xs font-medium ${item.status === "falha" ? "text-error" : "text-on-surface-variant"}`}>
                {item.status === "enviando" ? <LoaderCircle size={14} className="animate-spin" /> : item.status === "falha" ? <CircleAlert size={14} /> : <Clock3 size={14} />}
                <span>{item.status === "enviando" ? "Enviando mensagem" : item.status === "falha" ? "Falha no envio" : "Na fila de envio"}</span>
              </div>
            </li>)}
            {!dados.mensagens.length && !dados.fila.length && <li>Nenhuma mensagem registrada nesta conversa.</li>}
          </ol>
          </div>
          {longeDoFim&&<button type="button" onClick={descer} aria-label={novas?`Ir para mensagens recentes: ${novas} novas mensagens`:"Ir para mensagens recentes"} title="Ir para o fim da conversa" className={`${novas?estilos.novas:""} absolute bottom-4 right-4 z-10 flex cursor-pointer items-center gap-2 rounded-full border border-primary/20 bg-primary px-3 py-3 text-on-primary shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}><ArrowDown size={21}/>{novas>0&&<span className="text-xs font-semibold">{novas>99?"99+":novas}</span>}</button>}
          </div>

        </>}
        <div className="mt-4"><EnviarMensagemWhatsapp key={telefone} telefones={[telefone]} fixarTelefone aoEnviar={() => { setDados(anterior => anterior ? { ...anterior, modo: "atendimento_humano", assumida: true } : anterior); atualizarConversa(); }} /></div>
      </>}
    </div>
    <dialog ref={modal} aria-labelledby="excluir-conversa-titulo" onCancel={event => { event.preventDefault(); if (!ocupado) setExcluir(""); }} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl backdrop:bg-black/50">
      <h2 id="excluir-conversa-titulo" className="text-lg font-bold">Remover conversa da Central?</h2>
      <p className="mt-3 break-words text-sm">A conversa com <strong>{comoTelefone(excluir)}</strong> sairá da lista. O histórico fica salvo e poderá ser carregado quando a conversa for reaberta.</p>
      {erroExclusao && <p role="alert" className="mt-3 text-sm text-error">{erroExclusao}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" autoFocus disabled={ocupado} onClick={() => setExcluir("")} className="rounded-lg bg-surface-container px-4 py-2 disabled:opacity-50">Cancelar</button>
        <button type="button" disabled={ocupado} onClick={remover} className="rounded-lg bg-error px-4 py-2 text-on-error disabled:opacity-50">{ocupado ? "Removendo…" : "Remover conversa"}</button>
      </div>
    </dialog>
  </section>;
}
