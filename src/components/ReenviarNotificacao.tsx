"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";

export function ReenviarNotificacao({ notificacao }: { notificacao: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  function reenviar() {
    iniciar(async () => {
      setErro(null);
      try {
        const resposta = await fetch("/api/operacao/notificacoes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ escopo: "reenviar", notificacao }) });
        const dados = (await resposta.json().catch(() => ({}))) as { mensagem?: string };
        if (!resposta.ok) throw new Error(dados.mensagem ?? "Não foi possível reenfileirar.");
        setEnviada(true);
      } catch (causa) { setErro(causa instanceof Error ? causa.message : "Não foi possível reenfileirar."); }
    });
  }
  if (enviada) return <span className="font-label-sm text-green-800">reenvio agendado</span>;
  return <span className="inline-flex items-center gap-2"><button type="button" onClick={reenviar} disabled={pendente} className="inline-flex h-8 items-center gap-1 rounded-md bg-surface-container-high px-2 font-label-sm text-on-surface disabled:opacity-50"><RotateCw className={pendente ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />Reenviar</button>{erro && <span role="alert" className="font-label-sm text-primary">{erro}</span>}</span>;
}
