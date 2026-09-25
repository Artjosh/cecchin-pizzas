"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";

export function EnviarMensagemWhatsapp({ conta = "principal", telefones, fixarTelefone = false, aoEnviar }: { conta?: string; telefones: string[]; fixarTelefone?: boolean; aoEnviar?: (notificacao: string, texto: string) => void }) {
  const router = useRouter();
  const [telefone, setTelefone] = useState(telefones[0] ?? "");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado" | "erro">("parado");
  const [mensagem, setMensagem] = useState("");

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (estado === "enviando" || !texto.trim()) return;
    setEstado("enviando");
    setMensagem("");
    try {
      const resposta = await fetch("/api/operacao/whatsapp", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conta, telefone, texto }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as { mensagem?: string; notificacao?: string };
      if (!resposta.ok) throw new Error(dados.mensagem ?? "Não foi possível enfileirar a mensagem.");
      setTexto(""); setEstado("enviado"); setMensagem("Mensagem colocada na fila de envio.");
      if (aoEnviar) aoEnviar(dados.notificacao ?? "", texto); else router.refresh();
    } catch (erro) {
      setEstado("erro"); setMensagem(erro instanceof Error ? erro.message : "Não foi possível enfileirar a mensagem.");
    }
  }

  if (fixarTelefone) return (
    <form onSubmit={enviar} className="flex flex-col gap-1">
      <div className="flex items-end gap-3"><textarea aria-label="Mensagem" placeholder="Digite uma mensagem" value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (texto.trim() && estado !== "enviando") e.currentTarget.form?.requestSubmit(); } }} required maxLength={4096} rows={1} className="min-h-11 max-h-36 flex-1 resize-y rounded-lg bg-[var(--wa-bg)] px-4 py-3 text-sm outline-none" /><button type="submit" disabled={estado === "enviando" || !texto.trim()} title="Enviar mensagem" aria-label="Enviar mensagem" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--wa-green)] text-white disabled:opacity-40"><Send size={20} /></button></div>
      {mensagem && <span role="status" className={`text-xs ${estado === "erro" ? "text-error" : "text-[var(--wa-muted)]"}`}>{mensagem}</span>}
    </form>
  );

  return (
    <form onSubmit={enviar} className="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm">
      <div><h2 className="font-headline-sm text-headline-sm text-on-surface">Responder pela Central</h2><p className="mt-1 font-body-sm text-on-surface-variant">A mensagem entra na fila e o estado de entrega aparece no histórico.</p></div>
      <label className="flex flex-col gap-1 font-label-sm text-on-surface-variant">Número<input readOnly={fixarTelefone} value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" required placeholder="5551999999999" className="h-11 rounded-lg bg-surface-container-lowest px-3 text-on-surface" list="conversas-whatsapp" /><datalist id="conversas-whatsapp">{telefones.map((item) => <option key={item} value={item} />)}</datalist></label>
      <label className="flex flex-col gap-1 font-label-sm text-on-surface-variant">Mensagem<textarea value={texto} onChange={(e) => setTexto(e.target.value)} required maxLength={4096} rows={3} className="rounded-lg bg-surface-container-lowest p-3 text-on-surface resize-y" /></label>
      <div className="flex flex-wrap items-center gap-space-sm"><button type="submit" disabled={estado === "enviando"} className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md flex items-center gap-2 disabled:opacity-60"><Send className="w-4 h-4" />{estado === "enviando" ? "Enfileirando…" : "Enviar"}</button>{mensagem && <span className={estado === "erro" ? "font-body-sm text-error" : "font-body-sm text-primary"}>{mensagem}</span>}</div>
    </form>
  );
}
