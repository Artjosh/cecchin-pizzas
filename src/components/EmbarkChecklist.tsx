"use client";

import { useState } from "react";
import { Check, ClipboardList } from "lucide-react";
import { cn } from "../lib/utils";

type Item = { id: number; label: string; done: boolean };

const INICIAL: Item[] = [
  { id: 1, label: "Forno a Gás Pro #03 e Pedras", done: true },
  { id: 2, label: "Botijão de Gás Cheio", done: true },
  { id: 3, label: "45 Massas Fermentação 48h (Caixa 2)", done: true },
  { id: 4, label: "Insumos e Queijos Lacrados (Caixa 5)", done: true },
  { id: 5, label: "Louças, Talheres e Pás", done: false },
  { id: 6, label: "Maquininha de Cartão", done: false },
];

export function EmbarkChecklist() {
  const [itens, setItens] = useState<Item[]>(INICIAL);

  const alternar = (id: number) =>
    setItens((atual) =>
      atual.map((i) => (i.id === id ? { ...i, done: !i.done } : i))
    );

  const prontos = itens.filter((i) => i.done).length;
  const completo = prontos === itens.length;

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Checklist de Embarque
          </h2>
        </div>
        <span
          className={cn(
            "font-label-sm text-label-sm px-2.5 py-1 rounded-full font-bold",
            completo
              ? "bg-success-container text-on-success-container"
              : "bg-surface-container-high text-on-surface-variant"
          )}
        >
          {prontos}/{itens.length}
        </span>
      </div>

      <div className="space-y-3">
        {itens.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => alternar(item.id)}
              className="sr-only"
            />
            <div
              aria-hidden="true"
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center shrink-0 border-2 transition-colors",
                item.done
                  ? "bg-primary border-primary text-on-primary"
                  : "border-outline-variant"
              )}
            >
              {item.done && <Check className="w-4 h-4" />}
            </div>
            <span
              className={cn(
                "font-body-md text-body-md",
                item.done
                  ? "text-on-surface-variant line-through"
                  : "text-on-surface"
              )}
            >
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
