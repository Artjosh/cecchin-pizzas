"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { Etiqueta } from "./useHistoricoConversa";
import css from "./WhatsApp.module.css";

const cores = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#38bdf8", "#818cf8", "#c084fc", "#f472b6"];

export function EditorConversaWhatsapp({ conta, telefone, nomeAtual, etiquetas, aplicadas, aoFechar, aoAtualizar }: {
  conta: string; telefone?: string; nomeAtual?: string | null; etiquetas: Etiqueta[]; aplicadas: Etiqueta[];
  aoFechar: () => void; aoAtualizar: (etiquetasMudaram: boolean) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [nome, setNome] = useState(nomeAtual ?? "");
  const [idsAplicados, setIdsAplicados] = useState(() => new Set(aplicadas.map(item => item.id)));
  const [etiquetaEditada, setEtiquetaEditada] = useState<string | null>(null);
  const [nomeEtiqueta, setNomeEtiqueta] = useState("");
  const [cor, setCor] = useState(cores[4]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => { dialogo.current?.showModal(); return () => dialogo.current?.close(); }, []);
  async function enviar(corpo: Record<string, unknown>) {
    const r = await fetch("/api/operacao/whatsapp/etiquetas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta, ...corpo }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.mensagem ?? "Não foi possível salvar a alteração.");
    return d;
  }
  async function salvarNome(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!telefone || ocupado) return;
    setOcupado(true); setErro("");
    try {
      const r = await fetch("/api/operacao/whatsapp", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "nome", conta, telefone, nome }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.mensagem ?? "Não foi possível salvar o nome.");
      aoAtualizar(false); aoFechar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar o nome."); }
    finally { setOcupado(false); }
  }
  async function alternar(id: string) {
    if (!telefone || ocupado) return;
    const aplicar = !idsAplicados.has(id);
    setOcupado(true); setErro("");
    try {
      await enviar({ acao: "atribuir", telefone, id, aplicar });
      setIdsAplicados(anteriores => { const novos = new Set(anteriores); if (aplicar) novos.add(id); else novos.delete(id); return novos; });
      aoAtualizar(false);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao alterar a etiqueta."); }
    finally { setOcupado(false); }
  }
  async function salvarEtiqueta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (ocupado) return;
    setOcupado(true); setErro("");
    try {
      await enviar({ acao: "salvar", id: etiquetaEditada, nome: nomeEtiqueta.trim(), cor });
      setEtiquetaEditada(null); setNomeEtiqueta(""); setCor(cores[4]); aoAtualizar(true);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar a etiqueta."); }
    finally { setOcupado(false); }
  }
  async function removerEtiqueta(item: Etiqueta) {
    if (ocupado || !window.confirm(`Remover a etiqueta "${item.nome}" de todas as conversas?`)) return;
    setOcupado(true); setErro("");
    try { await enviar({ acao: "remover", id: item.id }); setIdsAplicados(anteriores => { const novos = new Set(anteriores); novos.delete(item.id); return novos; }); aoAtualizar(true); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao remover a etiqueta."); }
    finally { setOcupado(false); }
  }

  return <dialog ref={dialogo} className={css.modal} onCancel={e => { e.preventDefault(); if (!ocupado) aoFechar(); }} aria-labelledby="titulo-editor-conversa">
    <header><h2 id="titulo-editor-conversa">{telefone ? "Organizar conversa" : "Etiquetas"}</h2><button type="button" aria-label="Fechar" disabled={ocupado} onClick={aoFechar}><X size={22} /></button></header>
    {telefone && <form onSubmit={salvarNome} className={css.editorNome}><label>Nome do contato<input value={nome} onChange={e => setNome(e.target.value)} maxLength={80} placeholder="Nome para identificar esta conversa" /></label><button type="submit" disabled={ocupado} className={css.primario}>Salvar nome</button></form>}
    <div className={css.editorEtiquetas}>
      <h3>Etiquetas da conversa</h3>
      {telefone ? <div className={css.opcoesEtiquetas}>{etiquetas.length ? etiquetas.map(item => <button type="button" key={item.id} disabled={ocupado} aria-pressed={idsAplicados.has(item.id)} onClick={() => void alternar(item.id)}><span className={css.corEtiqueta} style={{ backgroundColor: item.cor }} />{item.nome}{idsAplicados.has(item.id) && <Check size={15} />}</button>) : <p>Crie uma etiqueta abaixo para organizar esta conversa.</p>}</div> : <p>Crie etiquetas e use-as para filtrar as conversas deste WhatsApp.</p>}
      <h3>Gerenciar etiquetas ({etiquetas.length}/20)</h3>
      <div className={css.etiquetasGerenciar}>{etiquetas.map(item => <div key={item.id}><span className={css.corEtiqueta} style={{ backgroundColor: item.cor }} /><span>{item.nome}</span><button type="button" aria-label={`Editar etiqueta ${item.nome}`} title="Editar" onClick={() => { setEtiquetaEditada(item.id); setNomeEtiqueta(item.nome); setCor(item.cor); }}><Pencil size={15} /></button><button type="button" aria-label={`Remover etiqueta ${item.nome}`} title="Remover" disabled={ocupado} onClick={() => void removerEtiqueta(item)}><Trash2 size={15} /></button></div>)}</div>
      {(etiquetaEditada || etiquetas.length < 20) && <form onSubmit={salvarEtiqueta} className={css.formEtiqueta}><label>{etiquetaEditada ? "Editar etiqueta" : "Nova etiqueta"}<input required maxLength={32} value={nomeEtiqueta} onChange={e => setNomeEtiqueta(e.target.value)} placeholder="Ex.: Pedido novo" /></label><div className={css.paletaEtiqueta} aria-label="Cor da etiqueta">{cores.map(item => <button type="button" key={item} aria-label={`Cor ${item}`} aria-pressed={cor === item} onClick={() => setCor(item)} style={{ backgroundColor: item }}>{cor === item && <Check size={15} />}</button>)}</div><div className={css.acoesEtiqueta}><button type="submit" disabled={ocupado || !nomeEtiqueta.trim()} className={css.primario}>{etiquetaEditada ? "Salvar etiqueta" : "Criar etiqueta"}</button>{etiquetaEditada && <button type="button" onClick={() => { setEtiquetaEditada(null); setNomeEtiqueta(""); setCor(cores[4]); }}>Cancelar edição</button>}</div></form>}
    </div>
    {erro && <p role="alert" className={css.aviso}>{erro}</p>}
  </dialog>;
}
