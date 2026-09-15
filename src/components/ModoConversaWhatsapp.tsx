"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ModoConversaWhatsapp({ telefone, modo, assumida = false, aoAtualizar }: { telefone: string; modo: "automatico" | "atendimento_humano"; assumida?: boolean; aoAtualizar?: () => void }) {
  const router = useRouter();
  const [atual, setAtual] = useState(modo);
  const [atendida, setAtendida] = useState(assumida);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => { setAtual(modo); setAtendida(assumida); }, [telefone, modo, assumida]);
  const humano = atual === "atendimento_humano";

  async function alternar(proximo: "automatico" | "atendimento_humano") {
    setEnviando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/operacao/whatsapp", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ telefone, modo: proximo }) });
      const dados = (await resposta.json().catch(() => ({}))) as { mensagem?: string };
      if (!resposta.ok) throw new Error(dados.mensagem ?? "Não foi possível atualizar a conversa.");
      setAtual(proximo);
      setAtendida(proximo === "atendimento_humano");
      if (aoAtualizar) aoAtualizar(); else router.refresh();
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível atualizar a conversa.");
    } finally {
      setEnviando(false);
    }
  }

  return <span className="inline-flex flex-wrap items-center justify-end gap-2">
    <span className="text-xs text-on-surface-variant">{humano ? atendida ? "Atendimento humano" : "Aguardando atendente · bot pausado" : "Bot ativo"}</span>
    {(!humano || !atendida) && <button type="button" onClick={() => alternar("atendimento_humano")} disabled={enviando} className="h-8 rounded-full bg-surface-container px-3 font-label-sm disabled:opacity-60">Assumir atendimento</button>}
    {humano && <button type="button" onClick={() => alternar("automatico")} disabled={enviando} className="h-8 rounded-full bg-primary px-3 text-on-primary font-label-sm disabled:opacity-60">Devolver ao bot</button>}
    {enviando && <span role="status" className="text-xs">Salvando...</span>}
    {erro && <span role="alert" className="font-body-sm text-error">{erro}</span>}
  </span>;
}
