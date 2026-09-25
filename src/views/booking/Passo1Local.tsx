"use client";

import {
  Building2,
  Calendar,
  Clock,
  Home,
  LayoutTemplate,
  Timer,
  TreePine,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useReserva, type TipoLocal } from "./contexto";

/** A mesma faixa aceita sugestões iniciais e locais recentes quando houver API. */
export interface SugestaoLocal {
  name: string;
  addr: string;
  lat: number;
  lng: number;
  km: number;
  fee: number;
}

export const SUGESTOES: ReadonlyArray<SugestaoLocal> = [
  {
    name: "Moinhos de Vento, POA",
    addr: "Rua Padre Chagas, Moinhos de Vento - Porto Alegre",
    lat: -30.0277,
    lng: -51.2017,
    km: 14,
    fee: 65,
  },
  {
    name: "Bela Vista, POA",
    addr: "Av. Carlos Gomes, Bela Vista - Porto Alegre",
    lat: -30.0335,
    lng: -51.1814,
    km: 11,
    fee: 55,
  },
  {
    name: "Canoas",
    addr: "Rua Mathias Velho, Centro - Canoas",
    lat: -29.9187,
    lng: -51.1836,
    km: 22,
    fee: 85,
  },
  {
    name: "Nova Petrópolis",
    addr: "Av. 15 de Novembro, Nova Petrópolis - Serra Gaúcha",
    lat: -29.3764,
    lng: -51.1141,
    km: 78,
    fee: 220,
  },
];

const TIPOS_LOCAL: ReadonlyArray<{
  label: string;
  icon: typeof Home;
  value: TipoLocal;
}> = [
  { label: "Casa Térrea", icon: Home, value: "casa" },
  { label: "Salão de Festas", icon: Building2, value: "salao" },
  { label: "Cobertura", icon: LayoutTemplate, value: "cobertura" },
  { label: "Sítio / Chácara", icon: TreePine, value: "chacara" },
];

const OCASIOES = [
  "Aniversário",
  "Casamento / Noivado",
  "Formatura",
  "Confraternização Empresa",
  "Encontro de Amigos",
];

/** A equipe chega 15 minutos antes do início do serviço. */
const ANTECEDENCIA_MIN = 15;

function horaDeChegada(inicio: string): string | null {
  const [h, m] = inicio.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const minutos = (h * 60 + m - ANTECEDENCIA_MIN + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(minutos / 60)).padStart(2, "0");
  const mm = String(minutos % 60).padStart(2, "0");
  return hh + ":" + mm;
}

export function Passo1Local() {
  const {
    tipoLocal,
    setTipoLocal,
    data,
    setData,
    hora,
    setHora,
    minimoData,
    occasion,
    setOccasion,
  } = useReserva();

  const chegada = hora ? horaDeChegada(hora) : null;

  return (
    <div className="flex flex-col gap-space-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Tipo de local */}
      <section className="flex flex-col gap-space-sm">
        <span className="font-label-md text-label-md text-on-surface">
          Tipo de Local e Características de Acesso
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
          {TIPOS_LOCAL.map((local) => {
            const Icone = local.icon;
            const marcado = tipoLocal === local.value;
            return (
              <button
                type="button"
                key={local.value}
                aria-pressed={marcado}
                onClick={() => setTipoLocal(local.value)}
                className={cn(
                  "p-space-sm rounded-lg flex flex-col items-center justify-center text-center transition-colors",
                  marcado
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container",
                )}
              >
                <Icone className="w-5 h-5 mb-1" />
                <span className="font-label-sm text-label-sm">
                  {local.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-space-xs">
          <label className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary rounded"
              defaultChecked
            />
            <span className="font-body-sm text-body-sm text-on-surface">
              Possui elevador de serviço ou rampa
            </span>
          </label>
          <label className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary rounded" />
            <span className="font-body-sm text-body-sm text-on-surface">
              Distância da tomada maior que 15m
            </span>
          </label>
        </div>
      </section>

      {/* Data, horário e ocasião */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm">
          <Calendar className="text-primary w-5 h-5 shrink-0" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Data, Horário &amp; Ocasião
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor="data-evento"
              className="font-label-md text-label-md text-on-surface-variant"
            >
              Data do Evento:
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5 pointer-events-none" />
              <input
                id="data-evento"
                type="date"
                min={minimoData}
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-all"
              />
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <label
              htmlFor="hora-evento"
              className="font-label-md text-label-md text-on-surface-variant"
            >
              Início do Serviço de Pizza:
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5 pointer-events-none" />
              <input
                id="hora-evento"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-all"
              />
            </div>
          </div>
        </div>

        <div
          className="group relative flex h-10 items-center gap-space-sm rounded-lg bg-surface-container-low px-space-sm"
          aria-describedby="dica-chegada-equipe"
        >
          <Timer className="text-tertiary h-5 w-5 shrink-0" />
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            {chegada
              ? "Equipe chega às " + chegada + " no local"
              : "Equipe chega 15 minutos antes do início"}
          </span>
          <span
            id="dica-chegada-equipe"
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 rounded-lg bg-on-surface px-3 py-2 font-body-sm text-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
          >
            Chegamos com antecedência para montar o forno, aquecer a pedra refratária e organizar o mise en place das pizzas.
          </span>
        </div>

        <div className="flex flex-col gap-space-xs">
          <span className="font-label-md text-label-md text-on-surface-variant">
            Ocasião do Evento:
          </span>
          <div className="flex items-center gap-space-xs flex-wrap">
            {OCASIOES.map((occ) => (
              <button
                type="button"
                key={occ}
                aria-pressed={occasion === occ}
                onClick={() => setOccasion(occ)}
                className={cn(
                  "px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-colors",
                  occasion === occ
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-high",
                )}
              >
                {occ}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
