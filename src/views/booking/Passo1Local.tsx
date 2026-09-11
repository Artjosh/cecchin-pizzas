"use client";

import {
  Building2,
  Calendar,
  Clock,
  Home,
  LayoutTemplate,
  MapPin,
  Search,
  Timer,
  TreePine,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useReserva, type TipoLocal } from "./contexto";

const SUGESTOES = [
  {
    name: "Moinhos de Vento, POA",
    addr: "Rua Padre Chagas, Moinhos de Vento - Porto Alegre",
    km: 14,
    fee: 65,
  },
  {
    name: "Bela Vista, POA",
    addr: "Av. Carlos Gomes, Bela Vista - Porto Alegre",
    km: 11,
    fee: 55,
  },
  {
    name: "Canoas",
    addr: "Rua Mathias Velho, Centro - Canoas",
    km: 22,
    fee: 85,
  },
  {
    name: "Nova Petrópolis",
    addr: "Av. 15 de Novembro, Nova Petrópolis - Serra Gaúcha",
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

/** A equipe chega 90 minutos antes do início do serviço. */
const ANTECEDENCIA_MIN = 90;

function horaDeChegada(inicio: string): string | null {
  const [h, m] = inicio.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const minutos = (h * 60 + m - ANTECEDENCIA_MIN + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(minutos / 60)).padStart(2, "0");
  const mm = String(minutos % 60).padStart(2, "0");
  return hh + ":" + mm;
}

export function Passo1Local({ aoAbrirMapa }: { aoAbrirMapa: () => void }) {
  const {
    address,
    setAddress,
    distanceKm,
    logisticsFee,
    escolherSugestao,
    tipoLocal,
    setTipoLocal,
    data,
    setData,
    hora,
    setHora,
    minimoData,
    occasion,
    setOccasion,
    formatBRL,
  } = useReserva();

  const chegada = hora ? horaDeChegada(hora) : null;

  return (
    <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Endereço */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <MapPin className="text-primary w-5 h-5 shrink-0" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Endereço &amp; Logística
          </h2>
        </div>

        <label
          htmlFor="endereco-evento"
          className="font-label-md text-label-md text-on-surface-variant"
        >
          Endereço do local do evento:
        </label>
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5" />
          <input
            id="endereco-evento"
            className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-all"
            placeholder="Rua, número, bairro e cidade"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={aoAbrirMapa}
          className="flex items-center justify-between gap-space-sm w-full p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-left"
        >
          <span className="flex items-center gap-space-sm min-w-0">
            <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="w-[18px] h-[18px]" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface">
                {distanceKm > 0
                  ? distanceKm + " km da Base Operacional"
                  : "Marcar o ponto exato no mapa"}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {distanceKm > 0
                  ? "Taxa logística calculada: " + formatBRL(logisticsFee)
                  : "Arraste o pino para ajustar acesso e taxa"}
              </span>
            </span>
          </span>
          <span className="font-label-md text-label-md text-primary shrink-0">
            Abrir mapa
          </span>
        </button>

        <div className="flex items-center gap-space-xs flex-wrap pt-space-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Sugestões rápidas:
          </span>
          {SUGESTOES.map((sug) => (
            <button
              type="button"
              key={sug.name}
              onClick={() => escolherSugestao(sug)}
              className={cn(
                "px-2.5 py-1 rounded font-label-sm text-label-sm transition-colors",
                address === sug.addr
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-high",
              )}
            >
              {sug.name}
            </button>
          ))}
        </div>
      </section>

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

        <div className="bg-surface-container-low p-space-md rounded-xl flex items-start gap-space-sm">
          <Timer className="text-tertiary w-5 h-5 mt-0.5 shrink-0" />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface font-semibold">
              {chegada
                ? "Equipe chega às " + chegada + " no local"
                : "Equipe chega 1h30 antes do início"}
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Chegamos pontualmente com 1 hora e 30 minutos de antecedência para
              montagem do forno, aquecimento térmico da pedra refratária e
              organização do mise en place das pizzas.
            </p>
          </div>
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
