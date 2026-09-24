"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Plus, QrCode, RefreshCw, X, Pencil, Clock3 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ConversaReal } from "./ConversaReal";
import { formatarTelefoneWhatsApp as comoTelefone } from "../../lib/telefone-whatsapp";
import css from "./WhatsApp.module.css";
import { SomAtendimento } from "./SomAtendimento";

type Conta = { id: string; nome: string; telefone: string | null; timeout_humano_minutos: number; estado: "conectado" | "qr" | "conectando" | "indisponivel" };
const rotulo = { conectado: "Conectado", qr: "Aguardando QR", conectando: "Conectando", indisponivel: "Indisponível" };
export function ContasWhatsApp() {
  const parametros = useSearchParams();
  const [contas, setContas] = useState<Conta[]>([]);
  const [ativa, setAtiva] = useState(parametros.get("conta") ?? "principal");
  const [abertas, setAbertas] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [dialogo, setDialogo] = useState<"nova" | "editar" | "conectar" | "tempo" | null>(null);
  const [nome, setNome] = useState("");
  const [prazo, setPrazo] = useState("60");
  const [semPrazo, setSemPrazo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const [qrFalhou, setQrFalhou] = useState(false);
  const [qrVersao, setQrVersao] = useState(0);
  const modal = useRef<HTMLDialogElement>(null);
  const conta = contas.find(c => c.id === ativa);
  useEffect(() => { if (dialogo) modal.current?.showModal(); else modal.current?.close(); }, [dialogo]);
  useEffect(() => { const id = parametros.get("conta"); if (id || parametros.has("telefone")) setAtiva(id ?? "principal"); }, [parametros]);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function carregar() {
      try {
        const r = await fetch("/api/operacao/whatsapp/contas", { cache: "no-store", signal: controller.signal });
        const d = await r.json(); if (!r.ok) throw new Error(d.mensagem);
        if (controller.signal.aborted) return;
        setContas(d.contas); setErro("");
        setAtiva(id => d.contas.some((c: Conta) => c.id === id) ? id : d.contas[0]?.id ?? "principal");
      } catch (e) { if (!controller.signal.aborted) setErro(e instanceof Error ? e.message : "Falha ao carregar contas."); }
      finally { if (!controller.signal.aborted) timer = setTimeout(carregar, 10000); }
    }
    void carregar(); return () => { controller.abort(); clearTimeout(timer); };
  }, [revisao]);
  useEffect(() => { if (conta) setAbertas(ids => ids.includes(ativa) ? ids : [...ids, ativa]); }, [ativa, !!conta]);
  useEffect(() => {
    if (dialogo !== "conectar") return;
    setQrFalhou(false); setQrVersao(v => v + 1);
    const timer = setInterval(() => { setQrFalhou(false); setQrVersao(v => v + 1); }, 15000);
    return () => clearInterval(timer);
  }, [dialogo, ativa]);
  function abrir(tipo: typeof dialogo) { setAviso(""); setNome(tipo === "editar" ? conta?.nome ?? "" : ""); if (tipo === "tempo") { setSemPrazo(conta?.timeout_humano_minutos === 0); setPrazo(String(conta?.timeout_humano_minutos || 60)); } setDialogo(tipo); }
  async function salvarPrazo() {
    if (ocupado || !conta) return;
    const minutos = semPrazo ? 0 : Number(prazo);
    if (!Number.isInteger(minutos) || !(minutos === 0 || minutos >= 5 && minutos <= 1440)) { setAviso("Informe de 5 a 1440 minutos."); return; }
    setOcupado(true); setAviso("");
    try {
      const r = await fetch("/api/operacao/whatsapp/contas", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta: conta.id, minutos }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.mensagem ?? "Não foi possível salvar o prazo.");
      setContas(anteriores => anteriores.map(item => item.id === conta.id ? { ...item, timeout_humano_minutos: minutos } : item));
      setDialogo(null); setRevisao(v => v + 1);
    } catch (e) { setAviso(e instanceof Error ? e.message : "Não foi possível salvar o prazo."); }
    finally { setOcupado(false); }
  }
  async function salvar(iniciar = false) {
    if (ocupado) return; setOcupado(true); setAviso("");
    try {
      const r = await fetch("/api/operacao/whatsapp/contas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(iniciar ? { conta: ativa, iniciar: true } : { nome, conta: dialogo === "editar" ? ativa : null }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.mensagem);
      setAtiva(d.id); setRevisao(v => v + 1); setAviso(d.aviso ?? "");
      setDialogo(dialogo === "editar" ? null : "conectar");
    } catch (e) { setAviso(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setOcupado(false); }
  }
  return <section className={css.central} aria-label="Central WhatsApp">
    <div className={css.contas}>
      <div role="tablist" aria-label="Contas de WhatsApp" className={css.abas} onKeyDown={e => {
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key) || !contas.length) return;
        e.preventDefault(); const i = contas.findIndex(c => c.id === ativa);
        const n = e.key === "Home" ? 0 : e.key === "End" ? contas.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + contas.length) % contas.length;
        setAtiva(contas[n].id); document.getElementById(`conta-${contas[n].id}`)?.focus();
      }}>
        {contas.map(c => <button key={c.id} id={`conta-${c.id}`} type="button" role="tab" aria-selected={ativa === c.id} aria-controls={`painel-${c.id}`} tabIndex={ativa === c.id ? 0 : -1} onClick={() => setAtiva(c.id)} className={css.aba}>
          <MessageCircle size={19} /><span><strong>{c.nome}</strong><small><i data-conectado={c.estado === "conectado"} />{c.telefone ? comoTelefone(c.telefone) : rotulo[c.estado]}</small></span>
        </button>)}
      </div>
      <button type="button" className={css.adicionar} onClick={() => abrir("nova")} title="Adicionar WhatsApp" aria-label="Adicionar WhatsApp"><Plus size={21} /><span>Adicionar</span></button>
    </div>
    {erro && <div role="alert" className={css.aviso}>{erro}<button onClick={() => setRevisao(v => v + 1)}>Tentar novamente</button></div>}
    {!contas.length && !erro && <div className={css.vazio} role="status">Carregando seus WhatsApps…</div>}
    {conta && <div className={css.estadoConta}><span><i data-conectado={conta.estado === "conectado"} />{rotulo[conta.estado]}</span><SomAtendimento compacto /><button type="button" onClick={() => abrir("tempo")} title="Configurar retorno automático ao bot"><Clock3 size={14} /> Bot: {conta.timeout_humano_minutos === 0 ? "sem prazo" : `${conta.timeout_humano_minutos ?? 60} min`}</button><button type="button" onClick={() => abrir("editar")}><Pencil size={13} /> Renomear</button><button type="button" onClick={() => abrir("conectar")}><QrCode size={15} /> Conexão</button></div>}
    {contas.map(({ id }) => <div key={id} id={`painel-${id}`} role="tabpanel" aria-labelledby={`conta-${id}`} hidden={id !== ativa} className={css.painelConta}>
      {abertas.includes(id) && <ConversaReal telefones={[]} conta={id} ativa={id === ativa} />}
    </div>)}
    <dialog ref={modal} className={css.modal} onCancel={e => { e.preventDefault(); if (!ocupado) setDialogo(null); }} aria-labelledby="titulo-conta">
      <header><h2 id="titulo-conta">{dialogo === "nova" ? "Adicionar WhatsApp" : dialogo === "editar" ? "Nome do WhatsApp" : dialogo === "tempo" ? "Retorno automático ao bot" : conta?.nome ?? "Conectar WhatsApp"}</h2><button type="button" disabled={ocupado} aria-label="Fechar" onClick={() => setDialogo(null)}><X size={22} /></button></header>
      {dialogo === "conectar" ? <>
        {conta?.estado === "conectado" ? <div className={css.conectado}><MessageCircle size={42} /><h3>WhatsApp conectado</h3><p>{comoTelefone(conta.telefone)}</p></div> : <>
          <p>No celular, abra <strong>WhatsApp → Dispositivos conectados → Conectar dispositivo</strong> e escaneie o código.</p>
          <div className={css.qr}>{conta?.estado === "qr" && !qrFalhou ? <img key={qrVersao} src={`/api/operacao/whatsapp/contas?conta=${ativa}&v=${qrVersao}`} alt="QR para conectar este WhatsApp" onError={() => setQrFalhou(true)} /> : <p>{qrFalhou ? "O código expirou. Atualizando…" : "Aguardando código de conexão…"}</p>}</div>
          <button type="button" disabled={ocupado} className={css.primario} onClick={() => salvar(true)}><RefreshCw size={16} />{ocupado ? "Conectando…" : "Conectar / tentar novamente"}</button>
        </>}
      </> : dialogo === "tempo" ? <form onSubmit={e => { e.preventDefault(); void salvarPrazo(); }}><p>Quando cliente e equipe ficam sem trocar mensagens por este tempo, a conversa volta para o bot. O prazo vale para este WhatsApp.</p><label>Minutos sem atividade<input autoFocus type="number" min={5} max={1440} step={1} required={!semPrazo} disabled={semPrazo} value={prazo} onChange={e => setPrazo(e.target.value)} /></label><label className={css.linhaCheckbox}><input type="checkbox" checked={semPrazo} onChange={e => setSemPrazo(e.target.checked)} /> Desativar retorno automático</label><button type="submit" disabled={ocupado} className={css.primario}>{ocupado ? "Salvando…" : "Salvar prazo"}</button></form> : <form onSubmit={e => { e.preventDefault(); void salvar(); }}><p>Use um nome para identificar este número nas abas.</p><label>Nome<input autoFocus required maxLength={60} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Comercial" /></label><button type="submit" disabled={ocupado} className={css.primario}>{ocupado ? "Salvando…" : dialogo === "nova" ? "Adicionar e conectar" : "Salvar nome"}</button></form>}
      {aviso && <p role="status" className={css.aviso}>{aviso}</p>}
    </dialog>
  </section>;
}
