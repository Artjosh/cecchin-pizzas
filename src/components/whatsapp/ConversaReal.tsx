"use client";

import { useHistoricoConversa,type Mensagem,type Etiqueta } from "./useHistoricoConversa";
import { EditorConversaWhatsapp } from "./EditorConversaWhatsapp";
import css from "./WhatsApp.module.css";
import estilos from "./HistoricoConversa.module.css";
import { Paginacao } from "../painel/Paginacao";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModoConversaWhatsapp } from "../ModoConversaWhatsapp";
import { EnviarMensagemWhatsapp } from "../EnviarMensagemWhatsapp";
import { ArrowDown, ArrowLeft, Trash2, Clock3, LoaderCircle, CircleAlert, Search, MessageCircle, MessageSquarePlus, UserRound, Check, CheckCheck, Tags, Pencil } from "lucide-react";
import { formatarTelefoneWhatsApp as comoTelefone } from "../../lib/telefone-whatsapp";

function FotoContato({ conta, telefone, destaque = false }: { conta: string; telefone: string; destaque?: boolean }) {
  const [falhou, setFalhou] = useState(false);
  const [carregou, setCarregou] = useState(false);
  return <span className={css.avatar}>
    {!falhou && <img src={`/api/operacao/whatsapp?conta=${encodeURIComponent(conta)}&foto=${telefone}`} alt="" loading={destaque ? "eager" : "lazy"} onLoad={() => setCarregou(true)} onError={() => setFalhou(true)} style={{ opacity: carregou ? 1 : 0 }} />}
    {!carregou && <UserRound size={destaque ? 25 : 23} className={falhou ? undefined : css.avatarPendente} />}
  </span>;
}

export function opcoesDaMensagem(conteudo: Record<string, unknown>): Array<{ id: string; titulo: string }> {
  const diretas = Array.isArray(conteudo.opcoes_bot) ? conteudo.opcoes_bot : [];
  const interativo = conteudo.interactive as { action?: { buttons?: Array<{ reply?: { id?: string; title?: string; titulo?: string } }>; sections?: Array<{ rows?: Array<{ id?: string; title?: string }> }> } } | undefined;
  return [...diretas, ...(interativo?.action?.buttons?.map(item => item.reply) ?? []), ...(interativo?.action?.sections?.flatMap(item => item.rows ?? []) ?? [])]
    .filter((item): item is { id: string; titulo: string; title?: string } => !!item && typeof item.id === "string" && (typeof item.titulo === "string" || typeof item.title === "string"))
    .map(item => ({ id: item.id, titulo: item.titulo ?? item.title ?? item.id }));
}

function rotuloDaOpcao(id: string, opcoes: Map<string, string>): string {
  const conhecido = opcoes.get(id);
  if (conhecido) return `Opção escolhida: ${conhecido}`;
  const simples: Record<string, string> = { "bot:contratar": "Contratar evento", "bot:escala": "Minha escala", "bot:atendimento": "Atendimento", "bot:ajuda": "Ajuda", "bot:reserva": "Minha reserva", "disp:todo": "Dia todo", "disp:folga": "Folga", "disp:custom": "Definir horário", "disp:revisar": "Revisar semana", "disp:salvar": "Confirmar horários", "disp:dias": "Alterar dias", "disp:cancelar": "Cancelar", "disp:hora:ok": "Confirmar horário", "disp:mais": "Mais opções" };
  const rotulo = simples[id] ?? (/^disp:dia:[0-6]$/.test(id) ? "Selecionar dia" : null);
  return rotulo ? `Opção escolhida: ${rotulo}` : id;
}

export function texto(conteudo: Record<string, unknown>, tipo = "", opcoes = new Map<string, string>()) {
  if (typeof conteudo.texto === "string") return rotuloDaOpcao(conteudo.texto, opcoes);
  if (typeof conteudo.text === "string") return rotuloDaOpcao(conteudo.text, opcoes);
  const corpo = conteudo.text as { body?: unknown } | undefined;
  if (typeof corpo?.body === "string") {
    return rotuloDaOpcao(corpo.body, opcoes);
  }
  const interativo = conteudo.interactive as { body?: { text?: unknown }; action?: { buttons?: Array<{ reply?: { titulo?: string; title?: string } }> }; button_reply?: { title?: unknown }; list_reply?: { title?: unknown } } | undefined;
  const textoInterativo = interativo?.body?.text ?? interativo?.button_reply?.title ?? interativo?.list_reply?.title;
  if (typeof textoInterativo === "string") {
    const opcoes = interativo?.action?.buttons?.map((botao, indice) => `${indice + 1}. ${botao.reply?.titulo ?? botao.reply?.title ?? "Opção"}`) ?? [];
    return [textoInterativo, ...opcoes].join("\n");
  }
  return `Mensagem ${tipo || "sem texto disponível"}`;
}

function ContatosDaMensagem({ conteudo }: { conteudo: Record<string, unknown> }) {
  const contatos = Array.isArray(conteudo.contacts) ? conteudo.contacts : [];
  return <div className={css.contatosMensagem}>{contatos.map((valor, indice) => {
    const contato = valor as { name?: string | { formatted_name?: string }; vcard?: string; phones?: Array<{ phone?: string; wa_id?: string }> };
    const nome = typeof contato.name === "string" ? contato.name : contato.name?.formatted_name ?? "Contato";
    const telefone = contato.phones?.[0]?.phone ?? contato.phones?.[0]?.wa_id ?? contato.vcard?.match(/(?:^|\n)TEL[^:]*:([^\r\n]+)/i)?.[1];
    return <div key={indice} className={css.cartaoContato}><UserRound size={21} /><span><strong>{nome}</strong>{telefone && <small>{telefone.trim()}</small>}</span></div>;
  })}</div>;
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

export function ConversaReal({ telefones, conta = "principal", ativa = true }: { telefones: string[]; conta?: string; ativa?: boolean }) {
  const parametros = useSearchParams();
  const telefoneInicial = (parametros.get("conta") ?? "principal") === conta ? parametros.get("telefone") ?? "" : "";
  const [busca, setBusca] = useState("");
  const [nova, setNova] = useState(false);
  const filtroInicial = parametros.get("aguardando") === "1";
  const [aguardando, setAguardando] = useState(filtroInicial);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [telefone, setTelefone] = useState("");
  const [numero, setNumero] = useState("");
  const [antigas, setAntigas] = useState(false);
  const [revisao, setRevisao] = useState(0);
  const [revisaoEtiquetas, setRevisaoEtiquetas] = useState(0);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [etiquetaFiltro, setEtiquetaFiltro] = useState("");
  const [editor, setEditor] = useState<"conversa" | "etiquetas" | null>(null);
  const [revisaoConversa, setRevisaoConversa] = useState(0);
  const atualizarConversa = () => { setRevisaoConversa(v => v + 1); setRevisao(v => v + 1); };
  const [ocupado, setOcupado] = useState(false);
  const [excluir, setExcluir] = useState("");
  const [erroExclusao, setErroExclusao] = useState("");
  const modal = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (excluir) modal.current?.showModal(); else modal.current?.close(); }, [excluir]);
  const [atencao, setAtencao] = useState<string[]>([]);
  const {dados,setDados,erro,carregandoMais,longeDoFim,novas,listaMensagens,conteudo,aoRolar,descer,carregarMais}=useHistoricoConversa(telefone,antigas,revisaoConversa,conta,ativa);
  const [lista, setLista] = useState(telefones);
  const [resumos, setResumos] = useState<Record<string, { nome_contato?: string | null; etiquetas?: Etiqueta[]; ultima_mensagem?: string; ultima_em?: string; ultima_direcao?: string }>>({});
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
    if (!ativa) return;
    const controller = new AbortController();
    async function carregarEtiquetas() {
      try {
        const r = await fetch(`/api/operacao/whatsapp/etiquetas?conta=${encodeURIComponent(conta)}`, { cache: "no-store", signal: controller.signal });
        if (!r.ok) return;
        const d = await r.json() as { etiquetas: Etiqueta[] };
        if (!controller.signal.aborted) { setEtiquetas(d.etiquetas); setEtiquetaFiltro(atual => atual && !d.etiquetas.some(item => item.id === atual) ? "" : atual); }
      } catch { /* A lista de conversas continua disponível sem as etiquetas. */ }
    }
    void carregarEtiquetas();
    return () => controller.abort();
  }, [conta, ativa, revisaoEtiquetas]);

  useEffect(() => {
    if (!ativa) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function carregarLista() {
      try {
        const resposta = await fetch(`/api/operacao/whatsapp?conta=${conta}&busca=${encodeURIComponent(busca)}&pagina=${paginaLista}&aguardando=${aguardando ? "1" : "0"}&etiqueta=${etiquetaFiltro}`, { cache: "no-store", signal: controller.signal });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.mensagem ?? "Falha ao carregar conversas.");
        if (!controller.signal.aborted) { setLista(resultado.telefones); setResumos(Object.fromEntries((resultado.conversas ?? []).map((c: { telefone: string }) => [c.telefone, c]))); setAtencao((resultado.conversas ?? []).filter((c: { modo: string; atendente_id: string | null }) => c.modo === "atendimento_humano" && !c.atendente_id).map((c: { telefone: string }) => c.telefone)); setTotalConversas(resultado.total); setErroLista(""); }
      } catch (causa) {
        if (!controller.signal.aborted) setErroLista(causa instanceof Error ? causa.message : "Falha ao carregar conversas.");
      } finally {
        if (!controller.signal.aborted) setCarregandoLista(false);
        if (!controller.signal.aborted) timer = setTimeout(() => { void carregarLista(); }, 15000);
      }
    }
    void carregarLista();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [conta, ativa, busca, paginaLista, aguardando, etiquetaFiltro, revisao]);

  useEffect(() => {
    if (/^\d{10,15}$/.test(telefoneInicial)) { void selecionar(telefoneInicial); setNumero(telefoneInicial); }
  }, [telefoneInicial]);

  async function selecionar(valor: string) {
    const pedido = ++abertura.current;
    setErroLista("");
    try {
      const r = await fetch("/api/operacao/whatsapp", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta, telefone: valor, acao: "abrir" }) });
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
      const r = await fetch("/api/operacao/whatsapp", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta, telefone: excluir, acao: "remover" }) });
      if (!r.ok) throw new Error("Não foi possível remover da Central.");
      setLista(itens => itens.filter(item => item !== excluir));
      if (telefone === excluir) { setTelefone(""); setDados(null); }
      setExcluir(""); setRevisao(v => v + 1);
    } catch (e) { setErroExclusao(e instanceof Error ? e.message : "Falha ao remover."); }
    finally { setOcupado(false); }
  }

  const mensagens = [...(dados?.mensagens ?? [])].reverse();
  const rotulosPorMensagem = new Map<string, Map<string, string>>();
  const opcoesConhecidas = new Map<string, string>();
  for (const mensagem of mensagens) {
    rotulosPorMensagem.set(mensagem.id, new Map(opcoesConhecidas));
    for (const opcao of opcoesDaMensagem(mensagem.conteudo)) opcoesConhecidas.set(opcao.id, opcao.titulo);
  }
  return <section className={css.conversas}>
    <aside className={css.lateral} data-aberta={!!telefone}>
      <div className={css.tituloLista}><h2>Conversas</h2><button type="button" aria-label="Nova conversa" title="Nova conversa" onClick={() => setNova(v => !v)}><MessageSquarePlus size={22} /></button></div>
      <label className={css.busca}><Search size={18} /><input aria-label="Pesquisar conversas por número" placeholder="Pesquisar ou começar uma conversa" value={busca} onChange={e => { setBusca(e.target.value); setPaginaLista(0); }} /></label>
      <div className={css.filtros}><button type="button" aria-pressed={!aguardando} onClick={() => { setAguardando(false); setPaginaLista(0); }}>Todas</button><button type="button" aria-pressed={aguardando} onClick={() => { setAguardando(true); setPaginaLista(0); }}>Aguardando atendimento</button></div>
      {nova && <form className={css.novo} onSubmit={e => { e.preventDefault(); void selecionar(numero.replace(/\D/g, "")); setNova(false); }}><label>Número com código do país<input aria-label="Número da conversa" autoFocus required pattern="[0-9+ ()-]{10,20}" value={numero} onChange={e => setNumero(e.target.value)} inputMode="tel" placeholder="55 11 99999-9999" /></label><button type="submit">Abrir conversa</button></form>}
      {carregandoLista && <p role="status" className={css.aviso}>Carregando conversas…</p>}
      {erroLista && <p role="alert" className={css.aviso}>{erroLista}</p>}
      <div className={css.filtrosEtiquetas} aria-label="Filtrar por etiqueta"><button type="button" title="Gerenciar etiquetas" aria-label="Gerenciar etiquetas" onClick={() => setEditor("etiquetas")}><Tags size={16} /> Etiquetas</button>{etiquetas.map(item => <button type="button" key={item.id} aria-pressed={etiquetaFiltro === item.id} onClick={() => { setEtiquetaFiltro(atual => atual === item.id ? "" : item.id); setPaginaLista(0); }}><span className={css.corEtiqueta} style={{ backgroundColor: item.cor }} />{item.nome}</button>)}</div>
      <div className={css.lista}>
        {!carregandoLista && !erroLista && !lista.length && <p className={css.aviso}>{busca ? "Nenhuma conversa encontrada." : aguardando ? "Nenhuma conversa aguardando atendimento." : "Suas conversas aparecerão aqui."}</p>}
        {lista.map(item => <div key={item} className={css.linha} data-selecionada={telefone === item}>
          <button type="button" onClick={() => selecionar(item)} aria-pressed={telefone === item}><FotoContato conta={conta} telefone={item} /><span className={css.contato}><strong>{resumos[item]?.nome_contato || comoTelefone(item)}{resumos[item]?.ultima_em && <time className={css.horaLista}>{new Date(resumos[item].ultima_em!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>}</strong><small data-atencao={atencao.includes(item)}>{resumos[item]?.nome_contato ? `${comoTelefone(item)} \u00b7 ` : ""}{atencao.includes(item) ? "Aguardando atendimento" : resumos[item]?.ultima_mensagem ? `${resumos[item].ultima_direcao === "saida" ? "Você: " : ""}${rotuloDaOpcao(resumos[item].ultima_mensagem!, new Map())}` : "Abrir histórico da conversa"}</small>{!!resumos[item]?.etiquetas?.length && <span className={css.etiquetasNaLista}>{resumos[item].etiquetas!.slice(0, 2).map(tag => <span key={tag.id} style={{ borderColor: tag.cor, color: tag.cor }}>{tag.nome}</span>)}{resumos[item].etiquetas!.length > 2 && <span>+{resumos[item].etiquetas!.length - 2}</span>}</span>}</span></button>
          <button type="button" disabled={ocupado} onClick={() => { setErroExclusao(""); setExcluir(item); }} aria-label={`Remover conversa ${comoTelefone(item)}`} title="Remover da Central"><Trash2 size={15} /></button>
        </div>)}
      </div>
      {totalConversas > 50 && <Paginacao pagina={paginaLista + 1} total={totalConversas} porPagina={50} onPagina={v => setPaginaLista(v - 1)} rotulo="Páginas de conversas" />}
    </aside>
    <div className={css.chat} data-aberta={!!telefone}>
      {!telefone ? <div className={css.vazio}><MessageCircle size={76} strokeWidth={1} /><h2>WhatsApp da equipe</h2><p>Selecione uma conversa para começar.<br />Alterne entre seus números nas abas acima.</p></div> : <>
        <header className={css.cabecalhoChat}><button type="button" onClick={() => setTelefone("")} className={css.voltar} aria-label="Voltar às conversas"><ArrowLeft size={22} /></button><FotoContato key={`${conta}:${telefone}`} conta={conta} telefone={telefone} destaque /><div className={css.identidadeChat}><h2>{dados?.nomeContato || resumos[telefone]?.nome_contato || comoTelefone(telefone)}</h2>{(dados?.nomeContato || resumos[telefone]?.nome_contato) && <small>{comoTelefone(telefone)}</small>}</div><button type="button" className={css.editarConversa} onClick={() => setEditor("conversa")} aria-label="Editar nome e etiquetas" title="Editar nome e etiquetas"><Pencil size={16} /></button>{dados && <ModoConversaWhatsapp conta={conta} key={`${telefone}-${dados.modo}-${dados.assumida}`} telefone={telefone} modo={dados.modo} assumida={dados.assumida} aoAtualizar={atualizarConversa} />}</header>
        {erro && <p role="alert" className={css.aviso}>{erro}</p>}
        {!dados && <div className={css.vazio} role="status"><LoaderCircle className="animate-spin" size={26} />Carregando conversa…</div>}
        {dados && <div className={css.historico}>
          <div ref={listaMensagens} onScroll={aoRolar} aria-label="Histórico da conversa" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none] [scrollbar-gutter:stable]">
            <ol ref={conteudo} className={css.mensagens}>
              {carregandoMais && <li role="status" className={css.dia}>Carregando mensagens anteriores…</li>}
              {dados.temMais && !carregandoMais && <li className={css.dia}><button type="button" onClick={carregarMais}>Carregar mensagens anteriores</button></li>}
              {dados.historicoOculto && <li className={css.dia}><button type="button" onClick={() => setAntigas(true)}>Mostrar histórico anterior</button></li>}
              {mensagens.map((m, i) => {
                const dia = new Date(m.criado_em).toLocaleDateString("pt-BR");
                const novoDia = !i || new Date(mensagens[i - 1].criado_em).toLocaleDateString("pt-BR") !== dia;
                return <li key={m.id} className="contents">
                  {novoDia && <div className={css.dia}>{dia}</div>}
                  <article data-mensagem={m.id} className={css.bolha} data-saida={m.direcao === "saida"}>
                    {(m.tipo === "contact" || m.tipo === "contacts") ? <ContatosDaMensagem conteudo={m.conteudo} /> : !(m.conteudo.media) && <p>{texto(m.conteudo, m.tipo, rotulosPorMensagem.get(m.id))}</p>}<AnexoDaMensagem mensagem={m} />
                    {m.direcao === "saida" && Array.isArray(m.conteudo.opcoes_bot) && <div className={css.opcoesMensagem}>{opcoesDaMensagem(m.conteudo).map(opcao => <span key={opcao.id}>{opcao.titulo}</span>)}</div>}
                    <div className={css.meta}><time dateTime={m.criado_em}>{new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>{m.direcao === "saida" && <span aria-label={m.status} title={m.status}>{m.status === "lida" || m.status === "entregue" ? <CheckCheck size={16} data-lida={m.status === "lida"} /> : m.status === "falha" ? <CircleAlert size={14} /> : <Check size={16} />}</span>}</div>
                  </article>
                </li>;
              })}
              {dados.fila.map(m => <li key={m.id} className={css.bolha} data-saida="true"><p>{texto(m.conteudo)}</p><span className={css.meta}>{m.status === "falha" ? <CircleAlert size={13} /> : <Clock3 size={13} />}{m.status === "falha" ? "Falha · aguardando nova tentativa" : "Na fila de envio"}</span></li>)}
              {!mensagens.length && !dados.fila.length && <li className={css.dia}>Nenhuma mensagem registrada nesta conversa.</li>}
            </ol>
          </div>
          {longeDoFim && <button type="button" onClick={descer} aria-label="Ir para mensagens recentes" className={`${novas ? estilos.novas : ""} absolute bottom-4 right-4 z-10 flex items-center gap-2 rounded-full bg-surface-container-lowest p-3 shadow-lg`}><ArrowDown size={21} />{novas > 0 && <span>{novas}</span>}</button>}
        </div>}
        <div className={css.compositor}><EnviarMensagemWhatsapp conta={conta} key={telefone} telefones={[telefone]} fixarTelefone aoEnviar={(id, mensagem) => { setDados(anterior => anterior ? { ...anterior, modo: "atendimento_humano", assumida: true, fila: id ? [...anterior.fila.filter(item => item.id !== id), { id, status: "pendente", conteudo: { texto: mensagem } }] : anterior.fila } : anterior); atualizarConversa(); }} /></div>
      </>}
    </div>
    <dialog ref={modal} aria-labelledby={`excluir-${conta}`} onCancel={e => { e.preventDefault(); if (!ocupado) setExcluir(""); }} className={css.modal}>
      <header><h2 id={`excluir-${conta}`}>Remover conversa da Central?</h2></header><p>A conversa com <strong>{comoTelefone(excluir)}</strong> sairá da lista. O histórico será preservado.</p>
      {erroExclusao && <p role="alert">{erroExclusao}</p>}
      <div className="mt-6 flex justify-end gap-4"><button type="button" autoFocus disabled={ocupado} onClick={() => setExcluir("")}>Cancelar</button><button type="button" disabled={ocupado} onClick={remover} className={css.primario}>{ocupado ? "Removendo…" : "Remover conversa"}</button></div>
    </dialog>
    {editor && <EditorConversaWhatsapp key={`${conta}:${telefone}:${editor}`} conta={conta} telefone={editor === "conversa" ? telefone : undefined} nomeAtual={dados?.nomeContato ?? resumos[telefone]?.nome_contato} etiquetas={etiquetas} aplicadas={dados?.etiquetas ?? resumos[telefone]?.etiquetas ?? []} aoFechar={() => setEditor(null)} aoAtualizar={mudaram => { if (mudaram) setRevisaoEtiquetas(v => v + 1); atualizarConversa(); }} />}
  </section>;
}
