"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Map as MapIcon,
  Pizza,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { PASSOS, useReserva } from "../../views/booking/contexto";

interface PainelPassosProps {
  recolhido: boolean;
  aoRecolher: (v: boolean) => void;
  /** Ação final do último passo. */
  aoConfirmar: () => void;
  children: ReactNode;
}

/**
 * O assistente de reserva inteiro — cabeçalho, trilha de passos, formulário e
 * rodapé de orçamento — dentro de um painel sobre o mapa.
 *
 * Duas decisões de layout que valem registro:
 *
 * 1. **Não existe scrim.** O mapa é o fundo vivo da tela e precisa continuar
 *    legível. O painel flutua com sombra; a moldura ao redor dele segue
 *    recebendo arraste e zoom porque o contêiner é `pointer-events-none`.
 *
 * 2. **No celular o painel é bottom sheet de largura cheia**, não um cartão
 *    com 15% de margem lateral. Numa tela de 360px, 15% de margem custa 54px
 *    de formulário e não devolve mapa útil. A partir de `sm` ele vira o
 *    cartão de 85% pedido no desenho.
 */
export function PainelPassos({
  recolhido,
  aoRecolher,
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
    totalGuests,
  } = useReserva();

  const passoAtual = PASSOS[currentStep - 1];
  const faltando = pendencias(currentStep);
  const podeAvancar = faltando.length === 0;
  const ultimo = currentStep === PASSOS.length;
  /* Sem local e data não há deslocamento, e sem deslocamento não há total. */
  const orcamentoPronto = passoLiberado >= 2;

  /*
   * Trocar de passo mantinha a rolagem onde estava: o passo novo abria no
   * meio, com o titulo cortado acima da area visivel.
   */
  const corpo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    corpo.current?.scrollTo({ top: 0 });
  }, [currentStep]);

  useEffect(() => {
    if (recolhido) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoRecolher(true);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [recolhido, aoRecolher]);

  if (recolhido) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-space-sm pointer-events-none">
        <button
          type="button"
          onClick={() => aoRecolher(false)}
          aria-label="Retomar reserva"
          className="pointer-events-auto w-full sm:w-[85vw] max-w-2xl flex items-center gap-space-md bg-surface-container-lowest rounded-2xl shadow-2xl ring-1 ring-on-surface/10 px-space-md py-space-sm text-left hover:bg-surface-container-low transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md shrink-0">
            {currentStep}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-label-md text-label-md text-on-surface truncate">
              {passoAtual.titulo}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {orcamentoPronto
                ? formatBRL(grandTotal) + " · " + totalGuests + " convidados"
                : passoAtual.desc}
            </span>
          </div>
          <span className="flex items-center gap-1 text-primary font-label-md text-label-md shrink-0">
            <span className="hidden sm:inline">Retomar</span>
            <ChevronUp className="w-5 h-5" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-20 z-30 flex items-end sm:items-center justify-center pointer-events-none">
      <section
        role="dialog"
        aria-label="Reserva do rodízio artesanal"
        className="pointer-events-auto flex flex-col w-full h-full rounded-t-3xl sm:w-[85vw] sm:h-[85%] sm:max-w-5xl sm:rounded-3xl bg-surface-container-lowest shadow-2xl ring-1 ring-on-surface/10 overflow-hidden"
      >
        {/* Cabeçalho */}
        <header className="shrink-0 px-space-md sm:px-space-lg pt-space-md pb-space-sm border-b border-outline-variant/30">
          <div className="flex items-start justify-between gap-space-md">
            <div className="flex flex-col min-w-0">
              <span className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm uppercase tracking-wider">
                <Pizza className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Cecchin Pizzas</span>
              </span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight truncate">
                Reserve o Rodízio Artesanal
              </h1>
            </div>
            <button
              type="button"
              onClick={() => aoRecolher(true)}
              aria-label="Ver mapa"
              className="shrink-0 flex items-center gap-1 h-9 px-3 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <MapIcon className="w-4 h-4 text-tertiary" />
              <span className="hidden sm:inline font-label-md text-label-md">
                Ver mapa
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Trilha de passos */}
          <nav
            aria-label="Progresso da reserva"
            className="mt-space-sm -mx-space-md sm:mx-0 px-space-md sm:px-0 overflow-x-auto"
          >
            <ol className="flex sm:grid sm:grid-cols-4 gap-space-xs min-w-max sm:min-w-0">
              {PASSOS.map((passo) => {
                const ativo = currentStep === passo.num;
                const concluido = passo.num < passoLiberado;
                const bloqueado = passo.num > passoLiberado;

                return (
                  <li key={passo.num} className="shrink-0 sm:shrink">
                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() => irPara(passo.num)}
                      title={
                        bloqueado
                          ? "Complete o passo anterior para liberar"
                          : undefined
                      }
                      className={cn(
                        "w-full flex items-center gap-space-sm p-space-sm rounded-lg text-left transition-colors",
                        ativo
                          ? "bg-surface-container-highest"
                          : bloqueado
                            ? "opacity-45 cursor-not-allowed"
                            : "hover:bg-surface-container",
                      )}
                    >
                      <span
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center font-label-md text-label-md shrink-0",
                          ativo
                            ? "bg-primary text-on-primary"
                            : concluido
                              ? "bg-primary/20 text-primary"
                              : "bg-surface-container-highest text-on-surface-variant",
                        )}
                      >
                        {bloqueado ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : concluido && !ativo ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          passo.num
                        )}
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface truncate">
                          {passo.num}. {passo.titulo}
                        </span>
                        <span className="hidden md:block font-label-sm text-label-sm text-on-surface-variant truncate font-normal">
                          {passo.desc}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </header>

        {/* Corpo do passo */}
        <div
          ref={corpo}
          className="flex-1 overflow-y-auto overscroll-contain px-space-md sm:px-space-lg py-space-md"
        >
          {children}
        </div>

        {/* Rodapé: orçamento corrente + navegação */}
        <footer className="shrink-0 border-t border-outline-variant/30 bg-surface-container-low px-space-md sm:px-space-lg py-space-sm">
          {!podeAvancar && (
            <p className="mb-space-xs font-body-sm text-body-sm text-on-surface-variant">
              Falta preencher: {faltando.join(", ")}.
            </p>
          )}
          <div className="flex items-center justify-between gap-space-md">
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Total do evento
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                {orcamentoPronto ? formatBRL(grandTotal) : "—"}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {orcamentoPronto
                  ? "Sinal de 40%: " + formatBRL(depositVal)
                  : "Escolha local e data para calcular"}
              </span>
            </div>

            <div className="flex items-center gap-space-xs shrink-0">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={voltar}
                  className="h-12 px-4 sm:px-5 bg-surface-container text-on-surface rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-high transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </button>
              )}
              <button
                type="button"
                disabled={!podeAvancar}
                onClick={ultimo ? aoConfirmar : avancar}
                className={cn(
                  "h-12 px-5 sm:px-6 rounded-lg font-label-lg text-label-lg flex items-center gap-2 transition-all",
                  podeAvancar
                    ? "bg-primary text-on-primary hover:opacity-90 active:scale-95"
                    : "bg-surface-container text-on-surface-variant cursor-not-allowed",
                )}
              >
                {ultimo ? (
                  <>
                    <BadgeCheck className="w-5 h-5" />
                    <span>Pagar sinal</span>
                  </>
                ) : (
                  <>
                    <span>
                      Avançar
                      <span className="hidden sm:inline">
                        {" para " + PASSOS[currentStep].titulo}
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
