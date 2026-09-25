"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function ResponderEscala({ escala }: { escala: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  function responder(aceitar: boolean) {
    iniciar(async () => {
      setErro(null);
      try {
        const r = await fetch("/api/operacao/escala", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "responder", escala, aceitar }) });
        if (!r.ok) { const d = (await r.json().catch(() => ({}))) as { mensagem?: string }; throw new Error(d.mensagem ?? "Não foi possível responder."); }
        router.refresh();
      } catch (causa) { setErro(causa instanceof Error ? causa.message : "Falha de rede."); }
    });
  }
  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" disabled={pendente} onClick={() => responder(true)} className="flex h-10 items-center gap-1 rounded-lg bg-primary px-3 font-label-md text-on-primary disabled:opacity-50"><Check className="h-4 w-4" />Aceitar</button>
    <button type="button" disabled={pendente} onClick={() => responder(false)} className="flex h-10 items-center gap-1 rounded-lg bg-surface-container px-3 font-label-md text-on-surface disabled:opacity-50"><X className="h-4 w-4" />Recusar</button>
    {erro && <span role="alert" className="font-body-sm text-primary">{erro}</span>}
  </div>;
}
