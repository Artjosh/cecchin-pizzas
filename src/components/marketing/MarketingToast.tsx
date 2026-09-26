"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CircleAlert, X } from "lucide-react";

export function MarketingToast({ mensagem, erro = false, aoFechar }: { mensagem: string; erro?: boolean; aoFechar: () => void }) {
  const [pronto, setPronto] = useState(false);
  useEffect(() => { setPronto(true); }, []);
  useEffect(() => {
    if (!mensagem) return;
    const temporizador = window.setTimeout(aoFechar, erro ? 7000 : 4500);
    return () => window.clearTimeout(temporizador);
  }, [mensagem, erro, aoFechar]);
  if (!pronto || !mensagem) return null;
  return createPortal(<div role={erro ? "alert" : "status"} className={`fixed bottom-5 right-5 z-[100] flex max-w-[min(26rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border p-4 shadow-xl ${erro ? "border-error/40 bg-error-container text-on-error-container" : "border-outline-variant/30 bg-surface-container-high text-on-surface"}`}>
    {erro ? <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
    <span className="flex-1 text-sm">{mensagem}</span>
    <button type="button" aria-label="Fechar aviso" onClick={aoFechar} className="rounded-md p-0.5 hover:bg-surface-container"><X className="h-4 w-4" /></button>
  </div>, document.body);
}
