"use client";

import { useState } from "react";
import { BadgeCheck, Crosshair, LocateFixed } from "lucide-react";
import { PainelPassos } from "../components/booking/PainelPassos";
import { LocationPickerMap } from "../components/maps/LocationPickerMap";
import { Passo1Local, SUGESTOES } from "./booking/Passo1Local";
import { Passo2Convidados } from "./booking/Passo2Convidados";
import { Passo3Forno } from "./booking/Passo3Forno";
import { Passo4Resumo } from "./booking/Passo4Resumo";
import { ProvedorReserva, useReserva } from "./booking/contexto";

/** A contratação acompanha o mapa; o cartão aberto pode ser recolhido. */
export function BookingView() {
  return (
    <ProvedorReserva>
      <Assistente />
    </ProvedorReserva>
  );
}

function Assistente() {
  const [painelAberto, setPainelAberto] = useState(true);
  const [modoMarcacao, setModoMarcacao] = useState(false);
  const {
    currentStep,
    address,
    coordenada,
    escolherLocal,
    escolherSugestao,
  } = useReserva();

  return (
    <div className="relative h-full w-full bg-surface-container">
      <LocationPickerMap
        className="absolute inset-0"
        controles
        address={address}
        selectedLocation={coordenada}
        markingMode={modoMarcacao}
        onMarkingModeChange={setModoMarcacao}
        addressAction={
          <button
            type="button"
            aria-pressed={modoMarcacao}
            aria-label={modoMarcacao ? "Cancelar marcação no mapa" : "Marcar ponto no mapa"}
            aria-describedby="dica-marcar-ponto"
            onClick={() => {
              setModoMarcacao((ativo) => !ativo);
              setPainelAberto(false);
            }}
            className={`group relative flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-3 font-label-md text-label-md shadow-md transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer ${
              modoMarcacao
                ? "bg-tertiary text-on-tertiary ring-2 ring-on-surface/20"
                : "bg-primary text-on-primary"
            }`}
          >
            {modoMarcacao ? (
              <Crosshair className="h-4 w-4" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {modoMarcacao ? "Clique no mapa" : "Marcar ponto"}
            </span>
            <span
              id="dica-marcar-ponto"
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-56 rounded-lg bg-on-surface px-3 py-2 text-left font-body-sm text-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {modoMarcacao
                ? "Marcação ativa: clique com o botão esquerdo no mapa para posicionar o pino."
                : "Ative para marcar o ponto exato com um clique no mapa."}
            </span>
          </button>
        }
        addressBelow={
          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg bg-surface/95 px-2 py-1.5 shadow-sm backdrop-blur-md">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Sugestões:
            </span>
            {SUGESTOES.map((sugestao) => (
              <button
                key={sugestao.name}
                type="button"
                onClick={() => escolherSugestao(sugestao)}
                className="basis-20 flex-1 whitespace-nowrap rounded-md bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
              >
                {sugestao.name}
              </button>
            ))}
          </div>
        }
        onLocationSelect={(local) => {
          escolherLocal(local);
          setModoMarcacao(false);
          setPainelAberto(false);
        }}
      />

      {!painelAberto && (
        <div className="absolute right-3 top-32 hidden items-center gap-space-sm rounded-xl bg-surface/95 px-space-md py-space-sm shadow-lg backdrop-blur-md sm:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface">
              Data Protegida
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Trave a agenda com sinal de 40%
            </span>
          </span>
        </div>
      )}

      <PainelPassos
        aberto={painelAberto}
        aoAbrir={setPainelAberto}
        aoConfirmar={() =>
          alert(
            "Reserva #CP-2025-0842 gerada com sucesso! Assim que o sinal de 40% for validado, nossa central de operações entrará em contato via WhatsApp para confirmar detalhes de acesso.",
          )
        }
      >
        {currentStep === 1 && <Passo1Local />}
        {currentStep === 2 && <Passo2Convidados />}
        {currentStep === 3 && <Passo3Forno />}
        {currentStep === 4 && <Passo4Resumo />}
      </PainelPassos>
    </div>
  );
}
