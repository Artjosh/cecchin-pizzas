"use client";

import { useEffect, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { PASSOS, useReserva } from "../../views/booking/contexto";

interface PainelPassosProps {
  aberto: boolean;
  aoAbrir: (aberto: boolean) => void;
  aoConfirmar: () => void;
  children: ReactNode;
}

/** A reserva acompanha o mapa; cada etapa abre apenas o cartão necessário. */
export function PainelPassos({
  aberto,
  aoAbrir,
  aoConfirmar,
  children,
}: PainelPassosProps) {
  const {
    currentStep,
    passoLiberado,
    irPara,
    avancar,
    voltar,
    pendencias,
    grandTotal,
    depositVal,
    formatBRL,
  } = useReserva();

  const passoAtual = PASSOS[currentStep - 1];
  const faltando = pendencias(currentStep);
  const podeAvancar = faltando.length === 0;
  const ultimo = currentStep === PASSOS.length;
  const orcamentoPronto = passoLiberado >= 2;

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoAbrir(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoAbrir]);

  const abrirPasso = (numero: number) => {
    irPara(numero);
    aoAbrir(true);
  };

  return (
    <>
      {aberto && (
        <div className="fixed inset-x-0 top-24 bottom-28 z-30 pointer-events-none px-3 sm:px-6">
          <section
            role="dialog"
            aria-label={passoAtual.titulo}
            className={cn(
              "pointer-events-auto absolute flex max-h-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl ring-1 ring-on-surface/10",
              currentStep === 4
                ? "inset-x-3 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:w-[min(44rem,calc(100vw-3rem))] sm:-translate-x-1/2"
                : currentStep === 2
                  ? "inset-x-3 top-0 sm:left-auto sm:right-6 sm:w-[min(26rem,calc(100vw-3rem))]"
                : currentStep === 3
                    ? "inset-x-3 top-0 sm:left-1/2 sm:right-auto sm:w-[min(28rem,calc(100vw-3rem))] sm:-translate-x-1/2"
                    : "inset-x-3 top-0 sm:left-6 sm:right-auto sm:w-[min(28rem,calc(100vw-3rem))]",
            )}
          >
            <header className="flex shrink-0 items-center justify-between gap-space-sm border-b border-outline-variant/30 px-space-md py-space-sm">
              <div className="flex min-w-0 items-center gap-space-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary font-label-md text-label-md">
                  {currentStep}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-label-md text-label-md text-on-surface truncate">
                    {passoAtual.titulo}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                    {passoAtual.desc}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => aoAbrir(false)}
                aria-label="Fechar etapa e ver mapa"
                className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-surface-container px-3 text-primary hover:bg-surface-container-high transition-colors"
              >
                <span className="font-label-sm text-label-sm">Ver mapa</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-space-md py-space-md">
              {children}
            </div>

            <footer className="shrink-0 border-t border-outline-variant/30 bg-surface-container-low px-space-md py-space-sm">
              {!podeAvancar && (
                <p className="mb-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  Falta preencher: {faltando.join(", ")}.
                </p>
              )}
              <div className="flex items-center justify-between gap-space-sm">
                <span className="min-w-0 font-body-sm text-body-sm text-on-surface-variant truncate">
                  {orcamentoPronto
                    ? formatBRL(grandTotal) + " · sinal " + formatBRL(depositVal)
                    : "Orçamento calculado após local e data"}
                </span>
                <div className="flex shrink-0 items-center gap-space-xs">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={voltar}
                      className="flex h-10 items-center gap-1 rounded-lg bg-surface-container px-3 font-label-md text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Voltar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!podeAvancar}
                    onClick={ultimo ? aoConfirmar : avancar}
                    className={cn(
                      "flex h-10 items-center gap-1 rounded-lg px-4 font-label-md text-label-md transition-all",
                      podeAvancar
                        ? "bg-primary text-on-primary hover:opacity-90 active:scale-95"
                        : "cursor-not-allowed bg-surface-container text-on-surface-variant",
                    )}
                  >
                    {ultimo ? <BadgeCheck className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    <span>{ultimo ? "Pagar sinal" : "Avançar"}</span>
                  </button>
                </div>
              </div>
            </footer>
          </section>
        </div>
      )}

      <nav
        aria-label="Etapas da reserva"
        className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 pointer-events-none"
      >
        <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-1 rounded-2xl bg-surface-container-lowest/95 p-1.5 shadow-xl ring-1 ring-on-surface/10 backdrop-blur-md">
          {PASSOS.map((passo) => {
            const ativo = currentStep === passo.num;
            const concluido = passo.num < passoLiberado;
            const bloqueado = passo.num > passoLiberado;
            return (
              <button
                key={passo.num}
                type="button"
                disabled={bloqueado}
                onClick={() => abrirPasso(passo.num)}
                title={bloqueado ? "Complete a etapa anterior para liberar" : passo.titulo}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors sm:px-3",
                  ativo ? "bg-surface-container-highest" : "hover:bg-surface-container",
                  bloqueado && "cursor-not-allowed opacity-45 hover:bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-label-md text-label-md",
                    ativo
                      ? "bg-primary text-on-primary"
                      : concluido
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-container-highest text-on-surface-variant",
                  )}
                >
                  {bloqueado ? <Lock className="h-3.5 w-3.5" /> : concluido && !ativo ? <Check className="h-4 w-4" /> : passo.num}
                </span>
                <span className="hidden min-w-0 flex-col sm:flex">
                  <span className="font-label-sm text-label-sm text-on-surface truncate">{passo.titulo}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{passo.desc}</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => aoAbrir(!aberto)}
            aria-label={aberto ? "Fechar etapa" : "Retomar reserva"}
            className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-primary hover:bg-primary/10 transition-colors"
          >
            <span className="hidden font-label-md text-label-md sm:inline">{aberto ? "Mapa" : "Retomar"}</span>
            {aberto ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </nav>
    </>
  );
}
