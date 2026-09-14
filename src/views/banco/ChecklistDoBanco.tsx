"use client";

import { useState } from "react";
import { CheckSquare, ChefHat, Square, Truck } from "lucide-react";

export interface ItemDoChecklistBanco {
  o_que: string;
  detalhe: string | null;
}

/**
 * Mesmo cartão e hierarquia do desenho, com conteúdo derivado do evento real.
 * A confirmação ainda é local porque o banco não tem uma tabela de checklist.
 */
export function ChecklistDoBanco({ evento, itens }: { evento: string; itens: ItemDoChecklistBanco[] }) {
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());
  const [liberado, setLiberado] = useState(false);
  const progresso = itens.length ? Math.round((concluidos.size / itens.length) * 100) : 0;
  const alternar = (chave: string) => setConcluidos((antes) => {
    const proximo = new Set(antes);
    if (proximo.has(chave)) proximo.delete(chave); else proximo.add(chave);
    return proximo;
  });

  return <div className="mx-auto max-w-2xl space-y-6">
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm">
      <h1 className="mb-2 flex items-center gap-2 font-headline-md text-headline-md text-on-surface"><ChefHat className="text-primary" />Checklist Pré-Evento</h1>
      <p className="mb-6 font-body-md text-body-md text-on-surface-variant">Evento: {evento}</p>
      <div className="mb-6"><div className="mb-2 flex justify-between font-label-md text-label-md"><span className="text-on-surface">Progresso</span><span className="text-primary">{progresso}%</span></div><div className="h-2.5 w-full rounded-full bg-surface-container"><div className="h-2.5 rounded-full bg-primary transition-all duration-500" style={{ width: `${progresso}%` }} /></div></div>
      <div className="space-y-3">{itens.map((item, indice) => {
        const chave = `${indice}-${item.o_que}`; const marcado = concluidos.has(chave);
        return <button key={chave} type="button" aria-pressed={marcado} onClick={() => { alternar(chave); setLiberado(false); }} className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${marcado ? "border-outline-variant/50 bg-surface-container-low text-on-surface-variant" : "border-primary/20 bg-surface-container-lowest text-on-surface shadow-sm hover:border-primary/50"}`}>
          <span className={marcado ? "text-tertiary" : "text-on-surface-variant/50"}>{marcado ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}</span>
          <span className="min-w-0"><span className={`block font-label-md text-label-md ${marcado ? "line-through opacity-70" : ""}`}>{item.o_que}</span>{item.detalhe && <span className="mt-0.5 block font-body-sm text-body-sm text-on-surface-variant">{item.detalhe}</span>}</span>
        </button>;
      })}</div>
      <button type="button" disabled={progresso < 100} onClick={() => setLiberado(true)} className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-label-lg text-label-lg transition-colors ${progresso === 100 ? "bg-primary text-on-primary shadow-lg hover:bg-primary/90" : "cursor-not-allowed bg-surface-container text-on-surface-variant/70"}`}><Truck className="h-5 w-5" />{liberado ? "Saída liberada nesta sessão" : "Liberar Saída"}</button>
    </div>
  </div>;
}
