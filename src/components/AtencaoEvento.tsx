"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";

export function AtencaoEvento({ evento, marcada, permitido }: { evento: string; marcada: boolean; permitido: boolean }) {
  const [atencao, setAtencao] = useState(marcada);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  if (!permitido) return atencao ? <span className="flex items-center gap-2 rounded-lg bg-primary/15 px-3 py-2 text-sm text-primary"><Flag size={16} />Com atenção</span> : null;
  return <div>
    <button type="button" aria-pressed={atencao} disabled={pendente} onClick={() => iniciar(async () => {
      setErro("");
      try {
        const r = await fetch("/api/operacao/notificacoes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ escopo: "atencao_evento", evento, atencao: !atencao }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.mensagem ?? "Não foi possível salvar.");
        setAtencao(d.atencao); router.refresh();
      } catch (e) { setErro(e instanceof Error ? e.message : "Falha de rede."); }
    })} className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:opacity-50 ${atencao ? "bg-primary/15 text-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-high"}`}>
      {pendente ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />} {atencao ? "Remover atenção" : "Marcar atenção"}
    </button>
    {erro && <p role="alert" className="mt-1 text-sm text-error">{erro}</p>}
  </div>;
}
