"use client";

import {
  BadgeCheck,
  Clock,
  MessageCircle,
  Timer,
  Users,
  Utensils,
} from "lucide-react";
import { useReserva } from "./contexto";

export function ResumoOrcamento() {
  const {
    sinalPercentual,
    adults,
    children,
    toddlers,
    totalGuests,
    adultPrice,
    childPrice,
    adultsTotal,
    childrenTotal,
    distanceKm,
    logisticsFee,
    grandTotal,
    depositVal,
    balanceVal,
    formatBRL,
  } = useReserva();

  return (
    <div className="bg-surface-container-low p-space-md sm:p-space-lg rounded-2xl flex flex-col gap-space-md">
      <div className="flex items-center justify-between pb-space-sm">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
            Orçamento estimado
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Resumo da Contratação
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-mono">
          Pré-agendamento
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-body-sm text-on-surface-variant bg-surface-container-low p-space-sm rounded-xl">
        <div className="flex items-center gap-1">
          <Clock className="text-primary w-4 h-4" />
          <span>4 Horas de Rodízio Livre</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Users className="text-primary w-4 h-4" />
          <span>{totalGuests} convidados</span>
        </div>
      </div>
      <div className="flex flex-col gap-space-sm text-body-md text-on-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-on-surface">{adults} Adultos (Inteiras)</span>
            <span className="text-body-sm text-on-surface-variant">
              (x {formatBRL(adultPrice)})
            </span>
          </div>
          <span className="font-semibold text-on-surface">
            {formatBRL(adultsTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-on-surface">{children} Crianças (Meias)</span>
            <span className="text-body-sm text-on-surface-variant">
              (x {formatBRL(childPrice)})
            </span>
          </div>
          <span className="font-semibold text-on-surface">
            {formatBRL(childrenTotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span>{toddlers} Crianças (Até 5 anos)</span>
          </div>
          <span className="font-semibold text-tertiary uppercase text-label-sm">
            Cortesia
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Deslocamento Operacional</span>
            <span className="text-body-sm text-on-surface-variant">
              ({distanceKm} km POA)
            </span>
          </div>
          <span className="font-semibold text-on-surface">
            {formatBRL(logisticsFee)}
          </span>
        </div>
        <div className="flex items-center justify-between text-on-surface-variant">
          <span>Infraestrutura de Forno Profissional</span>
          <span className="font-semibold text-on-surface">Incluso</span>
        </div>
      </div>
      <div className="pt-space-md flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded-xl">
        <div className="flex items-center justify-between">
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Total do Evento:
          </span>
          <span className="font-headline-md text-headline-md text-on-surface font-extrabold">
            {formatBRL(grandTotal)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-space-xs pt-space-xs">
          <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-lowest">
            <div className="flex items-center gap-1 text-primary">
              <Timer className="w-4 h-4" />
              <span className="font-label-sm text-label-sm font-bold uppercase">
                Sinal ({sinalPercentual}%)
              </span>
            </div>
            <span className="font-headline-sm text-headline-sm text-primary font-bold mt-0.5">
              {formatBRL(depositVal)}
            </span>
            <span className="text-[11px] text-on-surface-variant leading-tight">
              Data sujeita à aprovação
            </span>
          </div>
          <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-lowest">
            <div className="flex items-center gap-1 text-on-surface-variant">
              <BadgeCheck className="w-4 h-4" />
              <span className="font-label-sm text-label-sm font-bold uppercase">
                Saldo ({100 - sinalPercentual}%)
              </span>
            </div>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
              {formatBRL(balanceVal)}
            </span>
            <span className="text-[11px] text-on-surface-variant leading-tight">
              Pago no término do evento
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-space-xs pt-space-xs">
        <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Timer className="w-[18px] h-[18px] text-tertiary" />
          <span>Compromisso de Pontualidade: equipe no local 15 min antes</span>
        </div>
        <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Utensils className="w-[18px] h-[18px] text-tertiary" />
          <span>
            Levamos louças, pratos descartáveis biodegradáveis e guardanapos
          </span>
        </div>
        <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <MessageCircle className="w-[18px] h-[18px] text-tertiary" />
          <span>Coordenador de eventos dedicado no WhatsApp pós-reserva</span>
        </div>
      </div>
      <a
        href="/api/operacao/whatsapp?contato=1"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 transition-all"
      >
        <MessageCircle className="w-[18px] h-[18px] text-tertiary" />
        <span>Dúvida sobre o local? Fale com nosso Gerente</span>
      </a>
    </div>
  );
}
