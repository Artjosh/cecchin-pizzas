"use client";

import { useState } from "react";

export function ModoConversaWhatsapp({ telefone, modo }: { telefone: string; modo: "automatico" | "atendimento_humano" }) {
  const [atual, setAtual] = useState(modo);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const humano = atual === "atendimento_humano";

  async function alternar() {
    setEnviando(true);
    setErro("");
    try {
      const proximo = humano ? "automatico" : "atendimento_humano";
      const resposta = await fetch("/api/operacao/whatsapp", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ telefone, modo: proximo }) });
      const dados = (await resposta.json().catch(() => ({}))) as { mensagem?: string };
      if (!resposta.ok) throw new Error(dados.mensagem ?? "Não foi possível atualizar a conversa.");
      setAtual(proximo);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível atualizar a conversa.");
    } finally {
      setEnviando(false);
    }
  }

  return <span className="inline-flex items-center gap-2">
    <button type="button" onClick={alternar} disabled={enviando} title={humano ? "Voltar esta conversa ao bot" : "Assumir esta conversa manualmente"} className={`h-8 rounded-full px-3 font-label-sm disabled:opacity-60 ${humano ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}>
      {enviando ? "Salvando…" : humano ? "Atendimento humano" : "Bot ativo"}
    </button>
    {erro && <span role="alert" className="font-body-sm text-error">{erro}</span>}
  </span>;
}
