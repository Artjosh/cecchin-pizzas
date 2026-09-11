"use client";

import { Badge, Users } from "lucide-react";
import { useReserva } from "./contexto";

export function Passo2Convidados() {
  const { adults, children, toddlers, totalGuests, adjustGuests } =
    useReserva();

  return (
    <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-space-sm mb-space-md">
        <Users className="text-primary w-6 h-6" />
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Número de Convidados
        </h2>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
        O rodízio inclui serviço à vontade durante 4 horas ininterruptas com
        pizzas salgadas clássicas, especiais e doces com insumos nobres.
      </p>

      <div className="flex flex-col gap-space-md">
        {[
          {
            title: "Adultos & Jovens",
            desc: "A partir de 12 anos • R$ 74,00 por pessoa",
            count: adults,
            type: "adults" as const,
          },
          {
            title: "Crianças (6 a 11 anos)",
            desc: "50% do valor integral • R$ 37,00 por criança",
            count: children,
            type: "children" as const,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low"
          >
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                {item.title}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {item.desc}
              </span>
            </div>
            <div className="flex items-center gap-space-sm bg-surface-container-lowest px-2 py-1.5 rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => adjustGuests(item.type, -1)}
                className="w-9 h-9 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-on-surface transition-all active:scale-90"
              >
                −
              </button>
              <span className="font-headline-md text-headline-md text-primary w-12 text-center">
                {item.count}
              </span>
              <button
                type="button"
                onClick={() => adjustGuests(item.type, 1)}
                className="w-9 h-9 rounded-md bg-primary text-on-primary hover:opacity-90 flex items-center justify-center font-headline-sm text-headline-sm transition-all active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Crianças até 5 anos
            </span>
            <span className="font-body-sm text-body-sm text-tertiary font-semibold">
              Cortesia especial Cecchin Pizzas
            </span>
          </div>
          <div className="flex items-center gap-space-sm bg-surface-container-lowest px-2 py-1.5 rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => adjustGuests("toddlers", -1)}
              className="w-9 h-9 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-on-surface transition-all active:scale-90"
            >
              −
            </button>
            <span className="font-headline-md text-headline-md text-on-surface-variant w-12 text-center">
              {toddlers}
            </span>
            <button
              type="button"
              onClick={() => adjustGuests("toddlers", 1)}
              className="w-9 h-9 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-on-surface transition-all active:scale-90"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="mt-space-md p-space-md rounded-xl bg-surface-container-low flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <Badge className="text-primary w-[22px] h-[22px]" />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface">
              Equipe Profissional Alocada
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {totalGuests > 50 ? 2 : 1} Pizzaiolo Master +{" "}
              {totalGuests > 90
                ? 4
                : totalGuests > 60
                  ? 3
                  : totalGuests > 30
                    ? 2
                    : 1}{" "}
              Garçons de Salão inclusos
            </span>
          </div>
        </div>
        <span className="font-label-sm text-label-sm px-2.5 py-1 bg-surface-container-highest rounded-full text-on-surface">
          Sem cobrança extra
        </span>
      </div>
    </div>
  );
}
