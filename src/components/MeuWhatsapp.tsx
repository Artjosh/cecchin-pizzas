"use client";
import { useState } from "react";

export function MeuWhatsapp({ telefoneInicial, habilitadoInicial }: { telefoneInicial: string; habilitadoInicial: boolean }) {
  const [telefone, setTelefone] = useState(telefoneInicial); const [habilitado, setHabilitado] = useState(habilitadoInicial); const [estado, setEstado] = useState(""); const [enviando, setEnviando] = useState(false);
  async function salvar() {
    setEnviando(true); setEstado("");
    try {
      const r = await fetch("/api/operacao/notificacoes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ escopo: "meu_whatsapp", telefone, receber_whatsapp: habilitado }) });
      const dados = (await r.json().catch(() => ({}))) as { mensagem?: string };
      if (!r.ok) throw new Error(dados.mensagem ?? "Não foi possível salvar.");
      setEstado("Telefone e preferência de WhatsApp salvos.");
    } catch (causa) { setEstado(causa instanceof Error ? causa.message : "Não foi possível salvar."); } finally { setEnviando(false); }
  }
  return <section className="rounded-xl bg-surface-container-low p-space-md"><h2 className="font-headline-sm text-on-surface">WhatsApp da reserva</h2><p className="mt-1 font-body-sm text-on-surface-variant">Vincule seu número para receber atualizações e consultar “minha reserva” no bot.</p><div className="mt-3 flex flex-wrap items-end gap-2"><label className="flex min-w-52 flex-1 flex-col gap-1 font-label-sm text-on-surface-variant">Número com DDD<input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="51999999999" className="h-10 rounded-lg bg-surface-container-lowest px-3 text-on-surface" /></label><label className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-lowest px-3 font-label-sm text-on-surface"><input type="checkbox" checked={habilitado} onChange={(e) => setHabilitado(e.target.checked)} />Receber avisos</label><button type="button" disabled={enviando} onClick={salvar} className="h-10 rounded-lg bg-primary px-4 font-label-md text-on-primary disabled:opacity-60">{enviando ? "Salvando…" : "Salvar"}</button></div>{estado && <p role="status" className="mt-2 font-body-sm text-on-surface-variant">{estado}</p>}</section>;
}
