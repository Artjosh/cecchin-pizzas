"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export function AbasCentral({ conversas, children }: { conversas: ReactNode; children: ReactNode }) {
  const [aba, setAba] = useState("conversas");
  const parametros = useSearchParams();
  const destino = parametros.toString();
  useEffect(() => { setAba("conversas"); }, [destino]);
  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <nav aria-label="Seções da Central" className="flex shrink-0 gap-2">
      <button type="button" aria-pressed={aba === "conversas"} onClick={() => setAba("conversas")} className="rounded-lg bg-surface-container px-4 py-2 aria-pressed:bg-primary aria-pressed:text-on-primary">Conversas</button>
      <button type="button" aria-pressed={aba === "pendencias"} onClick={() => setAba("pendencias")} className="rounded-lg bg-surface-container px-4 py-2 aria-pressed:bg-primary aria-pressed:text-on-primary">Contatos pendentes</button>
    </nav>
    <div className={aba === "conversas" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}>{conversas}</div>
    <div className={aba === "pendencias" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>{children}</div>
  </div>;
}
