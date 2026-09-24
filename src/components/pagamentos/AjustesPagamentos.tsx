"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, SlidersHorizontal, X } from "lucide-react";
import { ConfigurarInfinitePay } from "./PainelPagamentos";
import { ConfigurarPrecosReserva, type PrecosReserva } from "./ConfigurarPrecosReserva";
import { ConfigurarCapacidade } from "./ConfigurarCapacidade";
import { formatBRL } from "../../lib/moeda";

export function AjustesPagamentos({ conta, precos, admin, ambiente }: {
  conta: { handle: string; habilitado: boolean } | null;
  precos: PrecosReserva | null;
  admin: boolean;
  ambiente: boolean;
}) {
  const [aberto, setAberto] = useState<"conta" | "precos" | "capacidade" | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const contaBotao = useRef<HTMLButtonElement>(null);
  const precosBotao = useRef<HTMLButtonElement>(null);
  const capacidadeBotao = useRef<HTMLButtonElement>(null);
  function fechar() {
    (aberto === "conta" ? contaBotao : aberto === "capacidade" ? capacidadeBotao : precosBotao).current?.focus();
    setAberto(null);
  }
  useEffect(() => {
    if (!aberto) return;
    const fora = (event: PointerEvent) => {
      if (!raiz.current?.contains(event.target as Node)) setAberto(null);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);
  const ativo = ambiente && conta?.habilitado;
  const botao = "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
  return <div ref={raiz} className="relative z-20" onKeyDown={e => { if (e.key === "Escape" && aberto) { e.stopPropagation(); fechar(); } }}>
    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-surface-container-low p-1.5">
      <span className="px-2 text-xs text-on-surface-variant">Configurações</span>
      <button ref={contaBotao} type="button" className={botao} aria-expanded={aberto === "conta"} aria-controls="ajuste-conta" onClick={() => setAberto(aberto === "conta" ? null : "conta")}>
        <CreditCard size={16} className="text-on-surface-variant" />
        <span>Conta <span className="text-on-surface-variant">· {conta?.handle || "Configurar"}</span></span>
        <ChevronDown size={14} className={aberto === "conta" ? "rotate-180" : ""} />
      </button>
      <span className={`rounded-full px-2 py-0.5 text-xs ${ativo ? "bg-tertiary-container text-on-tertiary-container" : "bg-surface-container-high text-on-surface-variant"}`}>{ativo ? "Ativa" : "Pausada"}</span>
      <span className="mx-2 hidden h-5 w-px bg-outline-variant/40 sm:block" />
      <button ref={precosBotao} type="button" className={botao} aria-expanded={aberto === "precos"} aria-controls="ajuste-precos" onClick={() => setAberto(aberto === "precos" ? null : "precos")}>
        <SlidersHorizontal size={16} className="text-on-surface-variant" />
        <span>Preços e sinal</span>
        {precos && <span className="text-on-surface-variant">{formatBRL(precos.adulto_centavos / 100)} · {precos.sinal_percentual}%</span>}
        <ChevronDown size={14} className={aberto === "precos" ? "rotate-180" : ""} />
      </button>
      <button ref={capacidadeBotao} type="button" className={botao} aria-controls="ajuste-capacidade" aria-expanded={aberto === "capacidade"} onClick={() => setAberto(aberto === "capacidade" ? null : "capacidade")}><SlidersHorizontal size={16} />Capacidade e equipe<ChevronDown size={14}/></button>
    </div>
    {aberto && <section id={`ajuste-${aberto}`} aria-label={aberto === "conta" ? "Configurar conta recebedora" : aberto === "capacidade" ? "Configurar capacidade e equipe" : "Configurar preços e sinal"} className="absolute left-0 top-full mt-2 max-h-[65dvh] w-full max-w-2xl overflow-y-auto rounded-xl bg-surface-container-lowest p-1 shadow-xl [&_form]:border-0">
      <div className="flex justify-end px-2 pt-1"><button type="button" aria-label="Fechar configurações" onClick={fechar} className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high"><X size={18} /></button></div>
      {aberto === "conta" ? <ConfigurarInfinitePay inicial={conta} admin={admin} ambiente={ambiente} /> : aberto === "capacidade" ? <ConfigurarCapacidade admin={admin} /> : <ConfigurarPrecosReserva inicial={precos} admin={admin} />}
    </section>}
  </div>;
}
