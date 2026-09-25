"use client";

import { AlertTriangle, ChefHat, Flame, Utensils, Zap } from "lucide-react";
import { useReserva } from "./contexto";

export function Passo3Forno() {
  const { ovenType, setOvenType } = useReserva();

  return (
    <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-space-sm mb-space-md">
        <ChefHat className="text-primary w-6 h-6" />
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Tipo de Forno & Cardápio
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mb-space-lg">
        <label className="relative flex flex-col p-space-md rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all">
          <input
            type="radio"
            name="oven_choice"
            value="gas"
            checked={ovenType === "gas"}
            onChange={() => setOvenType("gas")}
            className="peer sr-only"
          />
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center peer-checked:bg-primary">
            {ovenType === "gas" && (
              <span className="w-2 h-2 rounded-full bg-surface-container-lowest"></span>
            )}
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-space-sm">
            <Flame className="w-6 h-6" />
          </div>
          <span className="font-headline-sm text-headline-sm text-on-surface mb-1">
            Forno a Gás Profissional
          </span>
          <span className="font-label-sm text-label-sm text-primary uppercase font-bold mb-2">
            Recomendado para Áreas Abertas
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Totalmente autônomo, não consome energia da residência. Alta
            temperatura constante com pedras vulcânicas refratárias.
          </p>
        </label>

        <label className="relative flex flex-col p-space-md rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all">
          <input
            type="radio"
            name="oven_choice"
            value="electric"
            checked={ovenType === "electric"}
            onChange={() => setOvenType("electric")}
            className="peer sr-only"
          />
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center peer-checked:bg-primary">
            {ovenType === "electric" && (
              <span className="w-2 h-2 rounded-full bg-surface-container-lowest"></span>
            )}
          </div>
          <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center mb-space-sm">
            <Zap className="w-6 h-6" />
          </div>
          <span className="font-headline-sm text-headline-sm text-on-surface mb-1">
            Forno Elétrico Duplo Cecchin
          </span>
          <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold mb-2">
            Ideal p/ Apartamentos Fechados
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Total ausência de fumaça e cheiro. Exige obrigatoriamente ponto
            elétrico dedicado de 220V no local.
          </p>
        </label>
      </div>

      {ovenType === "electric" && (
        <div className="mb-space-md p-space-md rounded-xl bg-error-container text-on-error-container flex items-start gap-space-sm animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-[22px] h-[22px] mt-0.5 shrink-0" />
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-bold">
              Atenção Técnica: Tensão 220V Mandatória
            </span>
            <p className="font-body-sm text-body-sm">
              O forno duplo elétrico tem potência de 4.800W. Caso sua rede do
              salão seja 110V convencional, selecione a opção de Forno a Gás
              para evitar desarme de disjuntores durante a festa.
            </p>
          </div>
        </div>
      )}

      <div className="p-space-md rounded-xl bg-surface-container-low mb-space-md">
        <div className="flex items-center justify-between mb-space-sm">
          <div className="flex items-center gap-space-xs">
            <Utensils className="text-primary w-5 h-5" />
            <span className="font-label-lg text-label-lg text-on-surface font-bold">
              Cardápio Selecionado: Tradicional & Nobres
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-primary font-semibold">
            35 Sabores Inclusos
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-body-sm text-on-surface-variant">
          {[
            "Costela Desfiada c/ Barbecue",
            "Parma com Rúcula & Brie",
            "Camarão com Catupiry Real",
            "Quatro Queijos Artesanal",
            "Filé Mignon ao Gorgonzola",
            "Nutella com Morangos Frescos",
          ].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-space-md pt-space-xs flex items-center gap-space-xs flex-wrap">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Opções Especiais Disponíveis:
          </span>
          <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface">
            Massa sem Glúten (+ R$ 18 un)
          </span>
          <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface">
            Queijo Vegano Zero Lactose
          </span>
        </div>
      </div>

      <div className="bg-surface-container-low p-space-md rounded-xl flex items-center gap-space-md">
        <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden shrink-0">
          <img
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhkEh88iRzhB-OhAQPzY2EUBpO0eso547QmyaFRO-6mfd90QdqYEhB80PTSrj1WZhUVTg1iThNxmIgUCxF5ZeEkq6BxGCacNH8OJf3o0eC_9dY0VyC2-Tx6zwnIKX9DJwGEc5UvxUnLibwOpgPpIWfUQsA5kjEt11Dtan63eA5mU-xvDwB6o6r8wcS3TW7Hq6T0Xl1qkKn75AWlyvn98JVl01FEoZU2zkhOVxis5AVeCIzgzQjpU5EOw"
            alt="Pizza"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-on-surface font-bold">
            Pizzas Ilhas Gourmets
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Massas maturadas por 48 horas para leveza digestiva incomparável.
          </span>
        </div>
      </div>
    </div>
  );
}
