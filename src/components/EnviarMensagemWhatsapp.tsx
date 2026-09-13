"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

export function EnviarMensagemWhatsapp({ telefones }: { telefones: string[] }) {
  const [telefone, setTelefone] = useState(telefones[0] ?? "");
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<"parado" | "enviando" | "enviado" | "erro">("parado");
  const [mensagem, setMensagem] = useState("");

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEstado("enviando");
    setMensagem("");
    try {
      const resposta = await fetch("/api/operacao/whatsapp", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ telefone, texto }),
      });
      const dados = (await resposta.json().catch(() => ({}))) as { mensagem?: string };
      if (!resposta.ok) throw new Error(dados.mensagem ?? "Não foi possível enfileirar a mensagem.");
      setTexto(""); setEstado("enviado"); setMensagem("Mensagem colocada na fila de envio.");
    } catch (erro) {
      setEstado("erro"); setMensagem(erro instanceof Error ? erro.message : "Não foi possível enfileirar a mensagem.");
    }
  }

  return (
    <form onSubmit={enviar} className="rounded-xl bg-surface-container-low p-space-md flex flex-col gap-space-sm">
      <div><h2 className="font-headline-sm text-headline-sm text-on-surface">Responder pela Central</h2><p className="mt-1 font-body-sm text-on-surface-variant">O envio usa o provedor conectado. Na Cloud API, texto livre exige uma conversa aberta nas últimas 24 horas; no WhatsApp Web local, ele segue a conversa normal do aplicativo.</p></div>
      <label className="flex flex-col gap-1 font-label-sm text-on-surface-variant">Número<input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" required placeholder="5551999999999" className="h-11 rounded-lg bg-surface-container-lowest px-3 text-on-surface" list="conversas-whatsapp" /><datalist id="conversas-whatsapp">{telefones.map((item) => <option key={item} value={item} />)}</datalist></label>
      <label className="flex flex-col gap-1 font-label-sm text-on-surface-variant">Mensagem<textarea value={texto} onChange={(e) => setTexto(e.target.value)} required maxLength={4096} rows={3} className="rounded-lg bg-surface-container-lowest p-3 text-on-surface resize-y" /></label>
      <div className="flex flex-wrap items-center gap-space-sm"><button type="submit" disabled={estado === "enviando"} className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md flex items-center gap-2 disabled:opacity-60"><Send className="w-4 h-4" />{estado === "enviando" ? "Enfileirando…" : "Enviar"}</button>{mensagem && <span className={estado === "erro" ? "font-body-sm text-error" : "font-body-sm text-primary"}>{mensagem}</span>}</div>
    </form>
  );
}
