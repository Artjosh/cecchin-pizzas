"use client";

import { useState } from "react";
import { BadgeCheck, MapPin } from "lucide-react";
import { LocationPickerMap } from "../components/maps/LocationPickerMap";
import { PainelPassos } from "../components/booking/PainelPassos";
import { ProvedorReserva, useReserva } from "./booking/contexto";
import { Passo1Local } from "./booking/Passo1Local";
import { Passo2Convidados } from "./booking/Passo2Convidados";
import { Passo3Forno } from "./booking/Passo3Forno";
import { Passo4Resumo } from "./booking/Passo4Resumo";

/**
 * A tela de contratação é o mapa. Todo o resto — cabeçalho, trilha de passos,
 * formulário e orçamento — vive num painel sobre ele, que o cliente recolhe
 * quando quer marcar o ponto exato do evento.
 */
export function BookingView() {
  return (
    <ProvedorReserva>
      <Assistente />
    </ProvedorReserva>
  );
}

function Assistente() {
  const [recolhido, setRecolhido] = useState(false);
  const {
    currentStep,
    address,
    distanceKm,
    logisticsFee,
    escolherLocal,
    formatBRL,
  } = useReserva();

  return (
    <div className="relative h-full w-full bg-surface-container">
      <LocationPickerMap
        className="absolute inset-0"
        controles={recolhido}
        onLocationSelect={(local) => {
          escolherLocal(local);
          setRecolhido(true);
        }}
      >
        {/* Só aparece com o painel recolhido; senão fica atrás dele. */}
        {recolhido && distanceKm > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[min(92%,34rem)] bg-surface/95 backdrop-blur-md px-space-md py-space-sm rounded-xl shadow-lg flex items-center gap-space-sm">
            <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="w-[18px] h-[18px]" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface truncate">
                {distanceKm} km da Base Operacional · {formatBRL(logisticsFee)}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {address}
              </span>
            </span>
          </div>
        )}
      </LocationPickerMap>

      {/* Selo de confiança: sai do caminho quando o painel está aberto. */}
      {recolhido && (
        <div className="hidden sm:flex absolute top-3 right-3 items-center gap-space-sm bg-surface/95 backdrop-blur-md px-space-md py-space-sm rounded-xl shadow-lg">
          <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <BadgeCheck className="w-5 h-5" />
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
        recolhido={recolhido}
        aoRecolher={setRecolhido}
        aoConfirmar={() =>
          alert(
            "Reserva #CP-2025-0842 gerada com sucesso! Assim que o sinal de 40% for validado, nossa central de operações entrará em contato via WhatsApp para confirmar detalhes de acesso.",
          )
        }
      >
        {currentStep === 1 && (
          <Passo1Local aoAbrirMapa={() => setRecolhido(true)} />
        )}
        {currentStep === 2 && <Passo2Convidados />}
        {currentStep === 3 && <Passo3Forno />}
        {currentStep === 4 && <Passo4Resumo />}
      </PainelPassos>
    </div>
  );
}
